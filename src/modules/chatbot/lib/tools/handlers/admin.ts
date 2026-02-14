/**
 * Admin Tool Handlers
 *
 * These 15 tools are restricted to staff/owner actors.
 */

import { db } from '@/lib/db'
import { services, staff, staffServices, customers, bookings, businesses, chatbotConversations, chatbotMessages, bookingActions } from '@/lib/db/schema'
import { eq, and, ne, desc, or, ilike, gte, lte, isNull, lt, gt } from 'drizzle-orm'
import { sendEmail, sendCustomEmail } from '@/lib/email'
import { getEmailTranslations } from '@/lib/email-i18n'
import { getBusinessLocale } from '@/lib/locale'
import { createLogger } from '@/lib/logger'

const log = createLogger('chatbot:tools:handlers:admin')

/** Helper to get tool translations for a business */
async function getToolTranslations(businessId: string) {
  const locale = await getBusinessLocale(businessId)
  return getEmailTranslations(locale, 'chatbotPrompts.tools')
}

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
      return { success: false, error: (await getToolTranslations(args.businessId))('errorSearchingBookings') }
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
        return { success: false, error: (await getToolTranslations(args.businessId))('bookingNotFound') }
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
          message: (await getToolTranslations(args.businessId))('bookingStatusChanged', { status: args.newStatus }),
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: (await getToolTranslations(args.businessId))('errorUpdatingStatus') }
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
        return { success: false, error: (await getToolTranslations(args.businessId))('bookingNotFound') }
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
          message: (await getToolTranslations(args.businessId))('bookingRescheduled'),
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: (await getToolTranslations(args.businessId))('errorRescheduling') }
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
              customerName: conv.customerName || 'Unknown',
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
            .map(m => `${m.role === 'user' ? 'Customer' : 'Bot'}: ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`)
            .join('\n')

          return {
            conversationId: conv.id,
            customerName: conv.customerName || 'Unknown',
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
            ? `${results.length} conversation${results.length > 1 ? 's' : ''} found in the last ${daysBack} days.`
            : `No conversations found${customerName ? ` with "${customerName}"` : ''}${customerEmail ? ` (${customerEmail})` : ''} in the last ${daysBack} days.`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return {
        success: false,
        error: (await getToolTranslations(args.businessId))('errorSearchingConversations'),
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
        customer: b.customerName || 'Unknown',
        email: b.customerEmail,
        phone: b.customerPhone,
        service: b.serviceName || 'N/A',
        staff: b.staffName || 'Not assigned',
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
            ? (await getToolTranslations(args.businessId))(formatted.length > 1 ? 'bookingsForTodayPlural' : 'bookingsForToday', { count: formatted.length })
            : (await getToolTranslations(args.businessId))('noBookingsForToday'),
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: (await getToolTranslations(args.businessId))('errorFetchingTodaysBookings') }
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
        }) : 'Unknown'
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
        customer: b.customerName || 'Unknown',
        service: b.serviceName || 'N/A',
        staff: b.staffName || 'Not assigned',
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
            ? (await getToolTranslations(args.businessId))(formatted.length > 1 ? 'upcomingBookingsPlural' : 'upcomingBookings', { count: formatted.length, days })
            : (await getToolTranslations(args.businessId))('noUpcomingBookings', { days }),
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: (await getToolTranslations(args.businessId))('errorFetchingUpcomingBookings') }
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
        return { success: false, error: 'Service not found' }
      }

      // Get business info
      const business = await db
        .select({ name: businesses.name, timezone: businesses.timezone, email: businesses.email })
        .from(businesses)
        .where(eq(businesses.id, args.businessId))
        .limit(1)
        .then(rows => rows[0])

      if (!business) {
        return { success: false, error: 'Business not found' }
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
          return { success: false, error: (await getToolTranslations(args.businessId))('staffNotFoundOrInactive') }
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
          return { success: false, error: (await getToolTranslations(args.businessId))('staffNotQualified') }
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
          return { success: false, error: (await getToolTranslations(args.businessId))('staffAlreadyBooked') }
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
          const locale = await getBusinessLocale(args.businessId)
          const dateLocale = locale === 'en' ? 'en-US' : 'de-DE'
          const formattedDate = startsAt.toLocaleDateString(dateLocale, {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            timeZone: business.timezone,
          })
          const formattedTime = startsAt.toLocaleTimeString(dateLocale, {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: business.timezone,
          })

          const ec = await getEmailTranslations(locale, 'emails.common')
          const el = await getEmailTranslations(locale, 'emails.labels')
          const econf = await getEmailTranslations(locale, 'emails.confirmation')
          await sendEmail({
            to: args.customerEmail,
            subject: `${econf('confirmedTitle')} - ${service.name}`,
            html: `
              <h2>${econf('confirmedTitle')}</h2>
              <p>${ec('greeting', { name: args.customerName })}</p>
              <p>${econf('autoConfirmedHint')}</p>
              <ul>
                <li><strong>${el('service')}</strong> ${service.name}</li>
                <li><strong>${el('date')}</strong> ${formattedDate}</li>
                <li><strong>${el('time')}</strong> ${formattedTime}</li>
                ${staffName ? `<li><strong>${el('staff')}</strong> ${staffName}</li>` : ''}
                ${service.price ? `<li><strong>${el('price')}</strong> ${service.price} €</li>` : ''}
              </ul>
              <p>${ec('regards')}<br>${business.name}</p>
            `,
            text: `${econf('confirmedTitle')}\n\n${ec('greeting', { name: args.customerName })}\n\n${econf('autoConfirmedHint')}\n- ${el('service')} ${service.name}\n- ${el('date')} ${formattedDate}\n- ${el('time')} ${formattedTime}${staffName ? `\n- ${el('staff')} ${staffName}` : ''}${service.price ? `\n- ${el('price')} ${service.price} €` : ''}\n\n${ec('regards')}\n${business.name}`,
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
          message: (await getToolTranslations(args.businessId))('bookingCreatedFor', { name: args.customerName, date: startsAt.toLocaleDateString('de-DE', { timeZone: business.timezone }), time: startsAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', timeZone: business.timezone }) }),
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: (await getToolTranslations(args.businessId))('errorCreatingBooking') }
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
        return { success: false, error: (await getToolTranslations(args.businessId))('bookingNotFound') }
      }

      if (booking.booking.status === 'cancelled') {
        return { success: false, error: (await getToolTranslations(args.businessId))('bookingAlreadyCancelled') }
      }

      // Get business info
      const business = await db
        .select({ name: businesses.name, timezone: businesses.timezone })
        .from(businesses)
        .where(eq(businesses.id, args.businessId))
        .limit(1)
        .then(rows => rows[0])

      if (!business) {
        return { success: false, error: 'Business not found' }
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
          const locale = await getBusinessLocale(args.businessId)
          const ec = await getEmailTranslations(locale, 'emails.common')
          const el = await getEmailTranslations(locale, 'emails.labels')
          const ecancel = await getEmailTranslations(locale, 'emails.cancellation')
          const dateLocale = locale === 'en' ? 'en-US' : 'de-DE'
          const formattedDate = booking.booking.startsAt
            ? new Date(booking.booking.startsAt).toLocaleDateString(dateLocale, {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                timeZone: business.timezone,
              })
            : 'N/A'
          const formattedTime = booking.booking.startsAt
            ? new Date(booking.booking.startsAt).toLocaleTimeString(dateLocale, {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: business.timezone,
              })
            : 'N/A'

          await sendEmail({
            to: booking.customer.email,
            subject: `${ecancel('title')} - ${business.name}`,
            html: `
              <h2>${ecancel('title')}</h2>
              <p>${ec('greeting', { name: booking.customer.name || ec('greetingGeneric') })}</p>
              <p>${ecancel('body', { businessName: business.name })}</p>
              <ul>
                <li><strong>${el('service')}</strong> ${booking.service?.name || 'N/A'}</li>
                <li><strong>${el('date')}</strong> ${formattedDate}</li>
                <li><strong>${el('time')}</strong> ${formattedTime}</li>
              </ul>
              <p><strong>${el('reason')}</strong> ${args.reason}</p>
              <p>${ecancel('rebookHint')}</p>
              <p>${ec('regards')}<br>${business.name}</p>
            `,
            text: `${ecancel('title')}\n\n${ec('greeting', { name: booking.customer.name || ec('greetingGeneric') })}\n\n${ecancel('body', { businessName: business.name })}\n- ${el('service')} ${booking.service?.name || 'N/A'}\n- ${el('date')} ${formattedDate}\n- ${el('time')} ${formattedTime}\n\n${el('reason')} ${args.reason}\n\n${ecancel('rebookHint')}\n\n${ec('regards')}\n${business.name}`,
          })
          emailSent = true
        } catch (emailError) {
          log.error('Email error:', emailError)
        }
      }

      const t = await getToolTranslations(args.businessId)
      return {
        success: true,
        data: {
          bookingId: updated.id,
          status: updated.status,
          customerNotified: emailSent,
          reason: args.reason,
          message: emailSent ? t('bookingCancelledNotified') : t('bookingCancelledOnly'),
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: (await getToolTranslations(args.businessId))('errorCancellingBooking') }
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
            error: (await getToolTranslations(args.businessId))('customerEmailExists', { email: args.email }),
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
          message: (await getToolTranslations(args.businessId))('customerCreated', { name: args.name }),
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: (await getToolTranslations(args.businessId))('errorCreatingCustomer') }
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
        return { success: false, error: (await getToolTranslations(args.businessId))('customerNotFound') }
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
            error: (await getToolTranslations(args.businessId))('otherCustomerEmailExists', { email: args.email }),
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
        return { success: false, error: (await getToolTranslations(args.businessId))('noFieldsToUpdate') }
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
          message: (await getToolTranslations(args.businessId))('customerUpdated', { name: updated.name || '' }),
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: (await getToolTranslations(args.businessId))('errorUpdatingCustomer') }
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
            name: c.name || 'Unknown',
            email: c.email,
            phone: c.phone,
            source: c.source,
            createdAt: c.createdAt?.toISOString(),
          })),
          count: results.length,
          message: results.length > 0
            ? (await getToolTranslations(args.businessId))(results.length > 1 ? 'customersFoundPlural' : 'customersFound', { count: results.length })
            : (await getToolTranslations(args.businessId))('noCustomersFound', { query: args.query }),
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: (await getToolTranslations(args.businessId))('errorSearchingCustomers') }
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
        return { success: false, error: (await getToolTranslations(args.businessId))('customerNotFound') }
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
        staff: b.staffName || 'Not assigned',
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
            ? (await getToolTranslations(args.businessId))(formatted.length > 1 ? 'customerBookingsForPlural' : 'customerBookingsFor', { count: formatted.length, name: customer.name || '' })
            : (await getToolTranslations(args.businessId))('noCustomerBookings', { name: customer.name || '' }),
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: (await getToolTranslations(args.businessId))('errorFetchingCustomerBookings') }
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
        return { success: false, error: (await getToolTranslations(args.businessId))('customerNotFound') }
      }

      if (!customer.email) {
        return { success: false, error: (await getToolTranslations(args.businessId))('customerNoEmail') }
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
          message: `Email sent to ${customer.email}`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: (await getToolTranslations(args.businessId))('errorSendingEmail') }
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
        return { success: false, error: (await getToolTranslations(args.businessId))('bookingNotFound') }
      }

      if (!booking.customer?.email) {
        return { success: false, error: (await getToolTranslations(args.businessId))('customerNoEmail') }
      }

      // Get business info
      const business = await db
        .select({ name: businesses.name, timezone: businesses.timezone })
        .from(businesses)
        .where(eq(businesses.id, args.businessId))
        .limit(1)
        .then(rows => rows[0])

      if (!business) {
        return { success: false, error: 'Business not found' }
      }

      const locale = await getBusinessLocale(args.businessId)
      const dateLocale = locale === 'en' ? 'en-US' : 'de-DE'

      // Format date/time
      const formattedDate = booking.booking.startsAt
        ? new Date(booking.booking.startsAt).toLocaleDateString(dateLocale, {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            timeZone: business.timezone,
          })
        : 'N/A'
      const formattedTime = booking.booking.startsAt
        ? new Date(booking.booking.startsAt).toLocaleTimeString(dateLocale, {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: business.timezone,
          })
        : 'N/A'

      // Send confirmation email
      const ec = await getEmailTranslations(locale, 'emails.common')
      const el = await getEmailTranslations(locale, 'emails.labels')
      const econf = await getEmailTranslations(locale, 'emails.confirmation')
      await sendEmail({
        to: booking.customer.email,
        subject: `${econf('confirmedTitle')} - ${booking.service?.name || 'Appointment'} - ${business.name}`,
        html: `
          <h2>${econf('confirmedTitle')}</h2>
          <p>${ec('greeting', { name: booking.customer.name || ec('greetingGeneric') })}</p>
          <p>${econf('autoConfirmedHint')}</p>
          <ul>
            <li><strong>${el('service')}</strong> ${booking.service?.name || 'N/A'}</li>
            <li><strong>${el('date')}</strong> ${formattedDate}</li>
            <li><strong>${el('time')}</strong> ${formattedTime}</li>
            ${booking.staffMember?.name ? `<li><strong>${el('staff')}</strong> ${booking.staffMember.name}</li>` : ''}
            ${booking.booking.price ? `<li><strong>${el('price')}</strong> ${booking.booking.price} €</li>` : ''}
          </ul>
          <p>${ec('regards')}<br>${business.name}</p>
        `,
        text: `${econf('confirmedTitle')}\n\n${ec('greeting', { name: booking.customer.name || ec('greetingGeneric') })}\n\n${econf('autoConfirmedHint')}\n- ${el('service')} ${booking.service?.name || 'N/A'}\n- ${el('date')} ${formattedDate}\n- ${el('time')} ${formattedTime}${booking.staffMember?.name ? `\n- ${el('staff')} ${booking.staffMember.name}` : ''}${booking.booking.price ? `\n- ${el('price')} ${booking.booking.price} €` : ''}\n\n${ec('regards')}\n${business.name}`,
      })

      return {
        success: true,
        data: {
          bookingId: booking.booking.id,
          customerEmail: booking.customer.email,
          message: (await getToolTranslations(args.businessId))('confirmationResent', { email: booking.customer.email }),
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: (await getToolTranslations(args.businessId))('errorResendingConfirmation') }
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
        return { success: false, error: 'Business not found' }
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
          message: `Daily summary for ${formattedDate}:\n` +
            `- ${totalBookings} bookings total\n` +
            `- ${confirmed} confirmed, ${completed} completed\n` +
            `- ${noShows} no-shows, ${cancelled} cancelled\n` +
            `- ${upcomingToday.length} appointments remaining today\n` +
            `- Revenue: ${revenue.toFixed(2)} EUR`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: (await getToolTranslations(args.businessId))('errorFetchingDailySummary') }
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
            customerName: conv.customerName || 'Unknown',
            customerEmail: conv.customerEmail,
            customerPhone: conv.customerPhone,
            summary: conv.summary,
            lastMessage: lastMessage?.content?.substring(0, 200) || 'No message',
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
            ? `${results.length} escalated conversation${results.length > 1 ? 's' : ''} found that need your attention.`
            : (await getToolTranslations(args.businessId))('noEscalatedConversations'),
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: (await getToolTranslations(args.businessId))('errorFetchingEscalated') }
    }
  },
}
