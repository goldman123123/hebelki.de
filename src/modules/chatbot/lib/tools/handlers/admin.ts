/**
 * Admin Tool Handlers
 *
 * These 15 tools are restricted to staff/owner actors.
 */

import { db } from '@/lib/db'
import { services, staff, staffServices, customers, bookings, businesses, chatbotConversations, chatbotMessages, bookingActions } from '@/lib/db/schema'
import { eq, and, ne, desc, or, ilike, gte, lte, isNull, lt, gt } from 'drizzle-orm'
import { sendEmail, sendCustomEmail } from '@/lib/email'
import { createLogger } from '@/lib/logger'

const log = createLogger('chatbot:tools:handlers:admin')

/**
 * Admin tool handlers
 */
export const adminHandlers = {
  /**
   * Search bookings (ADMIN ONLY)
   */
  async search_bookings(args: {
    businessId: string
    customerName?: string
    customerEmail?: string
    status?: string
    dateFrom?: string
    dateTo?: string
    limit?: number
  }) {
    try {
      const limit = Math.min(args.limit || 10, 50)

      // Build query conditions
      const conditions = [eq(bookings.businessId, args.businessId)]

      if (args.status && args.status !== 'all') {
        conditions.push(eq(bookings.status, args.status))
      }

      if (args.dateFrom) {
        conditions.push(gte(bookings.startsAt, new Date(args.dateFrom)))
      }

      if (args.dateTo) {
        const endDate = new Date(args.dateTo)
        endDate.setHours(23, 59, 59, 999)
        conditions.push(lte(bookings.startsAt, endDate))
      }

      // Add customer name/email filters at SQL level (not in-memory)
      // Uses LEFT JOIN so filters must reference the joined customers table
      if (args.customerName) {
        conditions.push(ilike(customers.name, `%${args.customerName}%`))
      }

      if (args.customerEmail) {
        conditions.push(ilike(customers.email, `%${args.customerEmail}%`))
      }

      // Query bookings with customer data
      const results = await db
        .select({
          id: bookings.id,
          serviceId: bookings.serviceId,
          staffId: bookings.staffId,
          customerId: bookings.customerId,
          startsAt: bookings.startsAt,
          endsAt: bookings.endsAt,
          status: bookings.status,
          notes: bookings.notes,
          customerName: customers.name,
          customerEmail: customers.email,
          customerPhone: customers.phone,
          serviceName: services.name,
          confirmationToken: bookings.confirmationToken,
        })
        .from(bookings)
        .leftJoin(customers, eq(bookings.customerId, customers.id))
        .leftJoin(services, eq(bookings.serviceId, services.id))
        .where(and(...conditions))
        .orderBy(desc(bookings.startsAt))
        .limit(limit)

      return {
        success: true,
        data: {
          count: results.length,
          bookings: results.map(b => ({
            id: b.id,
            customerName: b.customerName,
            customerEmail: b.customerEmail,
            customerPhone: b.customerPhone,
            serviceName: b.serviceName,
            startsAt: b.startsAt?.toISOString(),
            endsAt: b.endsAt?.toISOString(),
            status: b.status,
            notes: b.notes,
            confirmationToken: b.confirmationToken,
          })),
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Suchen von Buchungen' }
    }
  },

  /**
   * Update booking status (ADMIN ONLY)
   */
  async update_booking_status(args: {
    businessId: string
    bookingId: string
    newStatus: string
    reason?: string
  }) {
    try {
      // Verify booking belongs to business
      const booking = await db
        .select()
        .from(bookings)
        .where(and(eq(bookings.id, args.bookingId), eq(bookings.businessId, args.businessId)))
        .limit(1)
        .then(rows => rows[0])

      if (!booking) {
        return { success: false, error: 'Buchung nicht gefunden' }
      }

      // Update booking
      const updateData: {
        status: string
        updatedAt: Date
        cancelledAt?: Date
        cancelledBy?: string
        cancellationReason?: string
        confirmedAt?: Date
      } = {
        status: args.newStatus,
        updatedAt: new Date(),
      }

      if (args.newStatus === 'cancelled') {
        updateData.cancelledAt = new Date()
        updateData.cancelledBy = 'staff'
        if (args.reason) updateData.cancellationReason = args.reason
      } else if (args.newStatus === 'confirmed') {
        updateData.confirmedAt = new Date()
      }

      const [updated] = await db
        .update(bookings)
        .set(updateData)
        .where(eq(bookings.id, args.bookingId))
        .returning()

      // Log action
      const { bookingActions } = await import('@/lib/db/schema')
      await db.insert(bookingActions).values({
        bookingId: args.bookingId,
        action: args.newStatus === 'cancelled' ? 'cancelled' : 'status_changed',
        actorType: 'staff',
        metadata: { newStatus: args.newStatus, reason: args.reason },
      })

      return {
        success: true,
        data: {
          bookingId: updated.id,
          newStatus: updated.status,
          message: `Buchungsstatus geändert auf: ${args.newStatus}`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Aktualisieren des Status' }
    }
  },

  /**
   * Reschedule booking (ADMIN ONLY)
   */
  async reschedule_booking(args: {
    businessId: string
    bookingId: string
    newStartsAt: string
    durationMinutes?: number
    reason?: string
  }) {
    try {
      // Get booking with service info
      const booking = await db
        .select({
          booking: bookings,
          service: services,
        })
        .from(bookings)
        .leftJoin(services, eq(bookings.serviceId, services.id))
        .where(and(eq(bookings.id, args.bookingId), eq(bookings.businessId, args.businessId)))
        .limit(1)
        .then(rows => rows[0])

      if (!booking) {
        return { success: false, error: 'Buchung nicht gefunden' }
      }

      // Calculate new end time (args.durationMinutes overrides service default)
      const newStartsAt = new Date(args.newStartsAt)
      const durationMinutes = args.durationMinutes || booking.service?.durationMinutes || 60
      const newEndsAt = new Date(newStartsAt.getTime() + durationMinutes * 60000)

      // Update booking
      const [updated] = await db
        .update(bookings)
        .set({
          startsAt: newStartsAt,
          endsAt: newEndsAt,
          updatedAt: new Date(),
          internalNotes: args.reason
            ? `${booking.booking.internalNotes || ''}\n[Verschoben] ${args.reason}`.trim()
            : booking.booking.internalNotes,
        })
        .where(eq(bookings.id, args.bookingId))
        .returning()

      // Log action
      const { bookingActions } = await import('@/lib/db/schema')
      await db.insert(bookingActions).values({
        bookingId: args.bookingId,
        action: 'rescheduled',
        actorType: 'staff',
        metadata: {
          oldStartsAt: booking.booking.startsAt?.toISOString(),
          newStartsAt: newStartsAt.toISOString(),
          reason: args.reason,
          durationOverride: args.durationMinutes || null,
        },
      })

      return {
        success: true,
        data: {
          bookingId: updated.id,
          newStartsAt: updated.startsAt?.toISOString(),
          newEndsAt: updated.endsAt?.toISOString(),
          message: 'Buchung erfolgreich verschoben',
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Verschieben der Buchung' }
    }
  },

  /**
   * Search customer conversations (ADMIN ONLY)
   * Enables owners to ask: "What did we discuss with Tom?" or "Show me all chats from last week"
   */
  async search_customer_conversations(args: {
    businessId: string
    customerName?: string
    customerEmail?: string
    searchQuery?: string
    daysBack?: number
    limit?: number
  }) {
    try {
      const { businessId, customerName, customerEmail, searchQuery, daysBack = 30, limit: rawLimit = 5 } = args
      const limit = Math.min(rawLimit, 20)

      // Calculate date cutoff
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysBack)

      // Build base query - get conversations with customer info
      let conversations = await db
        .select({
          id: chatbotConversations.id,
          channel: chatbotConversations.channel,
          status: chatbotConversations.status,
          summary: chatbotConversations.summary,
          createdAt: chatbotConversations.createdAt,
          updatedAt: chatbotConversations.updatedAt,
          customerName: customers.name,
          customerEmail: customers.email,
          customerPhone: customers.phone,
        })
        .from(chatbotConversations)
        .leftJoin(customers, eq(chatbotConversations.customerId, customers.id))
        .where(and(
          eq(chatbotConversations.businessId, businessId),
          gte(chatbotConversations.createdAt, cutoffDate)
        ))
        .orderBy(desc(chatbotConversations.updatedAt))
        .limit(100) // Get more initially for filtering

      // Filter by customer name/email in memory
      if (customerName) {
        const searchTerm = customerName.toLowerCase()
        conversations = conversations.filter(c =>
          c.customerName?.toLowerCase().includes(searchTerm)
        )
      }

      if (customerEmail) {
        const searchTerm = customerEmail.toLowerCase()
        conversations = conversations.filter(c =>
          c.customerEmail?.toLowerCase().includes(searchTerm)
        )
      }

      // If no customer filter provided and no results with customer info,
      // we need to search in message content
      if (!customerName && !customerEmail && searchQuery) {
        // Search in message content
        const messageMatches = await db
          .select({
            conversationId: chatbotMessages.conversationId,
          })
          .from(chatbotMessages)
          .innerJoin(chatbotConversations, eq(chatbotMessages.conversationId, chatbotConversations.id))
          .where(and(
            eq(chatbotConversations.businessId, businessId),
            ilike(chatbotMessages.content, `%${searchQuery}%`),
            gte(chatbotConversations.createdAt, cutoffDate)
          ))
          .groupBy(chatbotMessages.conversationId)
          .limit(50)

        const matchingIds = new Set(messageMatches.map(m => m.conversationId))
        conversations = conversations.filter(c => matchingIds.has(c.id))
      }

      // Apply limit
      conversations = conversations.slice(0, limit)

      // For each conversation, get recent messages (summary or last 3 messages)
      const results = await Promise.all(
        conversations.map(async (conv) => {
          // If we have a summary, use it
          if (conv.summary) {
            return {
              conversationId: conv.id,
              customerName: conv.customerName || 'Unbekannt',
              customerEmail: conv.customerEmail,
              customerPhone: conv.customerPhone,
              channel: conv.channel,
              status: conv.status,
              summary: conv.summary,
              lastActivity: conv.updatedAt?.toISOString(),
              startedAt: conv.createdAt?.toISOString(),
            }
          }

          // Otherwise, get last 3 user/assistant messages for context
          const recentMessages = await db
            .select({
              role: chatbotMessages.role,
              content: chatbotMessages.content,
              createdAt: chatbotMessages.createdAt,
            })
            .from(chatbotMessages)
            .where(and(
              eq(chatbotMessages.conversationId, conv.id),
              or(
                eq(chatbotMessages.role, 'user'),
                eq(chatbotMessages.role, 'assistant')
              )
            ))
            .orderBy(desc(chatbotMessages.createdAt))
            .limit(3)

          // Create a quick summary from messages
          const messagePreview = recentMessages
            .reverse()
            .map(m => `${m.role === 'user' ? 'Kunde' : 'Bot'}: ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`)
            .join('\n')

          return {
            conversationId: conv.id,
            customerName: conv.customerName || 'Unbekannt',
            customerEmail: conv.customerEmail,
            customerPhone: conv.customerPhone,
            channel: conv.channel,
            status: conv.status,
            summary: null,
            messagePreview,
            lastActivity: conv.updatedAt?.toISOString(),
            startedAt: conv.createdAt?.toISOString(),
          }
        })
      )

      return {
        success: true,
        data: {
          conversations: results,
          count: results.length,
          searchedDays: daysBack,
          message: results.length > 0
            ? `${results.length} Gespräch${results.length > 1 ? 'e' : ''} gefunden in den letzten ${daysBack} Tagen.`
            : `Keine Gespräche gefunden${customerName ? ` mit "${customerName}"` : ''}${customerEmail ? ` (${customerEmail})` : ''} in den letzten ${daysBack} Tagen.`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return {
        success: false,
        error: 'Fehler beim Durchsuchen der Gespräche',
      }
    }
  },

  // ============================================
  // PHASE 1: NEW ADMIN TOOL HANDLERS (11 total)
  // ============================================

  /**
   * Get today's bookings (ADMIN)
   */
  async get_todays_bookings(args: { businessId: string }) {
    try {
      // Get business timezone
      const business = await db
        .select({ timezone: businesses.timezone, name: businesses.name })
        .from(businesses)
        .where(eq(businesses.id, args.businessId))
        .limit(1)
        .then(rows => rows[0])

      if (!business) {
        return { success: false, error: 'Business not found' }
      }

      // Calculate today's date range in business timezone
      const now = new Date()
      const businessNow = new Date(now.toLocaleString('en-US', { timeZone: business.timezone }))
      const todayStart = new Date(businessNow)
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(businessNow)
      todayEnd.setHours(23, 59, 59, 999)

      // Get bookings for today
      const todaysBookings = await db
        .select({
          id: bookings.id,
          startsAt: bookings.startsAt,
          endsAt: bookings.endsAt,
          status: bookings.status,
          notes: bookings.notes,
          customerName: customers.name,
          customerEmail: customers.email,
          customerPhone: customers.phone,
          serviceName: services.name,
          staffName: staff.name,
        })
        .from(bookings)
        .leftJoin(customers, eq(bookings.customerId, customers.id))
        .leftJoin(services, eq(bookings.serviceId, services.id))
        .leftJoin(staff, eq(bookings.staffId, staff.id))
        .where(and(
          eq(bookings.businessId, args.businessId),
          gte(bookings.startsAt, todayStart),
          lte(bookings.startsAt, todayEnd)
        ))
        .orderBy(bookings.startsAt)

      // Format for display
      const formatted = todaysBookings.map(b => ({
        id: b.id,
        time: b.startsAt ? new Date(b.startsAt).toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: business.timezone,
        }) : 'N/A',
        endTime: b.endsAt ? new Date(b.endsAt).toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: business.timezone,
        }) : 'N/A',
        customer: b.customerName || 'Unbekannt',
        email: b.customerEmail,
        phone: b.customerPhone,
        service: b.serviceName || 'N/A',
        staff: b.staffName || 'Nicht zugewiesen',
        status: b.status,
        notes: b.notes,
      }))

      // Count by status
      const statusCounts = {
        pending: formatted.filter(b => b.status === 'pending').length,
        confirmed: formatted.filter(b => b.status === 'confirmed').length,
        completed: formatted.filter(b => b.status === 'completed').length,
        cancelled: formatted.filter(b => b.status === 'cancelled').length,
        noShow: formatted.filter(b => b.status === 'no_show').length,
      }

      return {
        success: true,
        data: {
          date: businessNow.toISOString().split('T')[0],
          timezone: business.timezone,
          totalBookings: formatted.length,
          statusCounts,
          bookings: formatted,
          message: formatted.length > 0
            ? `${formatted.length} Buchung${formatted.length > 1 ? 'en' : ''} für heute`
            : 'Keine Buchungen für heute',
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Abrufen der heutigen Buchungen' }
    }
  },

  /**
   * Get upcoming bookings (ADMIN)
   */
  async get_upcoming_bookings(args: { businessId: string; days?: number }) {
    try {
      const days = Math.min(args.days || 7, 30)

      // Get business timezone
      const business = await db
        .select({ timezone: businesses.timezone })
        .from(businesses)
        .where(eq(businesses.id, args.businessId))
        .limit(1)
        .then(rows => rows[0])

      if (!business) {
        return { success: false, error: 'Business not found' }
      }

      // Calculate date range
      const now = new Date()
      const endDate = new Date(now)
      endDate.setDate(endDate.getDate() + days)
      endDate.setHours(23, 59, 59, 999)

      // Get upcoming bookings
      const upcomingBookings = await db
        .select({
          id: bookings.id,
          startsAt: bookings.startsAt,
          endsAt: bookings.endsAt,
          status: bookings.status,
          customerName: customers.name,
          customerEmail: customers.email,
          serviceName: services.name,
          staffName: staff.name,
        })
        .from(bookings)
        .leftJoin(customers, eq(bookings.customerId, customers.id))
        .leftJoin(services, eq(bookings.serviceId, services.id))
        .leftJoin(staff, eq(bookings.staffId, staff.id))
        .where(and(
          eq(bookings.businessId, args.businessId),
          gte(bookings.startsAt, now),
          lte(bookings.startsAt, endDate),
          or(
            eq(bookings.status, 'pending'),
            eq(bookings.status, 'confirmed')
          )
        ))
        .orderBy(bookings.startsAt)
        .limit(50)

      // Group by date
      const byDate: Record<string, typeof upcomingBookings> = {}
      for (const b of upcomingBookings) {
        const dateKey = b.startsAt ? new Date(b.startsAt).toLocaleDateString('de-DE', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
          timeZone: business.timezone,
        }) : 'Unbekannt'
        if (!byDate[dateKey]) byDate[dateKey] = []
        byDate[dateKey].push(b)
      }

      // Format for display
      const formatted = upcomingBookings.map(b => ({
        id: b.id,
        date: b.startsAt ? new Date(b.startsAt).toLocaleDateString('de-DE', {
          weekday: 'short',
          day: '2-digit',
          month: '2-digit',
          timeZone: business.timezone,
        }) : 'N/A',
        time: b.startsAt ? new Date(b.startsAt).toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: business.timezone,
        }) : 'N/A',
        customer: b.customerName || 'Unbekannt',
        service: b.serviceName || 'N/A',
        staff: b.staffName || 'Nicht zugewiesen',
        status: b.status,
      }))

      return {
        success: true,
        data: {
          days,
          totalBookings: formatted.length,
          bookingsByDate: Object.fromEntries(
            Object.entries(byDate).map(([date, bks]) => [date, bks.length])
          ),
          bookings: formatted,
          message: formatted.length > 0
            ? `${formatted.length} Buchung${formatted.length > 1 ? 'en' : ''} in den nächsten ${days} Tagen`
            : `Keine Buchungen in den nächsten ${days} Tagen`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Abrufen der kommenden Buchungen' }
    }
  },

  /**
   * Create booking directly without hold flow (ADMIN)
   */
  async create_booking_admin(args: {
    businessId: string
    serviceId: string
    staffId?: string
    startsAt: string
    customerName: string
    customerEmail: string
    customerPhone?: string
    notes?: string
    sendConfirmation?: boolean
  }) {
    try {
      const sendConfirmation = args.sendConfirmation !== false // Default true

      // Get service info
      const service = await db
        .select({
          id: services.id,
          name: services.name,
          durationMinutes: services.durationMinutes,
          price: services.price,
        })
        .from(services)
        .where(and(
          eq(services.id, args.serviceId),
          eq(services.businessId, args.businessId)
        ))
        .limit(1)
        .then(rows => rows[0])

      if (!service) {
        return { success: false, error: 'Service nicht gefunden' }
      }

      // Get business info
      const business = await db
        .select({ name: businesses.name, timezone: businesses.timezone, email: businesses.email })
        .from(businesses)
        .where(eq(businesses.id, args.businessId))
        .limit(1)
        .then(rows => rows[0])

      if (!business) {
        return { success: false, error: 'Business nicht gefunden' }
      }

      // Calculate end time
      const startsAt = new Date(args.startsAt)
      const endsAt = new Date(startsAt.getTime() + (service.durationMinutes || 60) * 60000)

      // Validate staff if provided
      if (args.staffId) {
        const staffMember = await db
          .select({ id: staff.id })
          .from(staff)
          .where(and(
            eq(staff.id, args.staffId),
            eq(staff.businessId, args.businessId),
            eq(staff.isActive, true),
            isNull(staff.deletedAt)
          ))
          .limit(1)
          .then(rows => rows[0])

        if (!staffMember) {
          return { success: false, error: 'Mitarbeiter nicht gefunden oder inaktiv' }
        }

        // Check staff-service qualification
        const qualification = await db
          .select({ staffId: staffServices.staffId })
          .from(staffServices)
          .where(and(
            eq(staffServices.staffId, args.staffId),
            eq(staffServices.serviceId, args.serviceId),
            eq(staffServices.isActive, true)
          ))
          .limit(1)
          .then(rows => rows[0])

        if (!qualification) {
          return { success: false, error: 'Mitarbeiter ist für diesen Service nicht qualifiziert' }
        }

        // Check for overlapping bookings for this staff
        const overlapping = await db
          .select({ id: bookings.id })
          .from(bookings)
          .where(and(
            eq(bookings.staffId, args.staffId),
            eq(bookings.businessId, args.businessId),
            ne(bookings.status, 'cancelled'),
            lt(bookings.startsAt, endsAt),
            gt(bookings.endsAt, startsAt)
          ))
          .limit(1)
          .then(rows => rows[0])

        if (overlapping) {
          return { success: false, error: 'Mitarbeiter hat bereits einen Termin in diesem Zeitraum' }
        }
      }

      // Find or create customer
      let customer = await db
        .select()
        .from(customers)
        .where(and(
          eq(customers.businessId, args.businessId),
          eq(customers.email, args.customerEmail)
        ))
        .limit(1)
        .then(rows => rows[0])

      if (!customer) {
        const [newCustomer] = await db
          .insert(customers)
          .values({
            businessId: args.businessId,
            name: args.customerName,
            email: args.customerEmail,
            phone: args.customerPhone,
            source: 'admin',
          })
          .returning()
        customer = newCustomer
      }

      // Create booking directly as confirmed
      const [booking] = await db
        .insert(bookings)
        .values({
          businessId: args.businessId,
          serviceId: args.serviceId,
          staffId: args.staffId,
          customerId: customer.id,
          startsAt,
          endsAt,
          status: 'confirmed',
          confirmedAt: new Date(),
          notes: args.notes,
          source: 'admin',
          price: service.price,
        })
        .returning()

      // Log action
      await db.insert(bookingActions).values({
        bookingId: booking.id,
        action: 'created',
        actorType: 'staff',
        metadata: { source: 'admin_chatbot', directBooking: true },
      })

      // Get staff name if assigned
      let staffName: string | undefined
      if (args.staffId) {
        const staffMember = await db
          .select({ name: staff.name })
          .from(staff)
          .where(eq(staff.id, args.staffId))
          .limit(1)
          .then(rows => rows[0])
        staffName = staffMember?.name
      }

      // Send confirmation email if requested
      if (sendConfirmation && args.customerEmail) {
        try {
          const formattedDate = startsAt.toLocaleDateString('de-DE', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            timeZone: business.timezone,
          })
          const formattedTime = startsAt.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: business.timezone,
          })

          await sendEmail({
            to: args.customerEmail,
            subject: `Buchungsbestätigung - ${service.name} bei ${business.name}`,
            html: `
              <h2>Buchungsbestätigung</h2>
              <p>Hallo ${args.customerName},</p>
              <p>Ihre Buchung wurde bestätigt:</p>
              <ul>
                <li><strong>Service:</strong> ${service.name}</li>
                <li><strong>Datum:</strong> ${formattedDate}</li>
                <li><strong>Uhrzeit:</strong> ${formattedTime}</li>
                ${staffName ? `<li><strong>Mitarbeiter:</strong> ${staffName}</li>` : ''}
                ${service.price ? `<li><strong>Preis:</strong> ${service.price} €</li>` : ''}
              </ul>
              <p>Mit freundlichen Grüßen,<br>${business.name}</p>
            `,
            text: `Buchungsbestätigung\n\nHallo ${args.customerName},\n\nIhre Buchung wurde bestätigt:\n- Service: ${service.name}\n- Datum: ${formattedDate}\n- Uhrzeit: ${formattedTime}${staffName ? `\n- Mitarbeiter: ${staffName}` : ''}${service.price ? `\n- Preis: ${service.price} €` : ''}\n\nMit freundlichen Grüßen,\n${business.name}`,
          })
        } catch (emailError) {
          log.error('Email error:', emailError)
          // Don't fail the booking if email fails
        }
      }

      return {
        success: true,
        data: {
          bookingId: booking.id,
          confirmationToken: booking.confirmationToken,
          startsAt: booking.startsAt?.toISOString(),
          endsAt: booking.endsAt?.toISOString(),
          serviceName: service.name,
          staffName,
          customerName: args.customerName,
          emailSent: sendConfirmation,
          message: `Buchung erstellt für ${args.customerName} am ${startsAt.toLocaleDateString('de-DE', { timeZone: business.timezone })} um ${startsAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: business.timezone })}`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Erstellen der Buchung' }
    }
  },

  /**
   * Cancel booking with notification (ADMIN)
   */
  async cancel_booking_with_notification(args: {
    businessId: string
    bookingId: string
    reason: string
    notifyCustomer?: boolean
  }) {
    try {
      const notifyCustomer = args.notifyCustomer !== false // Default true

      // Get booking with customer and service info
      const booking = await db
        .select({
          booking: bookings,
          customer: customers,
          service: services,
        })
        .from(bookings)
        .leftJoin(customers, eq(bookings.customerId, customers.id))
        .leftJoin(services, eq(bookings.serviceId, services.id))
        .where(and(
          eq(bookings.id, args.bookingId),
          eq(bookings.businessId, args.businessId)
        ))
        .limit(1)
        .then(rows => rows[0])

      if (!booking) {
        return { success: false, error: 'Buchung nicht gefunden' }
      }

      if (booking.booking.status === 'cancelled') {
        return { success: false, error: 'Buchung ist bereits storniert' }
      }

      // Get business info
      const business = await db
        .select({ name: businesses.name, timezone: businesses.timezone })
        .from(businesses)
        .where(eq(businesses.id, args.businessId))
        .limit(1)
        .then(rows => rows[0])

      if (!business) {
        return { success: false, error: 'Business nicht gefunden' }
      }

      // Update booking status
      const [updated] = await db
        .update(bookings)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: 'staff',
          cancellationReason: args.reason,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, args.bookingId))
        .returning()

      // Log action
      await db.insert(bookingActions).values({
        bookingId: args.bookingId,
        action: 'cancelled',
        actorType: 'staff',
        metadata: { reason: args.reason, notifiedCustomer: notifyCustomer },
      })

      // Send cancellation email if requested and customer has email
      let emailSent = false
      if (notifyCustomer && booking.customer?.email) {
        try {
          const formattedDate = booking.booking.startsAt
            ? new Date(booking.booking.startsAt).toLocaleDateString('de-DE', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                timeZone: business.timezone,
              })
            : 'N/A'
          const formattedTime = booking.booking.startsAt
            ? new Date(booking.booking.startsAt).toLocaleTimeString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: business.timezone,
              })
            : 'N/A'

          await sendEmail({
            to: booking.customer.email,
            subject: `Stornierung Ihrer Buchung - ${business.name}`,
            html: `
              <h2>Buchung storniert</h2>
              <p>Hallo ${booking.customer.name || 'Kunde'},</p>
              <p>Wir müssen Ihnen leider mitteilen, dass Ihre Buchung storniert wurde:</p>
              <ul>
                <li><strong>Service:</strong> ${booking.service?.name || 'N/A'}</li>
                <li><strong>Datum:</strong> ${formattedDate}</li>
                <li><strong>Uhrzeit:</strong> ${formattedTime}</li>
              </ul>
              <p><strong>Grund:</strong> ${args.reason}</p>
              <p>Wir entschuldigen uns für eventuelle Unannehmlichkeiten. Bitte kontaktieren Sie uns, um einen neuen Termin zu vereinbaren.</p>
              <p>Mit freundlichen Grüßen,<br>${business.name}</p>
            `,
            text: `Buchung storniert\n\nHallo ${booking.customer.name || 'Kunde'},\n\nWir müssen Ihnen leider mitteilen, dass Ihre Buchung storniert wurde:\n- Service: ${booking.service?.name || 'N/A'}\n- Datum: ${formattedDate}\n- Uhrzeit: ${formattedTime}\n\nGrund: ${args.reason}\n\nWir entschuldigen uns für eventuelle Unannehmlichkeiten.\n\nMit freundlichen Grüßen,\n${business.name}`,
          })
          emailSent = true
        } catch (emailError) {
          log.error('Email error:', emailError)
        }
      }

      return {
        success: true,
        data: {
          bookingId: updated.id,
          status: updated.status,
          customerNotified: emailSent,
          reason: args.reason,
          message: `Buchung storniert${emailSent ? ' und Kunde benachrichtigt' : ''}`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Stornieren der Buchung' }
    }
  },

  /**
   * Create customer (ADMIN)
   */
  async create_customer(args: {
    businessId: string
    name: string
    email?: string
    phone?: string
    notes?: string
  }) {
    try {
      // Check if customer with email already exists
      if (args.email) {
        const existing = await db
          .select({ id: customers.id })
          .from(customers)
          .where(and(
            eq(customers.businessId, args.businessId),
            eq(customers.email, args.email)
          ))
          .limit(1)
          .then(rows => rows[0])

        if (existing) {
          return {
            success: false,
            error: `Ein Kunde mit der E-Mail ${args.email} existiert bereits`,
            data: { existingCustomerId: existing.id },
          }
        }
      }

      // Create customer
      const [customer] = await db
        .insert(customers)
        .values({
          businessId: args.businessId,
          name: args.name,
          email: args.email,
          phone: args.phone,
          notes: args.notes,
          source: 'admin',
        })
        .returning()

      return {
        success: true,
        data: {
          customerId: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          message: `Kunde "${args.name}" erstellt`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Erstellen des Kunden' }
    }
  },

  /**
   * Update customer (ADMIN)
   */
  async update_customer(args: {
    businessId: string
    customerId: string
    name?: string
    email?: string
    phone?: string
    notes?: string
    street?: string
    city?: string
    postalCode?: string
    country?: string
  }) {
    try {
      // Verify customer exists and belongs to business
      const existing = await db
        .select({ id: customers.id, name: customers.name, email: customers.email, phone: customers.phone, notes: customers.notes, street: customers.street, city: customers.city, postalCode: customers.postalCode, country: customers.country })
        .from(customers)
        .where(and(
          eq(customers.id, args.customerId),
          eq(customers.businessId, args.businessId)
        ))
        .limit(1)
        .then(rows => rows[0])

      if (!existing) {
        return { success: false, error: 'Kunde nicht gefunden' }
      }

      // If email is changing, check uniqueness within the business
      if (args.email && args.email !== existing.email) {
        const emailTaken = await db
          .select({ id: customers.id })
          .from(customers)
          .where(and(
            eq(customers.businessId, args.businessId),
            eq(customers.email, args.email),
            ne(customers.id, args.customerId)
          ))
          .limit(1)
          .then(rows => rows[0])

        if (emailTaken) {
          return {
            success: false,
            error: `Ein anderer Kunde mit der E-Mail ${args.email} existiert bereits`,
            data: { existingCustomerId: emailTaken.id },
          }
        }
      }

      // Build update object from provided fields only
      const updates: Record<string, string> = {}
      if (args.name !== undefined) updates.name = args.name
      if (args.email !== undefined) updates.email = args.email
      if (args.phone !== undefined) updates.phone = args.phone
      if (args.notes !== undefined) updates.notes = args.notes
      if (args.street !== undefined) updates.street = args.street
      if (args.city !== undefined) updates.city = args.city
      if (args.postalCode !== undefined) updates.postalCode = args.postalCode
      if (args.country !== undefined) updates.country = args.country

      if (Object.keys(updates).length === 0) {
        return { success: false, error: 'Keine Felder zum Aktualisieren angegeben' }
      }

      const [updated] = await db
        .update(customers)
        .set(updates)
        .where(eq(customers.id, args.customerId))
        .returning()

      return {
        success: true,
        data: {
          customerId: updated.id,
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
          street: updated.street,
          city: updated.city,
          postalCode: updated.postalCode,
          country: updated.country,
          message: `Kunde "${updated.name}" aktualisiert`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Aktualisieren des Kunden' }
    }
  },

  /**
   * Search customers (ADMIN)
   */
  async search_customers(args: {
    businessId: string
    query: string
    limit?: number
  }) {
    try {
      const limit = Math.min(args.limit || 10, 50)
      const searchTerm = `%${args.query}%`

      const results = await db
        .select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
          source: customers.source,
          createdAt: customers.createdAt,
        })
        .from(customers)
        .where(and(
          eq(customers.businessId, args.businessId),
          or(
            ilike(customers.name, searchTerm),
            ilike(customers.email, searchTerm),
            ilike(customers.phone, searchTerm)
          )
        ))
        .orderBy(desc(customers.createdAt))
        .limit(limit)

      return {
        success: true,
        data: {
          customers: results.map(c => ({
            id: c.id,
            name: c.name || 'Unbekannt',
            email: c.email,
            phone: c.phone,
            source: c.source,
            createdAt: c.createdAt?.toISOString(),
          })),
          count: results.length,
          message: results.length > 0
            ? `${results.length} Kunde${results.length > 1 ? 'n' : ''} gefunden`
            : `Keine Kunden gefunden für "${args.query}"`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler bei der Kundensuche' }
    }
  },

  /**
   * Get customer bookings (ADMIN)
   */
  async get_customer_bookings(args: {
    businessId: string
    customerId: string
    includeCompleted?: boolean
  }) {
    try {
      const includeCompleted = args.includeCompleted !== false // Default true

      // Get customer info
      const customer = await db
        .select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
          phone: customers.phone,
        })
        .from(customers)
        .where(and(
          eq(customers.id, args.customerId),
          eq(customers.businessId, args.businessId)
        ))
        .limit(1)
        .then(rows => rows[0])

      if (!customer) {
        return { success: false, error: 'Kunde nicht gefunden' }
      }

      // Build status filter
      const statusFilter = includeCompleted
        ? undefined
        : or(
            eq(bookings.status, 'pending'),
            eq(bookings.status, 'confirmed')
          )

      // Get bookings
      const customerBookings = await db
        .select({
          id: bookings.id,
          startsAt: bookings.startsAt,
          endsAt: bookings.endsAt,
          status: bookings.status,
          notes: bookings.notes,
          price: bookings.price,
          serviceName: services.name,
          staffName: staff.name,
        })
        .from(bookings)
        .leftJoin(services, eq(bookings.serviceId, services.id))
        .leftJoin(staff, eq(bookings.staffId, staff.id))
        .where(and(
          eq(bookings.customerId, args.customerId),
          eq(bookings.businessId, args.businessId),
          statusFilter
        ))
        .orderBy(desc(bookings.startsAt))
        .limit(50)

      // Get business timezone
      const business = await db
        .select({ timezone: businesses.timezone })
        .from(businesses)
        .where(eq(businesses.id, args.businessId))
        .limit(1)
        .then(rows => rows[0])

      const timezone = business?.timezone || 'Europe/Berlin'

      // Format bookings
      const formatted = customerBookings.map(b => ({
        id: b.id,
        date: b.startsAt ? new Date(b.startsAt).toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          timeZone: timezone,
        }) : 'N/A',
        time: b.startsAt ? new Date(b.startsAt).toLocaleTimeString('de-DE', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: timezone,
        }) : 'N/A',
        service: b.serviceName || 'N/A',
        staff: b.staffName || 'Nicht zugewiesen',
        status: b.status,
        price: b.price,
        notes: b.notes,
      }))

      // Count by status
      const statusCounts = {
        pending: formatted.filter(b => b.status === 'pending').length,
        confirmed: formatted.filter(b => b.status === 'confirmed').length,
        completed: formatted.filter(b => b.status === 'completed').length,
        cancelled: formatted.filter(b => b.status === 'cancelled').length,
        noShow: formatted.filter(b => b.status === 'no_show').length,
      }

      return {
        success: true,
        data: {
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
          },
          bookings: formatted,
          totalBookings: formatted.length,
          statusCounts,
          message: formatted.length > 0
            ? `${formatted.length} Buchung${formatted.length > 1 ? 'en' : ''} für ${customer.name}`
            : `Keine Buchungen für ${customer.name}`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Abrufen der Kundenbuchungen' }
    }
  },

  /**
   * Send email to customer (ADMIN)
   */
  async send_email_to_customer(args: {
    businessId: string
    customerId: string
    subject: string
    body: string
  }) {
    try {
      // Get customer info
      const customer = await db
        .select({
          id: customers.id,
          name: customers.name,
          email: customers.email,
        })
        .from(customers)
        .where(and(
          eq(customers.id, args.customerId),
          eq(customers.businessId, args.businessId)
        ))
        .limit(1)
        .then(rows => rows[0])

      if (!customer) {
        return { success: false, error: 'Kunde nicht gefunden' }
      }

      if (!customer.email) {
        return { success: false, error: 'Kunde hat keine E-Mail-Adresse' }
      }

      // Get business info
      const business = await db
        .select({ name: businesses.name })
        .from(businesses)
        .where(eq(businesses.id, args.businessId))
        .limit(1)
        .then(rows => rows[0])

      // Send email
      await sendCustomEmail({
        to: customer.email,
        subject: args.subject,
        body: args.body,
        customerName: customer.name || undefined,
        businessName: business?.name || undefined,
      })

      return {
        success: true,
        data: {
          customerId: customer.id,
          customerEmail: customer.email,
          subject: args.subject,
          message: `E-Mail an ${customer.email} gesendet`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Senden der E-Mail' }
    }
  },

  /**
   * Resend booking confirmation (ADMIN)
   */
  async resend_booking_confirmation(args: {
    businessId: string
    bookingId: string
  }) {
    try {
      // Get booking with customer, service, staff info
      const booking = await db
        .select({
          booking: bookings,
          customer: customers,
          service: services,
          staffMember: staff,
        })
        .from(bookings)
        .leftJoin(customers, eq(bookings.customerId, customers.id))
        .leftJoin(services, eq(bookings.serviceId, services.id))
        .leftJoin(staff, eq(bookings.staffId, staff.id))
        .where(and(
          eq(bookings.id, args.bookingId),
          eq(bookings.businessId, args.businessId)
        ))
        .limit(1)
        .then(rows => rows[0])

      if (!booking) {
        return { success: false, error: 'Buchung nicht gefunden' }
      }

      if (!booking.customer?.email) {
        return { success: false, error: 'Kunde hat keine E-Mail-Adresse' }
      }

      // Get business info
      const business = await db
        .select({ name: businesses.name, timezone: businesses.timezone })
        .from(businesses)
        .where(eq(businesses.id, args.businessId))
        .limit(1)
        .then(rows => rows[0])

      if (!business) {
        return { success: false, error: 'Business nicht gefunden' }
      }

      // Format date/time
      const formattedDate = booking.booking.startsAt
        ? new Date(booking.booking.startsAt).toLocaleDateString('de-DE', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            timeZone: business.timezone,
          })
        : 'N/A'
      const formattedTime = booking.booking.startsAt
        ? new Date(booking.booking.startsAt).toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: business.timezone,
          })
        : 'N/A'

      // Send confirmation email
      await sendEmail({
        to: booking.customer.email,
        subject: `Buchungsbestätigung - ${booking.service?.name || 'Termin'} bei ${business.name}`,
        html: `
          <h2>Buchungsbestätigung</h2>
          <p>Hallo ${booking.customer.name || 'Kunde'},</p>
          <p>Hier ist Ihre Buchungsbestätigung:</p>
          <ul>
            <li><strong>Service:</strong> ${booking.service?.name || 'N/A'}</li>
            <li><strong>Datum:</strong> ${formattedDate}</li>
            <li><strong>Uhrzeit:</strong> ${formattedTime}</li>
            ${booking.staffMember?.name ? `<li><strong>Mitarbeiter:</strong> ${booking.staffMember.name}</li>` : ''}
            ${booking.booking.price ? `<li><strong>Preis:</strong> ${booking.booking.price} €</li>` : ''}
          </ul>
          <p>Mit freundlichen Grüßen,<br>${business.name}</p>
        `,
        text: `Buchungsbestätigung\n\nHallo ${booking.customer.name || 'Kunde'},\n\nHier ist Ihre Buchungsbestätigung:\n- Service: ${booking.service?.name || 'N/A'}\n- Datum: ${formattedDate}\n- Uhrzeit: ${formattedTime}${booking.staffMember?.name ? `\n- Mitarbeiter: ${booking.staffMember.name}` : ''}${booking.booking.price ? `\n- Preis: ${booking.booking.price} €` : ''}\n\nMit freundlichen Grüßen,\n${business.name}`,
      })

      return {
        success: true,
        data: {
          bookingId: booking.booking.id,
          customerEmail: booking.customer.email,
          message: `Buchungsbestätigung erneut an ${booking.customer.email} gesendet`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Senden der Bestätigung' }
    }
  },

  /**
   * Get daily summary (ADMIN/OWNER)
   */
  async get_daily_summary(args: {
    businessId: string
    date?: string
  }) {
    try {
      // Get business info
      const business = await db
        .select({ timezone: businesses.timezone, name: businesses.name })
        .from(businesses)
        .where(eq(businesses.id, args.businessId))
        .limit(1)
        .then(rows => rows[0])

      if (!business) {
        return { success: false, error: 'Business nicht gefunden' }
      }

      // Calculate date range
      let targetDate: Date
      if (args.date) {
        targetDate = new Date(args.date)
      } else {
        const now = new Date()
        targetDate = new Date(now.toLocaleString('en-US', { timeZone: business.timezone }))
      }

      const dayStart = new Date(targetDate)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(targetDate)
      dayEnd.setHours(23, 59, 59, 999)

      // Get all bookings for the day
      const dayBookings = await db
        .select({
          id: bookings.id,
          status: bookings.status,
          price: bookings.price,
        })
        .from(bookings)
        .where(and(
          eq(bookings.businessId, args.businessId),
          gte(bookings.startsAt, dayStart),
          lte(bookings.startsAt, dayEnd)
        ))

      // Count by status
      const totalBookings = dayBookings.length
      const confirmed = dayBookings.filter(b => b.status === 'confirmed').length
      const completed = dayBookings.filter(b => b.status === 'completed').length
      const cancelled = dayBookings.filter(b => b.status === 'cancelled').length
      const noShows = dayBookings.filter(b => b.status === 'no_show').length
      const pending = dayBookings.filter(b => b.status === 'pending').length

      // Calculate revenue (from completed bookings)
      const completedBookings = dayBookings.filter(b => b.status === 'completed')
      const revenue = completedBookings.reduce((sum, b) => {
        const price = b.price ? parseFloat(b.price) : 0
        return sum + price
      }, 0)

      // Get upcoming (remaining today)
      const now = new Date()
      const upcomingToday = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(
          eq(bookings.businessId, args.businessId),
          gte(bookings.startsAt, now),
          lte(bookings.startsAt, dayEnd),
          or(
            eq(bookings.status, 'pending'),
            eq(bookings.status, 'confirmed')
          )
        ))

      const formattedDate = targetDate.toLocaleDateString('de-DE', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: business.timezone,
      })

      return {
        success: true,
        data: {
          date: targetDate.toISOString().split('T')[0],
          formattedDate,
          businessName: business.name,
          summary: {
            totalBookings,
            confirmed,
            completed,
            cancelled,
            noShows,
            pending,
            upcomingToday: upcomingToday.length,
            revenue: revenue.toFixed(2),
          },
          message: `Tagesübersicht für ${formattedDate}:\n` +
            `• ${totalBookings} Buchungen gesamt\n` +
            `• ${confirmed} bestätigt, ${completed} abgeschlossen\n` +
            `• ${noShows} No-Shows, ${cancelled} storniert\n` +
            `• ${upcomingToday.length} Termine noch heute\n` +
            `• Umsatz: ${revenue.toFixed(2)} €`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Abrufen der Tagesübersicht' }
    }
  },

  /**
   * Get escalated conversations (ADMIN/OWNER)
   */
  async get_escalated_conversations(args: {
    businessId: string
    limit?: number
  }) {
    try {
      const limit = Math.min(args.limit || 10, 50)

      // Get escalated conversations
      const escalated = await db
        .select({
          id: chatbotConversations.id,
          channel: chatbotConversations.channel,
          status: chatbotConversations.status,
          summary: chatbotConversations.summary,
          createdAt: chatbotConversations.createdAt,
          updatedAt: chatbotConversations.updatedAt,
          customerName: customers.name,
          customerEmail: customers.email,
          customerPhone: customers.phone,
        })
        .from(chatbotConversations)
        .leftJoin(customers, eq(chatbotConversations.customerId, customers.id))
        .where(and(
          eq(chatbotConversations.businessId, args.businessId),
          eq(chatbotConversations.status, 'escalated')
        ))
        .orderBy(desc(chatbotConversations.updatedAt))
        .limit(limit)

      // Get recent messages for each conversation
      const results = await Promise.all(
        escalated.map(async (conv) => {
          // Get last user message
          const lastMessage = await db
            .select({
              content: chatbotMessages.content,
              createdAt: chatbotMessages.createdAt,
            })
            .from(chatbotMessages)
            .where(and(
              eq(chatbotMessages.conversationId, conv.id),
              eq(chatbotMessages.role, 'user')
            ))
            .orderBy(desc(chatbotMessages.createdAt))
            .limit(1)
            .then(rows => rows[0])

          return {
            conversationId: conv.id,
            channel: conv.channel,
            customerName: conv.customerName || 'Unbekannt',
            customerEmail: conv.customerEmail,
            customerPhone: conv.customerPhone,
            summary: conv.summary,
            lastMessage: lastMessage?.content?.substring(0, 200) || 'Keine Nachricht',
            lastActivity: conv.updatedAt?.toISOString(),
            startedAt: conv.createdAt?.toISOString(),
          }
        })
      )

      return {
        success: true,
        data: {
          conversations: results,
          count: results.length,
          message: results.length > 0
            ? `${results.length} eskalierte Gespräch${results.length > 1 ? 'e' : ''} gefunden, die Ihre Aufmerksamkeit benötigen.`
            : 'Keine eskalierten Gespräche - alles unter Kontrolle!',
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Abrufen der eskalierten Gespräche' }
    }
  },
}
