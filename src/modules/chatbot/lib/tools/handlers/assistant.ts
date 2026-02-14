/**
 * Assistant Tool Handlers
 *
 * These 7 tools are exclusive to the Virtual Assistant (/tools/assistant).
 * They extend the owner tools with invoice, schedule, WhatsApp, and knowledge management.
 */

import { db } from '@/lib/db'
import { invoices, customers, bookings, services, staff, staffServices, businesses, chatbotKnowledge, chatbotConversations, bookingActions, documents, ingestionJobs, documentVersions, type InvoiceLineItem } from '@/lib/db/schema'
import { eq, and, desc, ilike, gte, lte, ne, or, asc, isNull } from 'drizzle-orm'
import { getStaffForService, createService, updateService, deleteService, getServiceById, getOrCreateDefaultTemplate, updateAvailabilityTemplateSlots } from '@/lib/db/queries'
import { getInvoiceById, getInvoiceByBookingId, createInvoiceForBooking, sendInvoice, markInvoicePaid, cancelInvoiceWithStorno, createReplacementInvoice, generateAndUploadInvoicePdf } from '@/lib/invoices'
import { generateAndUploadLieferschein } from '@/lib/lieferschein'
import { getAvailabilityOverrides, createAvailabilityOverride, getAvailabilityTemplate, getAvailabilitySlots } from '@/lib/db/queries'
import { sendWhatsAppMessage } from '@/lib/twilio-client'
import { generateEmbeddingWithMetadata } from '@/lib/embeddings'
import { downloadFile, getDownloadUrl } from '@/lib/r2/client'
import { sendCustomEmail } from '@/lib/email'
import { createLogger } from '@/lib/logger'

const log = createLogger('chatbot:tools:handlers:assistant')

/**
 * Assistant tool handlers
 */
export const assistantHandlers = {
  /**
   * Search invoices by customer/status/date
   */
  async search_invoices(args: {
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

      const conditions = [eq(invoices.businessId, args.businessId)]

      if (args.status) {
        conditions.push(eq(invoices.status, args.status))
      }

      if (args.dateFrom) {
        conditions.push(gte(invoices.issueDate, args.dateFrom))
      }

      if (args.dateTo) {
        conditions.push(lte(invoices.issueDate, args.dateTo))
      }

      let results = await db
        .select({
          id: invoices.id,
          invoiceNumber: invoices.invoiceNumber,
          status: invoices.status,
          total: invoices.total,
          issueDate: invoices.issueDate,
          dueDate: invoices.dueDate,
          paidAt: invoices.paidAt,
          type: invoices.type,
          customerName: customers.name,
          customerEmail: customers.email,
        })
        .from(invoices)
        .leftJoin(customers, eq(invoices.customerId, customers.id))
        .where(and(...conditions))
        .orderBy(desc(invoices.createdAt))
        .limit(limit)

      // Filter by customer name/email in memory
      if (args.customerName) {
        const searchTerm = args.customerName.toLowerCase()
        results = results.filter(r => r.customerName?.toLowerCase().includes(searchTerm))
      }

      if (args.customerEmail) {
        const searchTerm = args.customerEmail.toLowerCase()
        results = results.filter(r => r.customerEmail?.toLowerCase().includes(searchTerm))
      }

      return {
        success: true,
        data: {
          count: results.length,
          invoices: results.map(r => ({
            id: r.id,
            invoiceNumber: r.invoiceNumber,
            customerName: r.customerName || 'Unbekannt',
            status: r.status,
            total: r.total,
            issueDate: r.issueDate,
            dueDate: r.dueDate,
            paidAt: r.paidAt,
            type: r.type,
          })),
          message: results.length > 0
            ? `${results.length} Rechnung${results.length > 1 ? 'en' : ''} gefunden`
            : 'Keine Rechnungen gefunden',
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Suchen von Rechnungen' }
    }
  },

  /**
   * Get full invoice with line items + storno chain
   */
  async get_invoice_details(args: {
    businessId: string
    invoiceId: string
  }) {
    try {
      const result = await getInvoiceById(args.invoiceId)

      if (!result) {
        return { success: false, error: 'Rechnung nicht gefunden' }
      }

      // Verify business ownership
      if (result.invoice.businessId !== args.businessId) {
        return { success: false, error: 'Rechnung nicht gefunden' }
      }

      return {
        success: true,
        data: {
          id: result.invoice.id,
          invoiceNumber: result.invoice.invoiceNumber,
          status: result.invoice.status,
          type: result.invoice.type,
          items: result.invoice.items,
          subtotal: result.invoice.subtotal,
          taxRate: result.invoice.taxRate,
          taxAmount: result.invoice.taxAmount,
          total: result.invoice.total,
          currency: result.invoice.currency,
          issueDate: result.invoice.issueDate,
          dueDate: result.invoice.dueDate,
          paidAt: result.invoice.paidAt,
          customer: result.customer ? {
            name: result.customer.name,
            email: result.customer.email,
          } : null,
          booking: result.booking ? {
            id: result.booking.id,
            startsAt: result.booking.startsAt?.toISOString(),
            status: result.booking.status,
          } : null,
          service: result.service ? {
            name: result.service.name,
          } : null,
          stornoChain: {
            originalInvoiceId: result.invoice.originalInvoiceId,
            stornoInvoiceId: result.invoice.stornoInvoiceId,
            replacementInvoiceId: result.invoice.replacementInvoiceId,
          },
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Abrufen der Rechnungsdetails' }
    }
  },

  /**
   * Get invoice + Lieferschein status for a booking
   */
  async get_booking_documents(args: {
    businessId: string
    bookingId: string
  }) {
    try {
      // Verify booking belongs to business
      const booking = await db
        .select({
          id: bookings.id,
          items: bookings.items,
          lieferscheinR2Key: bookings.lieferscheinR2Key,
        })
        .from(bookings)
        .where(and(
          eq(bookings.id, args.bookingId),
          eq(bookings.businessId, args.businessId)
        ))
        .limit(1)
        .then(rows => rows[0])

      if (!booking) {
        return { success: false, error: 'Buchung nicht gefunden' }
      }

      // Get invoice for booking
      const invoice = await getInvoiceByBookingId(args.bookingId)

      // Return boolean flags + IDs only — NO raw R2 keys.
      // AI must use get_download_link to get presigned URLs.
      return {
        success: true,
        data: {
          bookingId: args.bookingId,
          items: booking.items || [],
          hasInvoice: !!invoice,
          invoice: invoice ? {
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            status: invoice.status,
            total: invoice.total,
            type: invoice.type,
            items: invoice.items,
            hasPdf: !!invoice.pdfR2Key,
          } : undefined,
          hasLieferschein: !!booking.lieferscheinR2Key,
          hint: 'Verwende get_download_link um Download-Links für Rechnungen oder Lieferscheine zu erstellen.',
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Abrufen der Dokumente' }
    }
  },

  /**
   * Get full month with customer names, blocked days, and free capacity per day
   */
  async get_monthly_schedule(args: {
    businessId: string
    year: number
    month: number
  }) {
    try {
      const startDate = new Date(args.year, args.month - 1, 1)
      const endDate = new Date(args.year, args.month, 0, 23, 59, 59, 999)

      // Sequential: business + template (fast .limit(1) queries, avoids concurrent HTTP to Neon)
      const business = await db
        .select({ timezone: businesses.timezone })
        .from(businesses)
        .where(eq(businesses.id, args.businessId))
        .limit(1)
        .then(rows => rows[0])

      if (!business) {
        return { success: false, error: 'Business nicht gefunden' }
      }

      const template = await getAvailabilityTemplate(args.businessId)

      // Sequential: avoids concurrent HTTP requests to Neon (flaky on Guyana network)
      const templateSlots = template ? await getAvailabilitySlots(template.id) : []

      const monthBookings = await db.select({
          id: bookings.id,
          startsAt: bookings.startsAt,
          endsAt: bookings.endsAt,
          status: bookings.status,
          customerName: customers.name,
          serviceName: services.name,
          staffName: staff.name,
        })
        .from(bookings)
        .leftJoin(customers, eq(bookings.customerId, customers.id))
        .leftJoin(services, eq(bookings.serviceId, services.id))
        .leftJoin(staff, eq(bookings.staffId, staff.id))
        .where(and(
          eq(bookings.businessId, args.businessId),
          gte(bookings.startsAt, startDate),
          lte(bookings.startsAt, endDate),
          ne(bookings.status, 'cancelled')
        ))
        .orderBy(bookings.startsAt)

      const overrides = await getAvailabilityOverrides(args.businessId, startDate, endDate)

      // Build day-of-week → total slot count map from template
      const slotsPerDay: Record<number, number> = {}
      for (const slot of templateSlots) {
        const [startH, startM] = slot.startTime.split(':').map(Number)
        const [endH, endM] = slot.endTime.split(':').map(Number)
        const startMin = startH * 60 + startM
        const endMin = endH * 60 + endM
        const slotCount = Math.floor((endMin - startMin) / 60) // 1-hour blocks
        slotsPerDay[slot.dayOfWeek] = (slotsPerDay[slot.dayOfWeek] || 0) + slotCount
      }

      // Build override lookup by date
      const overrideByDate: Record<string, typeof overrides[0]> = {}
      for (const o of overrides) {
        overrideByDate[o.date] = o
      }

      // Group bookings by date
      const bookingsByDate: Record<string, typeof monthBookings> = {}
      for (const b of monthBookings) {
        const dateKey = b.startsAt
          ? new Date(b.startsAt).toLocaleDateString('en-CA', { timeZone: business.timezone })
          : 'unknown'
        if (!bookingsByDate[dateKey]) bookingsByDate[dateKey] = []
        bookingsByDate[dateKey].push(b)
      }

      // Build schedule for every day of the month with capacity info
      const daysInMonth = new Date(args.year, args.month, 0).getDate()
      const byDate: Record<string, {
        bookings: Array<{
          time: string
          endTime: string
          customer: string
          service: string
          staff: string
          status: string
        }>
        isBusinessDay: boolean
        totalSlots: number
        bookedCount: number
        remainingCapacity: number
        blocked: boolean
        reason?: string
      }> = {}

      let totalBusinessDays = 0
      let totalBlockedDays = 0
      let totalCapacity = 0
      let totalBooked = 0
      let busiestDay = { date: '', count: 0 }
      let freestDay = { date: '', remaining: -1 }

      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(args.year, args.month - 1, day)
        const dayOfWeek = d.getDay()
        const dateKey = `${args.year}-${String(args.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

        const override = overrideByDate[dateKey]
        const dayBookings = bookingsByDate[dateKey] || []
        const isBlocked = override ? !override.isAvailable : false
        let isBusinessDay = (slotsPerDay[dayOfWeek] || 0) > 0

        // Override can make a non-business day available or block a business day
        if (override) {
          if (!override.isAvailable) {
            isBusinessDay = false
          } else {
            isBusinessDay = true
          }
        }

        const totalSlots = isBlocked ? 0 : (slotsPerDay[dayOfWeek] || 0)
        const bookedCount = dayBookings.length
        const remainingCapacity = Math.max(0, totalSlots - bookedCount)

        // Include days that have bookings, are business days, or are blocked
        if (dayBookings.length > 0 || isBusinessDay || isBlocked) {
          byDate[dateKey] = {
            bookings: dayBookings.map(b => ({
              time: b.startsAt ? new Date(b.startsAt).toLocaleTimeString('de-DE', {
                hour: '2-digit', minute: '2-digit', timeZone: business.timezone,
              }) : 'N/A',
              endTime: b.endsAt ? new Date(b.endsAt).toLocaleTimeString('de-DE', {
                hour: '2-digit', minute: '2-digit', timeZone: business.timezone,
              }) : 'N/A',
              customer: b.customerName || 'Unbekannt',
              service: b.serviceName || 'N/A',
              staff: b.staffName || 'Nicht zugewiesen',
              status: b.status || 'unknown',
            })),
            isBusinessDay,
            totalSlots,
            bookedCount,
            remainingCapacity,
            blocked: isBlocked,
            reason: isBlocked && override?.reason ? override.reason : undefined,
          }
        }

        if (isBusinessDay && !isBlocked) {
          totalBusinessDays++
          totalCapacity += totalSlots
          totalBooked += bookedCount
          if (bookedCount > busiestDay.count) {
            busiestDay = { date: dateKey, count: bookedCount }
          }
          if (freestDay.remaining === -1 || remainingCapacity > freestDay.remaining) {
            freestDay = { date: dateKey, remaining: remainingCapacity }
          }
        }
        if (isBlocked) totalBlockedDays++
      }

      const utilization = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0

      return {
        success: true,
        data: {
          year: args.year,
          month: args.month,
          timezone: business.timezone,
          summary: {
            totalBookings: monthBookings.length,
            totalBusinessDays,
            totalBlockedDays,
            totalCapacity,
            busiestDay: busiestDay.date ? busiestDay : null,
            freestDay: freestDay.date ? freestDay : null,
            capacityUtilization: `${utilization}%`,
          },
          schedule: byDate,
          message: `Monatsübersicht ${args.month}/${args.year}: ${monthBookings.length} Buchungen, ${totalBusinessDays} Geschäftstage, ${utilization}% Auslastung`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Abrufen der Monatsübersicht' }
    }
  },

  /**
   * Block time slots / set holiday
   */
  async block_day(args: {
    businessId: string
    date: string
    staffId?: string
    reason?: string
    isAvailable?: boolean
    startTime?: string
    endTime?: string
  }) {
    try {
      const override = await createAvailabilityOverride({
        businessId: args.businessId,
        staffId: args.staffId || null,
        date: args.date,
        isAvailable: args.isAvailable ?? false,
        startTime: args.startTime || null,
        endTime: args.endTime || null,
        reason: args.reason || null,
      })

      return {
        success: true,
        data: {
          overrideId: override.id,
          date: args.date,
          isAvailable: args.isAvailable ?? false,
          reason: args.reason,
          message: args.isAvailable
            ? `Sonderverfügbarkeit am ${args.date} erstellt`
            : `${args.date} blockiert${args.reason ? `: ${args.reason}` : ''}`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Blockieren des Tages' }
    }
  },

  /**
   * Send WhatsApp message to a customer
   */
  async send_whatsapp(args: {
    businessId: string
    customerId: string
    message: string
  }) {
    try {
      // Look up customer phone
      const customer = await db
        .select({
          id: customers.id,
          name: customers.name,
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

      if (!customer.phone) {
        return { success: false, error: 'Kunde hat keine Telefonnummer hinterlegt' }
      }

      // Send WhatsApp message
      const result = await sendWhatsAppMessage(
        { to: customer.phone, body: args.message },
        args.businessId
      )

      if (!result.success) {
        return {
          success: false,
          error: `WhatsApp-Nachricht konnte nicht gesendet werden: ${result.error}`,
        }
      }

      return {
        success: true,
        data: {
          sid: result.sid,
          customerName: customer.name,
          phone: customer.phone,
          message: `WhatsApp-Nachricht an ${customer.name} gesendet`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Senden der WhatsApp-Nachricht' }
    }
  },

  /**
   * Add knowledge with audience/scope control
   */
  async add_knowledge_entry(args: {
    businessId: string
    title: string
    content: string
    category?: string
    audience: string
    scopeType?: string
    scopeId?: string
  }) {
    try {
      // Build embedding text (consistent header pattern)
      const embeddingText = `${args.title}\n\n${args.content}`

      // Generate embedding with metadata
      const embeddingResult = await generateEmbeddingWithMetadata(embeddingText)

      // Insert into chatbotKnowledge
      const [entry] = await db
        .insert(chatbotKnowledge)
        .values({
          businessId: args.businessId,
          title: args.title,
          content: args.content,
          category: args.category || null,
          source: 'assistant',
          audience: args.audience || 'public',
          scopeType: args.scopeType || 'global',
          scopeId: args.scopeId || null,
          embedding: embeddingResult.embedding,
          embeddingProvider: embeddingResult.provider,
          embeddingModel: embeddingResult.model,
          embeddingDim: embeddingResult.dim,
          preprocessVersion: embeddingResult.preprocessVersion,
          contentHash: embeddingResult.contentHash,
          embeddedAt: new Date(),
          authorityLevel: 'normal',
          metadata: {},
          isActive: true,
        })
        .returning()

      return {
        success: true,
        data: {
          entryId: entry.id,
          title: args.title,
          audience: args.audience,
          message: `Wissenseintrag "${args.title}" erstellt (${args.audience})`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Erstellen des Wissenseintrags' }
    }
  },

  /**
   * Update booking details (staff assignment, notes)
   */
  async update_booking(args: {
    businessId: string
    bookingId: string
    staffId?: string
    notes?: string
    internalNotes?: string
  }) {
    try {
      // Verify booking exists and belongs to business
      const booking = await db
        .select({
          booking: bookings,
          service: services,
          staffMember: staff,
          customer: customers,
        })
        .from(bookings)
        .leftJoin(services, eq(bookings.serviceId, services.id))
        .leftJoin(staff, eq(bookings.staffId, staff.id))
        .leftJoin(customers, eq(bookings.customerId, customers.id))
        .where(and(eq(bookings.id, args.bookingId), eq(bookings.businessId, args.businessId)))
        .limit(1)
        .then(rows => rows[0])

      if (!booking) {
        return { success: false, error: 'Buchung nicht gefunden' }
      }

      // If staffId provided, validate staff is assigned to booking's service
      if (args.staffId && booking.booking.serviceId) {
        const qualifiedStaff = await getStaffForService(booking.booking.serviceId, args.businessId)
        const isQualified = qualifiedStaff.some(s => s.id === args.staffId)
        if (!isQualified) {
          const staffMember = await db
            .select({ name: staff.name })
            .from(staff)
            .where(eq(staff.id, args.staffId))
            .limit(1)
            .then(rows => rows[0])
          return {
            success: false,
            error: `${staffMember?.name || 'Mitarbeiter'} ist nicht für den Service "${booking.service?.name}" qualifiziert. Qualifizierte Mitarbeiter: ${qualifiedStaff.map(s => s.name).join(', ')}`,
          }
        }
      }

      // Build update object with only provided fields
      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      const changes: string[] = []

      if (args.staffId !== undefined) {
        updateData.staffId = args.staffId
        const newStaff = await db
          .select({ name: staff.name })
          .from(staff)
          .where(eq(staff.id, args.staffId))
          .limit(1)
          .then(rows => rows[0])
        changes.push(`Mitarbeiter: ${booking.staffMember?.name || 'keiner'} → ${newStaff?.name || args.staffId}`)
      }
      if (args.notes !== undefined) {
        updateData.notes = args.notes
        changes.push('Kundennotizen aktualisiert')
      }
      if (args.internalNotes !== undefined) {
        updateData.internalNotes = args.internalNotes
        changes.push('Interne Notizen aktualisiert')
      }

      if (changes.length === 0) {
        return { success: false, error: 'Keine Änderungen angegeben' }
      }

      // Update booking
      const [updated] = await db
        .update(bookings)
        .set(updateData)
        .where(eq(bookings.id, args.bookingId))
        .returning()

      // Log action
      await db.insert(bookingActions).values({
        bookingId: args.bookingId,
        action: 'updated',
        actorType: 'staff',
        metadata: {
          changes,
          staffId: args.staffId || null,
          notesUpdated: args.notes !== undefined,
          internalNotesUpdated: args.internalNotes !== undefined,
        },
      })

      return {
        success: true,
        data: {
          bookingId: updated.id,
          changes,
          message: `Buchung aktualisiert: ${changes.join(', ')}`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Aktualisieren der Buchung' }
    }
  },

  /**
   * Get bookings affected by a staff member's absence
   */
  async get_affected_bookings(args: {
    businessId: string
    staffId: string
    startDate: string
    endDate: string
  }) {
    try {
      const start = new Date(args.startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(args.endDate)
      end.setHours(23, 59, 59, 999)

      // Get staff info
      const staffMember = await db
        .select({ id: staff.id, name: staff.name })
        .from(staff)
        .where(and(eq(staff.id, args.staffId), eq(staff.businessId, args.businessId)))
        .limit(1)
        .then(rows => rows[0])

      if (!staffMember) {
        return { success: false, error: 'Mitarbeiter nicht gefunden' }
      }

      // Get business timezone
      const business = await db
        .select({ timezone: businesses.timezone })
        .from(businesses)
        .where(eq(businesses.id, args.businessId))
        .limit(1)
        .then(rows => rows[0])

      const timezone = business?.timezone || 'Europe/Berlin'

      // Get affected bookings
      const affected = await db
        .select({
          id: bookings.id,
          startsAt: bookings.startsAt,
          endsAt: bookings.endsAt,
          status: bookings.status,
          notes: bookings.notes,
          customerName: customers.name,
          customerEmail: customers.email,
          customerPhone: customers.phone,
          customerId: customers.id,
          serviceName: services.name,
        })
        .from(bookings)
        .leftJoin(customers, eq(bookings.customerId, customers.id))
        .leftJoin(services, eq(bookings.serviceId, services.id))
        .where(and(
          eq(bookings.businessId, args.businessId),
          eq(bookings.staffId, args.staffId),
          gte(bookings.startsAt, start),
          lte(bookings.startsAt, end),
          or(
            eq(bookings.status, 'confirmed'),
            eq(bookings.status, 'pending')
          )
        ))
        .orderBy(asc(bookings.startsAt))

      const formatted = affected.map(b => ({
        bookingId: b.id,
        date: b.startsAt ? new Date(b.startsAt).toLocaleDateString('de-DE', {
          weekday: 'short', day: '2-digit', month: '2-digit', timeZone: timezone,
        }) : 'N/A',
        time: b.startsAt ? new Date(b.startsAt).toLocaleTimeString('de-DE', {
          hour: '2-digit', minute: '2-digit', timeZone: timezone,
        }) : 'N/A',
        customer: b.customerName || 'Unbekannt',
        customerEmail: b.customerEmail,
        customerPhone: b.customerPhone,
        customerId: b.customerId,
        service: b.serviceName || 'N/A',
        status: b.status,
      }))

      return {
        success: true,
        data: {
          staffName: staffMember.name,
          period: `${args.startDate} bis ${args.endDate}`,
          totalAffected: formatted.length,
          bookings: formatted,
          message: formatted.length > 0
            ? `${formatted.length} Buchung${formatted.length > 1 ? 'en' : ''} von ${staffMember.name} betroffen (${args.startDate} bis ${args.endDate})`
            : `Keine aktiven Buchungen für ${staffMember.name} in diesem Zeitraum`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Abrufen der betroffenen Buchungen' }
    }
  },

  /**
   * Block a staff member for a date range (sick leave, vacation)
   */
  async block_staff_period(args: {
    businessId: string
    staffId: string
    startDate: string
    endDate: string
    reason: string
  }) {
    try {
      // Verify staff exists
      const staffMember = await db
        .select({ id: staff.id, name: staff.name })
        .from(staff)
        .where(and(eq(staff.id, args.staffId), eq(staff.businessId, args.businessId)))
        .limit(1)
        .then(rows => rows[0])

      if (!staffMember) {
        return { success: false, error: 'Mitarbeiter nicht gefunden' }
      }

      // Calculate dates
      const start = new Date(args.startDate)
      const end = new Date(args.endDate)

      if (end < start) {
        return { success: false, error: 'Enddatum muss nach Startdatum liegen' }
      }

      // Loop from startDate to endDate, create override for each day
      let daysBlocked = 0
      const current = new Date(start)
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0]
        await createAvailabilityOverride({
          businessId: args.businessId,
          staffId: args.staffId,
          date: dateStr,
          isAvailable: false,
          reason: args.reason,
        })
        daysBlocked++
        current.setDate(current.getDate() + 1)
      }

      // Count affected bookings in that period
      const affectedCount = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(
          eq(bookings.businessId, args.businessId),
          eq(bookings.staffId, args.staffId),
          gte(bookings.startsAt, start),
          lte(bookings.startsAt, end),
          or(
            eq(bookings.status, 'confirmed'),
            eq(bookings.status, 'pending')
          )
        ))
        .then(rows => rows.length)

      return {
        success: true,
        data: {
          staffName: staffMember.name,
          period: `${args.startDate} bis ${args.endDate}`,
          daysBlocked,
          reason: args.reason,
          affectedBookings: affectedCount,
          message: `${staffMember.name} blockiert für ${daysBlocked} Tage (${args.reason}). ${affectedCount > 0 ? `⚠️ ${affectedCount} bestehende Buchung${affectedCount > 1 ? 'en' : ''} betroffen — bitte umplanen oder stornieren!` : 'Keine bestehenden Buchungen betroffen.'}`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Blockieren des Zeitraums' }
    }
  },

  /**
   * Create a new service
   */
  async create_service(args: {
    businessId: string
    name: string
    durationMinutes: number
    description?: string
    category?: string
    price?: string
    bufferMinutes?: number
    capacity?: number
  }) {
    try {
      const service = await createService({
        businessId: args.businessId,
        name: args.name,
        durationMinutes: args.durationMinutes,
        description: args.description || null,
        category: args.category || null,
        price: args.price || null,
        bufferMinutes: args.bufferMinutes,
        capacity: args.capacity,
      })

      return {
        success: true,
        data: {
          serviceId: service.id,
          name: service.name,
          durationMinutes: service.durationMinutes,
          price: service.price,
          category: service.category,
          bufferMinutes: service.bufferMinutes,
          capacity: service.capacity,
          message: `Dienstleistung "${service.name}" erstellt (${service.durationMinutes} Min.${service.price ? `, ${service.price} €` : ''})`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Erstellen der Dienstleistung' }
    }
  },

  /**
   * Update an existing service
   */
  async update_service(args: {
    businessId: string
    serviceId: string
    name?: string
    durationMinutes?: number
    description?: string
    category?: string
    price?: string
    bufferMinutes?: number
    isActive?: boolean
  }) {
    try {
      const existing = await getServiceById(args.serviceId, args.businessId)
      if (!existing) {
        return { success: false, error: 'Dienstleistung nicht gefunden' }
      }

      const updateData: Record<string, unknown> = {}
      const changes: string[] = []

      if (args.name !== undefined) {
        updateData.name = args.name
        changes.push(`Name: ${existing.name} → ${args.name}`)
      }
      if (args.durationMinutes !== undefined) {
        updateData.durationMinutes = args.durationMinutes
        changes.push(`Dauer: ${existing.durationMinutes} → ${args.durationMinutes} Min.`)
      }
      if (args.description !== undefined) {
        updateData.description = args.description
        changes.push('Beschreibung aktualisiert')
      }
      if (args.category !== undefined) {
        updateData.category = args.category
        changes.push(`Kategorie: ${existing.category || 'keine'} → ${args.category}`)
      }
      if (args.price !== undefined) {
        updateData.price = args.price
        changes.push(`Preis: ${existing.price || 'keiner'} → ${args.price} €`)
      }
      if (args.bufferMinutes !== undefined) {
        updateData.bufferMinutes = args.bufferMinutes
        changes.push(`Pufferzeit: ${existing.bufferMinutes} → ${args.bufferMinutes} Min.`)
      }
      if (args.isActive !== undefined) {
        updateData.isActive = args.isActive
        changes.push(`Status: ${args.isActive ? 'aktiviert' : 'deaktiviert'}`)
      }

      if (changes.length === 0) {
        return { success: false, error: 'Keine Änderungen angegeben' }
      }

      const updated = await updateService(args.serviceId, updateData)

      return {
        success: true,
        data: {
          serviceId: updated.id,
          name: updated.name,
          changes,
          message: `Dienstleistung "${updated.name}" aktualisiert: ${changes.join(', ')}`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Aktualisieren der Dienstleistung' }
    }
  },

  /**
   * Delete (soft-delete) a service
   */
  async delete_service(args: {
    businessId: string
    serviceId: string
  }) {
    try {
      const existing = await getServiceById(args.serviceId, args.businessId)
      if (!existing) {
        return { success: false, error: 'Dienstleistung nicht gefunden' }
      }

      await deleteService(args.serviceId)

      return {
        success: true,
        data: {
          serviceId: args.serviceId,
          name: existing.name,
          message: `Dienstleistung "${existing.name}" deaktiviert`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Deaktivieren der Dienstleistung' }
    }
  },

  /**
   * Create a new staff member
   */
  async create_staff(args: {
    businessId: string
    name: string
    email?: string
    phone?: string
    title?: string
    bio?: string
  }) {
    try {
      const [newStaff] = await db
        .insert(staff)
        .values({
          businessId: args.businessId,
          name: args.name,
          email: args.email || null,
          phone: args.phone || null,
          title: args.title || null,
          bio: args.bio || null,
        })
        .returning()

      return {
        success: true,
        data: {
          staffId: newStaff.id,
          name: newStaff.name,
          email: newStaff.email,
          phone: newStaff.phone,
          title: newStaff.title,
          message: `Mitarbeiter "${newStaff.name}" erstellt${newStaff.title ? ` (${newStaff.title})` : ''}`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Erstellen des Mitarbeiters' }
    }
  },

  /**
   * Update an existing staff member
   */
  async update_staff(args: {
    businessId: string
    staffId: string
    name?: string
    email?: string
    phone?: string
    title?: string
    bio?: string
    isActive?: boolean
  }) {
    try {
      // Verify staff belongs to business and is not deleted
      const existing = await db
        .select()
        .from(staff)
        .where(and(
          eq(staff.id, args.staffId),
          eq(staff.businessId, args.businessId),
          isNull(staff.deletedAt)
        ))
        .limit(1)
        .then(rows => rows[0])

      if (!existing) {
        return { success: false, error: 'Mitarbeiter nicht gefunden' }
      }

      const updateData: Record<string, unknown> = {}
      const changes: string[] = []

      if (args.name !== undefined) {
        updateData.name = args.name
        changes.push(`Name: ${existing.name} → ${args.name}`)
      }
      if (args.email !== undefined) {
        updateData.email = args.email
        changes.push(`E-Mail: ${existing.email || 'keine'} → ${args.email}`)
      }
      if (args.phone !== undefined) {
        updateData.phone = args.phone
        changes.push(`Telefon: ${existing.phone || 'keine'} → ${args.phone}`)
      }
      if (args.title !== undefined) {
        updateData.title = args.title
        changes.push(`Titel: ${existing.title || 'keiner'} → ${args.title}`)
      }
      if (args.bio !== undefined) {
        updateData.bio = args.bio
        changes.push('Bio aktualisiert')
      }
      if (args.isActive !== undefined) {
        updateData.isActive = args.isActive
        changes.push(`Status: ${args.isActive ? 'aktiviert' : 'deaktiviert'}`)
      }

      if (changes.length === 0) {
        return { success: false, error: 'Keine Änderungen angegeben' }
      }

      const [updated] = await db
        .update(staff)
        .set(updateData)
        .where(eq(staff.id, args.staffId))
        .returning()

      return {
        success: true,
        data: {
          staffId: updated.id,
          name: updated.name,
          changes,
          message: `Mitarbeiter "${updated.name}" aktualisiert: ${changes.join(', ')}`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Aktualisieren des Mitarbeiters' }
    }
  },

  /**
   * Soft-delete a staff member
   */
  async delete_staff(args: {
    businessId: string
    staffId: string
  }) {
    try {
      // Verify staff belongs to business and is not already deleted
      const existing = await db
        .select({ id: staff.id, name: staff.name })
        .from(staff)
        .where(and(
          eq(staff.id, args.staffId),
          eq(staff.businessId, args.businessId),
          isNull(staff.deletedAt)
        ))
        .limit(1)
        .then(rows => rows[0])

      if (!existing) {
        return { success: false, error: 'Mitarbeiter nicht gefunden' }
      }

      // Count future bookings for warning
      const now = new Date()
      const affectedBookings = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(
          eq(bookings.businessId, args.businessId),
          eq(bookings.staffId, args.staffId),
          gte(bookings.startsAt, now),
          or(
            eq(bookings.status, 'confirmed'),
            eq(bookings.status, 'pending')
          )
        ))
        .then(rows => rows.length)

      // Soft delete: set deletedAt and deactivate
      await db
        .update(staff)
        .set({
          deletedAt: new Date(),
          isActive: false,
        })
        .where(eq(staff.id, args.staffId))

      return {
        success: true,
        data: {
          staffId: args.staffId,
          name: existing.name,
          affectedBookings,
          message: `Mitarbeiter "${existing.name}" gelöscht${affectedBookings > 0 ? `. Achtung: ${affectedBookings} zukünftige Buchung${affectedBookings > 1 ? 'en' : ''} betroffen — bitte umplanen oder stornieren!` : ''}`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Löschen des Mitarbeiters' }
    }
  },

  /**
   * Assign a staff member to a service
   */
  async assign_staff_to_service(args: {
    businessId: string
    staffId: string
    serviceId: string
    sortOrder?: number
  }) {
    try {
      // Verify staff belongs to business
      const staffMember = await db
        .select({ id: staff.id, name: staff.name })
        .from(staff)
        .where(and(
          eq(staff.id, args.staffId),
          eq(staff.businessId, args.businessId),
          isNull(staff.deletedAt)
        ))
        .limit(1)
        .then(rows => rows[0])

      if (!staffMember) {
        return { success: false, error: 'Mitarbeiter nicht gefunden' }
      }

      // Verify service belongs to business
      const service = await getServiceById(args.serviceId, args.businessId)
      if (!service) {
        return { success: false, error: 'Dienstleistung nicht gefunden' }
      }

      // Upsert into staffServices (insert or update on conflict)
      await db
        .insert(staffServices)
        .values({
          staffId: args.staffId,
          serviceId: args.serviceId,
          sortOrder: args.sortOrder ?? 999,
          isActive: true,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [staffServices.staffId, staffServices.serviceId],
          set: {
            sortOrder: args.sortOrder ?? 999,
            isActive: true,
            updatedAt: new Date(),
          },
        })

      return {
        success: true,
        data: {
          staffId: args.staffId,
          staffName: staffMember.name,
          serviceId: args.serviceId,
          serviceName: service.name,
          sortOrder: args.sortOrder ?? 999,
          message: `${staffMember.name} der Dienstleistung "${service.name}" zugewiesen`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Zuweisen des Mitarbeiters zur Dienstleistung' }
    }
  },

  /**
   * Remove a staff-service assignment
   */
  async remove_staff_from_service(args: {
    businessId: string
    staffId: string
    serviceId: string
  }) {
    try {
      // Verify staff belongs to business
      const staffMember = await db
        .select({ id: staff.id, name: staff.name })
        .from(staff)
        .where(and(
          eq(staff.id, args.staffId),
          eq(staff.businessId, args.businessId),
          isNull(staff.deletedAt)
        ))
        .limit(1)
        .then(rows => rows[0])

      if (!staffMember) {
        return { success: false, error: 'Mitarbeiter nicht gefunden' }
      }

      // Verify service belongs to business
      const service = await getServiceById(args.serviceId, args.businessId)
      if (!service) {
        return { success: false, error: 'Dienstleistung nicht gefunden' }
      }

      // Delete the assignment
      const deleted = await db
        .delete(staffServices)
        .where(and(
          eq(staffServices.staffId, args.staffId),
          eq(staffServices.serviceId, args.serviceId)
        ))
        .returning()

      if (deleted.length === 0) {
        return { success: false, error: `${staffMember.name} ist nicht der Dienstleistung "${service.name}" zugewiesen` }
      }

      return {
        success: true,
        data: {
          staffId: args.staffId,
          staffName: staffMember.name,
          serviceId: args.serviceId,
          serviceName: service.name,
          message: `${staffMember.name} von der Dienstleistung "${service.name}" entfernt`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Entfernen der Zuweisung' }
    }
  },

  /**
   * Get availability template (weekly schedule)
   */
  async get_availability_template(args: {
    businessId: string
    staffId?: string
  }) {
    try {
      const template = await getAvailabilityTemplate(args.businessId, args.staffId)

      if (!template) {
        return {
          success: true,
          data: {
            templateId: null,
            staffId: args.staffId || null,
            schedule: [],
            message: 'Kein Wochenplan vorhanden. Verwende update_availability_template um einen zu erstellen.',
          },
        }
      }

      const slots = await getAvailabilitySlots(template.id)

      const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag']

      // Group by day
      const byDay: Record<number, Array<{ startTime: string; endTime: string }>> = {}
      for (const slot of slots) {
        if (!byDay[slot.dayOfWeek]) byDay[slot.dayOfWeek] = []
        byDay[slot.dayOfWeek].push({ startTime: slot.startTime, endTime: slot.endTime })
      }

      const schedule = dayNames.map((name, i) => ({
        day: name,
        dayOfWeek: i,
        slots: byDay[i] || [],
        isClosed: !byDay[i] || byDay[i].length === 0,
      }))

      return {
        success: true,
        data: {
          templateId: template.id,
          name: template.name,
          staffId: args.staffId || null,
          schedule,
          message: `Wochenplan${args.staffId ? ' (Mitarbeiter)' : ' (Geschäftszeiten)'}: ${slots.length} Zeitfenster an ${Object.keys(byDay).length} Tagen`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Abrufen des Wochenplans' }
    }
  },

  /**
   * Update availability template (weekly schedule)
   */
  async update_availability_template(args: {
    businessId: string
    staffId?: string
    slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }>
  }) {
    try {
      // Validate slots
      for (const slot of args.slots) {
        if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
          return { success: false, error: `Ungültiger Wochentag: ${slot.dayOfWeek}. Muss 0 (Sonntag) bis 6 (Samstag) sein.` }
        }
        if (!/^\d{2}:\d{2}$/.test(slot.startTime) || !/^\d{2}:\d{2}$/.test(slot.endTime)) {
          return { success: false, error: 'Zeitformat muss HH:MM sein (z.B. "09:00")' }
        }
        if (slot.startTime >= slot.endTime) {
          return { success: false, error: `Endzeit muss nach Startzeit liegen: ${slot.startTime} - ${slot.endTime}` }
        }
      }

      const template = await getOrCreateDefaultTemplate(args.businessId, args.staffId || null)
      await updateAvailabilityTemplateSlots(template.id, args.slots)

      const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
      const days = [...new Set(args.slots.map(s => s.dayOfWeek))].sort()
      const dayList = days.map(d => dayNames[d]).join(', ')

      return {
        success: true,
        data: {
          templateId: template.id,
          slotsCount: args.slots.length,
          activeDays: dayList,
          message: `Wochenplan aktualisiert: ${args.slots.length} Zeitfenster (${dayList})`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Aktualisieren des Wochenplans' }
    }
  },

  /**
   * Update business profile settings
   */
  async update_business_profile(args: {
    businessId: string
    name?: string
    email?: string
    phone?: string
    address?: string
    legalName?: string
    legalForm?: string
    description?: string
    tagline?: string
  }) {
    try {
      const existing = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, args.businessId))
        .limit(1)
        .then(rows => rows[0])

      if (!existing) {
        return { success: false, error: 'Unternehmen nicht gefunden' }
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      const changes: string[] = []

      if (args.name !== undefined) {
        updateData.name = args.name
        changes.push(`Name: ${existing.name} → ${args.name}`)
      }
      if (args.email !== undefined) {
        updateData.email = args.email
        changes.push(`E-Mail: ${existing.email || 'keine'} → ${args.email}`)
      }
      if (args.phone !== undefined) {
        updateData.phone = args.phone
        changes.push(`Telefon: ${existing.phone || 'keine'} → ${args.phone}`)
      }
      if (args.address !== undefined) {
        updateData.address = args.address
        changes.push(`Adresse aktualisiert`)
      }
      if (args.legalName !== undefined) {
        updateData.legalName = args.legalName
        changes.push(`Firmenname: ${existing.legalName || 'keiner'} → ${args.legalName}`)
      }
      if (args.legalForm !== undefined) {
        updateData.legalForm = args.legalForm
        changes.push(`Rechtsform: ${existing.legalForm || 'keine'} → ${args.legalForm}`)
      }
      if (args.description !== undefined) {
        updateData.description = args.description
        changes.push('Beschreibung aktualisiert')
      }
      if (args.tagline !== undefined) {
        updateData.tagline = args.tagline
        changes.push(`Tagline: ${existing.tagline || 'keine'} → ${args.tagline}`)
      }

      if (changes.length === 0) {
        return { success: false, error: 'Keine Änderungen angegeben' }
      }

      await db
        .update(businesses)
        .set(updateData)
        .where(eq(businesses.id, args.businessId))

      return {
        success: true,
        data: {
          businessId: args.businessId,
          changes,
          message: `Geschäftsprofil aktualisiert: ${changes.join(', ')}`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Aktualisieren des Geschäftsprofils' }
    }
  },

  /**
   * Update booking policy rules
   */
  async update_booking_rules(args: {
    businessId: string
    minBookingNoticeHours?: number
    maxAdvanceBookingDays?: number
    cancellationPolicyHours?: number
    requireApproval?: boolean
    requireEmailConfirmation?: boolean
    allowWaitlist?: boolean
  }) {
    try {
      const existing = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, args.businessId))
        .limit(1)
        .then(rows => rows[0])

      if (!existing) {
        return { success: false, error: 'Unternehmen nicht gefunden' }
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      const changes: string[] = []

      if (args.minBookingNoticeHours !== undefined) {
        updateData.minBookingNoticeHours = args.minBookingNoticeHours
        changes.push(`Mindestvorlaufzeit: ${existing.minBookingNoticeHours}h → ${args.minBookingNoticeHours}h`)
      }
      if (args.maxAdvanceBookingDays !== undefined) {
        updateData.maxAdvanceBookingDays = args.maxAdvanceBookingDays
        changes.push(`Max. Vorausbuchung: ${existing.maxAdvanceBookingDays} → ${args.maxAdvanceBookingDays} Tage`)
      }
      if (args.cancellationPolicyHours !== undefined) {
        updateData.cancellationPolicyHours = args.cancellationPolicyHours
        changes.push(`Stornierungsfrist: ${existing.cancellationPolicyHours}h → ${args.cancellationPolicyHours}h`)
      }
      if (args.requireApproval !== undefined) {
        updateData.requireApproval = args.requireApproval
        changes.push(`Bestätigung erforderlich: ${args.requireApproval ? 'ja' : 'nein'}`)
      }
      if (args.requireEmailConfirmation !== undefined) {
        updateData.requireEmailConfirmation = args.requireEmailConfirmation
        changes.push(`E-Mail-Bestätigung: ${args.requireEmailConfirmation ? 'ja' : 'nein'}`)
      }
      if (args.allowWaitlist !== undefined) {
        updateData.allowWaitlist = args.allowWaitlist
        changes.push(`Warteliste: ${args.allowWaitlist ? 'aktiviert' : 'deaktiviert'}`)
      }

      if (changes.length === 0) {
        return { success: false, error: 'Keine Änderungen angegeben' }
      }

      await db
        .update(businesses)
        .set(updateData)
        .where(eq(businesses.id, args.businessId))

      return {
        success: true,
        data: {
          businessId: args.businessId,
          changes,
          message: `Buchungsrichtlinien aktualisiert: ${changes.join(', ')}`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Aktualisieren der Buchungsrichtlinien' }
    }
  },

  /**
   * Update an existing knowledge entry
   */
  async update_knowledge_entry(args: {
    businessId: string
    entryId: string
    title?: string
    content?: string
    category?: string
    audience?: string
    scopeType?: string
  }) {
    try {
      // Verify entry belongs to business
      const existing = await db
        .select()
        .from(chatbotKnowledge)
        .where(and(
          eq(chatbotKnowledge.id, args.entryId),
          eq(chatbotKnowledge.businessId, args.businessId)
        ))
        .limit(1)
        .then(rows => rows[0])

      if (!existing) {
        return { success: false, error: 'Wissenseintrag nicht gefunden' }
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      const changes: string[] = []

      if (args.title !== undefined) {
        updateData.title = args.title
        changes.push(`Titel: ${existing.title || 'keiner'} → ${args.title}`)
      }
      if (args.content !== undefined) {
        updateData.content = args.content
        changes.push('Inhalt aktualisiert')
      }
      if (args.category !== undefined) {
        updateData.category = args.category
        changes.push(`Kategorie: ${existing.category || 'keine'} → ${args.category}`)
      }
      if (args.audience !== undefined) {
        updateData.audience = args.audience
        changes.push(`Zielgruppe: ${existing.audience} → ${args.audience}`)
      }
      if (args.scopeType !== undefined) {
        updateData.scopeType = args.scopeType
        changes.push(`Geltungsbereich: ${existing.scopeType} → ${args.scopeType}`)
      }

      if (changes.length === 0) {
        return { success: false, error: 'Keine Änderungen angegeben' }
      }

      // Regenerate embedding if content or title changed
      if (args.content !== undefined || args.title !== undefined) {
        const newTitle = args.title ?? existing.title ?? ''
        const newContent = args.content ?? existing.content
        const embeddingText = `${newTitle}\n\n${newContent}`
        const embeddingResult = await generateEmbeddingWithMetadata(embeddingText)

        updateData.embedding = embeddingResult.embedding
        updateData.embeddingProvider = embeddingResult.provider
        updateData.embeddingModel = embeddingResult.model
        updateData.embeddingDim = embeddingResult.dim
        updateData.preprocessVersion = embeddingResult.preprocessVersion
        updateData.contentHash = embeddingResult.contentHash
        updateData.embeddedAt = new Date()
      }

      await db
        .update(chatbotKnowledge)
        .set(updateData)
        .where(eq(chatbotKnowledge.id, args.entryId))

      return {
        success: true,
        data: {
          entryId: args.entryId,
          title: args.title ?? existing.title,
          changes,
          embeddingRegenerated: args.content !== undefined || args.title !== undefined,
          message: `Wissenseintrag aktualisiert: ${changes.join(', ')}`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Aktualisieren des Wissenseintrags' }
    }
  },

  /**
   * Delete a knowledge entry
   */
  async delete_knowledge_entry(args: {
    businessId: string
    entryId: string
  }) {
    try {
      // Verify entry belongs to business
      const existing = await db
        .select({ id: chatbotKnowledge.id, title: chatbotKnowledge.title })
        .from(chatbotKnowledge)
        .where(and(
          eq(chatbotKnowledge.id, args.entryId),
          eq(chatbotKnowledge.businessId, args.businessId)
        ))
        .limit(1)
        .then(rows => rows[0])

      if (!existing) {
        return { success: false, error: 'Wissenseintrag nicht gefunden' }
      }

      await db
        .delete(chatbotKnowledge)
        .where(eq(chatbotKnowledge.id, args.entryId))

      return {
        success: true,
        data: {
          entryId: args.entryId,
          title: existing.title,
          message: `Wissenseintrag "${existing.title || 'Ohne Titel'}" gelöscht`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Löschen des Wissenseintrags' }
    }
  },

  /**
   * Delete a customer and all related data
   */
  async delete_customer(args: {
    businessId: string
    customerId: string
  }) {
    try {
      // Verify customer belongs to business
      const customer = await db
        .select({ id: customers.id, name: customers.name, email: customers.email })
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

      // Count related records before deletion
      const bookingCount = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(eq(bookings.customerId, args.customerId))
        .then(rows => rows.length)

      const conversationCount = await db
        .select({ id: chatbotConversations.id })
        .from(chatbotConversations)
        .where(eq(chatbotConversations.customerId, args.customerId))
        .then(rows => rows.length)

      // Hard delete (CASCADE handles bookings, conversations, invoices)
      await db
        .delete(customers)
        .where(eq(customers.id, args.customerId))

      return {
        success: true,
        data: {
          customerId: args.customerId,
          customerName: customer.name,
          deletedBookings: bookingCount,
          deletedConversations: conversationCount,
          message: `Kunde "${customer.name || customer.email || 'Unbekannt'}" gelöscht (${bookingCount} Buchungen, ${conversationCount} Gespräche entfernt)`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Löschen des Kunden' }
    }
  },

  /**
   * Update staff priority order for a service
   */
  async update_staff_service_priority(args: {
    businessId: string
    serviceId: string
    staffPriority: Array<{ staffId: string; sortOrder: number }>
  }) {
    try {
      // Verify service belongs to business
      const service = await getServiceById(args.serviceId, args.businessId)
      if (!service) {
        return { success: false, error: 'Dienstleistung nicht gefunden' }
      }

      // Update each staff-service sortOrder
      const updated: string[] = []
      for (const entry of args.staffPriority) {
        const result = await db
          .update(staffServices)
          .set({ sortOrder: entry.sortOrder, updatedAt: new Date() })
          .where(and(
            eq(staffServices.staffId, entry.staffId),
            eq(staffServices.serviceId, args.serviceId)
          ))
          .returning()

        if (result.length > 0) {
          // Get staff name for message
          const staffMember = await db
            .select({ name: staff.name })
            .from(staff)
            .where(eq(staff.id, entry.staffId))
            .limit(1)
            .then(rows => rows[0])
          updated.push(`${staffMember?.name || entry.staffId}: Priorität ${entry.sortOrder}`)
        }
      }

      return {
        success: true,
        data: {
          serviceId: args.serviceId,
          serviceName: service.name,
          updatedCount: updated.length,
          priorities: updated,
          message: `Prioritäten für "${service.name}" aktualisiert: ${updated.join(', ')}`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Aktualisieren der Prioritäten' }
    }
  },

  /**
   * Classify an uploaded document (audience, scope, dataClass)
   */
  async classify_uploaded_document(args: {
    businessId: string
    documentId: string
    audience: string
    dataClass: string
    scopeType?: string
    scopeId?: string
    containsPii?: boolean
  }) {
    try {
      // Verify document exists and belongs to business
      const document = await db
        .select({
          id: documents.id,
          title: documents.title,
          dataClass: documents.dataClass,
          businessId: documents.businessId,
        })
        .from(documents)
        .where(and(
          eq(documents.id, args.documentId),
          eq(documents.businessId, args.businessId)
        ))
        .limit(1)
        .then(rows => rows[0])

      if (!document) {
        return { success: false, error: 'Dokument nicht gefunden' }
      }

      const previousDataClass = document.dataClass

      // Update document classification
      const updateData: Record<string, unknown> = {
        audience: args.audience,
        dataClass: args.dataClass,
        updatedAt: new Date(),
      }
      if (args.scopeType) updateData.scopeType = args.scopeType
      if (args.scopeId) updateData.scopeId = args.scopeId
      if (args.containsPii !== undefined) updateData.containsPii = args.containsPii

      await db
        .update(documents)
        .set(updateData)
        .where(eq(documents.id, args.documentId))

      // If switching from stored_only → knowledge, queue for ingestion
      if (args.dataClass === 'knowledge' && previousDataClass === 'stored_only') {
        // Find the latest version's ingestion job
        const latestVersion = await db
          .select({ id: documentVersions.id })
          .from(documentVersions)
          .where(eq(documentVersions.documentId, args.documentId))
          .orderBy(desc(documentVersions.version))
          .limit(1)
          .then(rows => rows[0])

        if (latestVersion) {
          await db
            .update(ingestionJobs)
            .set({
              status: 'queued',
              stage: 'uploaded',
              updatedAt: new Date(),
            })
            .where(eq(ingestionJobs.documentVersionId, latestVersion.id))
        }
      }

      return {
        success: true,
        data: {
          documentId: args.documentId,
          title: document.title,
          audience: args.audience,
          dataClass: args.dataClass,
          scopeType: args.scopeType || 'global',
          willBeIndexed: args.dataClass === 'knowledge',
          message: `Dokument "${document.title}" klassifiziert: ${args.audience}, ${args.dataClass}${args.dataClass === 'knowledge' && previousDataClass === 'stored_only' ? ' — wird jetzt indexiert' : ''}`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Klassifizieren des Dokuments' }
    }
  },

  /**
   * Send email with file attachments from R2
   */
  async send_email_with_attachments(args: {
    businessId: string
    customerId: string
    subject: string
    body: string
    attachmentR2Keys?: Array<{ r2Key: string; filename: string }>
  }) {
    try {
      // Look up customer
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
        return { success: false, error: 'Kunde hat keine E-Mail-Adresse hinterlegt' }
      }

      // Look up business name
      const business = await db
        .select({ name: businesses.name })
        .from(businesses)
        .where(eq(businesses.id, args.businessId))
        .limit(1)
        .then(rows => rows[0])

      // Download attachments from R2
      const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = []

      if (args.attachmentR2Keys && args.attachmentR2Keys.length > 0) {
        for (const att of args.attachmentR2Keys) {
          try {
            const content = await downloadFile(att.r2Key)
            const contentType = att.filename.toLowerCase().endsWith('.pdf')
              ? 'application/pdf'
              : 'application/octet-stream'
            attachments.push({
              filename: att.filename,
              content,
              contentType,
            })
          } catch (dlError) {
            log.error(`Failed to download ${att.r2Key}:`, dlError)
            return {
              success: false,
              error: `Datei "${att.filename}" konnte nicht geladen werden`,
            }
          }
        }
      }

      // Send email
      await sendCustomEmail({
        to: customer.email,
        subject: args.subject,
        body: args.body,
        customerName: customer.name || undefined,
        businessName: business?.name || undefined,
        attachments,
      })

      return {
        success: true,
        data: {
          customerName: customer.name,
          email: customer.email,
          attachmentCount: attachments.length,
          message: `E-Mail an ${customer.name} gesendet${attachments.length > 0 ? ` mit ${attachments.length} Anhang${attachments.length > 1 ? 'en' : ''}` : ''}`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Senden der E-Mail mit Anhängen' }
    }
  },

  // ============================================
  // INVOICE, LIEFERSCHEIN & DOWNLOAD HANDLERS
  // ============================================

  /**
   * Create a draft invoice for a booking
   */
  async create_invoice(args: {
    businessId: string
    bookingId: string
  }) {
    try {
      // Verify booking belongs to business
      const booking = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(eq(bookings.id, args.bookingId), eq(bookings.businessId, args.businessId)))
        .limit(1)
        .then(rows => rows[0])

      if (!booking) {
        return { success: false, error: 'Buchung nicht gefunden' }
      }

      const invoice = await createInvoiceForBooking(args.bookingId)

      return {
        success: true,
        data: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          total: invoice.total,
          status: invoice.status,
          message: `Rechnung ${invoice.invoiceNumber} erstellt (Entwurf, ${invoice.total} €)`,
        },
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
      log.error('Error:', error)
      if (msg.includes('already exists') || msg.includes('bereits')) {
        return { success: false, error: 'Für diese Buchung existiert bereits eine aktive Rechnung. Verwende get_booking_documents um sie zu finden.' }
      }
      if (msg.includes('address') || msg.includes('Adresse')) {
        return { success: false, error: 'Kunde hat keine Adresse hinterlegt. Bitte zuerst mit update_customer ergänzen.' }
      }
      return { success: false, error: `Fehler beim Erstellen der Rechnung: ${msg}` }
    }
  },

  /**
   * Send an invoice (draft → sent)
   */
  async send_invoice(args: {
    businessId: string
    invoiceId: string
  }) {
    try {
      // Verify invoice belongs to business
      const result = await getInvoiceById(args.invoiceId)
      if (!result || result.invoice.businessId !== args.businessId) {
        return { success: false, error: 'Rechnung nicht gefunden' }
      }

      const invoice = await sendInvoice(args.invoiceId)

      return {
        success: true,
        data: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          sentAt: invoice.sentAt,
          message: `Rechnung ${invoice.invoiceNumber} versendet`,
        },
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
      log.error('Error:', error)
      if (msg.includes('draft') || msg.includes('Entwurf')) {
        return { success: false, error: 'Nur Rechnungen im Status "Entwurf" können versendet werden.' }
      }
      if (msg.includes('email') || msg.includes('E-Mail')) {
        return { success: false, error: 'Kunde hat keine E-Mail-Adresse. Bitte zuerst mit update_customer ergänzen.' }
      }
      return { success: false, error: `Fehler beim Versenden der Rechnung: ${msg}` }
    }
  },

  /**
   * Mark an invoice as paid
   */
  async mark_invoice_paid(args: {
    businessId: string
    invoiceId: string
    paymentMethod?: string
    paymentReference?: string
  }) {
    try {
      const result = await getInvoiceById(args.invoiceId)
      if (!result || result.invoice.businessId !== args.businessId) {
        return { success: false, error: 'Rechnung nicht gefunden' }
      }

      const invoice = await markInvoicePaid(args.invoiceId, undefined, {
        paymentMethod: args.paymentMethod,
        paymentReference: args.paymentReference,
      })

      return {
        success: true,
        data: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          paidAt: invoice.paidAt,
          message: `Rechnung ${invoice.invoiceNumber} als bezahlt markiert${args.paymentMethod ? ` (${args.paymentMethod})` : ''}`,
        },
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
      log.error('Error:', error)
      if (msg.includes('sent') || msg.includes('versendet')) {
        return { success: false, error: 'Nur versendete Rechnungen können als bezahlt markiert werden.' }
      }
      return { success: false, error: `Fehler beim Markieren als bezahlt: ${msg}` }
    }
  },

  /**
   * Cancel an invoice and create a Stornorechnung
   */
  async cancel_invoice_storno(args: {
    businessId: string
    invoiceId: string
    reason?: string
  }) {
    try {
      const result = await getInvoiceById(args.invoiceId)
      if (!result || result.invoice.businessId !== args.businessId) {
        return { success: false, error: 'Rechnung nicht gefunden' }
      }

      const { cancelled, storno } = await cancelInvoiceWithStorno(args.invoiceId, undefined, args.reason)

      return {
        success: true,
        data: {
          cancelledInvoiceId: cancelled.id,
          cancelledInvoiceNumber: cancelled.invoiceNumber,
          stornoInvoiceId: storno.id,
          stornoInvoiceNumber: storno.invoiceNumber,
          message: `Rechnung ${cancelled.invoiceNumber} storniert. Stornorechnung ${storno.invoiceNumber} erstellt.`,
        },
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
      log.error('Error:', error)
      if (msg.includes('storno') || msg.includes('Storno')) {
        return { success: false, error: 'Diese Rechnung ist bereits eine Stornorechnung und kann nicht erneut storniert werden.' }
      }
      if (msg.includes('sent') || msg.includes('paid') || msg.includes('status')) {
        return { success: false, error: 'Nur versendete oder bezahlte Rechnungen können storniert werden.' }
      }
      return { success: false, error: `Fehler bei der Stornierung: ${msg}` }
    }
  },

  /**
   * Create a replacement invoice after cancellation
   */
  async create_replacement_invoice(args: {
    businessId: string
    bookingId: string
    cancelledInvoiceId: string
  }) {
    try {
      // Verify booking belongs to business
      const booking = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(eq(bookings.id, args.bookingId), eq(bookings.businessId, args.businessId)))
        .limit(1)
        .then(rows => rows[0])

      if (!booking) {
        return { success: false, error: 'Buchung nicht gefunden' }
      }

      // Verify cancelled invoice belongs to business and is cancelled
      const cancelledResult = await getInvoiceById(args.cancelledInvoiceId)
      if (!cancelledResult || cancelledResult.invoice.businessId !== args.businessId) {
        return { success: false, error: 'Stornierte Rechnung nicht gefunden' }
      }
      if (cancelledResult.invoice.status !== 'cancelled') {
        return { success: false, error: 'Die angegebene Rechnung ist nicht storniert. Bitte zuerst cancel_invoice_storno verwenden.' }
      }

      const invoice = await createReplacementInvoice(args.bookingId, args.cancelledInvoiceId)

      return {
        success: true,
        data: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          total: invoice.total,
          status: invoice.status,
          replacesInvoiceId: args.cancelledInvoiceId,
          message: `Ersatzrechnung ${invoice.invoiceNumber} erstellt (${invoice.total} €, ersetzt ${cancelledResult.invoice.invoiceNumber})`,
        },
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
      log.error('Error:', error)
      return { success: false, error: `Fehler beim Erstellen der Ersatzrechnung: ${msg}` }
    }
  },

  /**
   * Generate a Lieferschein PDF for a booking
   */
  async generate_lieferschein(args: {
    businessId: string
    bookingId: string
  }) {
    try {
      // Verify booking belongs to business
      const booking = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(eq(bookings.id, args.bookingId), eq(bookings.businessId, args.businessId)))
        .limit(1)
        .then(rows => rows[0])

      if (!booking) {
        return { success: false, error: 'Buchung nicht gefunden' }
      }

      const r2Key = await generateAndUploadLieferschein(args.bookingId)

      return {
        success: true,
        data: {
          bookingId: args.bookingId,
          hasLieferschein: true,
          message: `Lieferschein erstellt und gespeichert. Verwende get_download_link(documentType: "lieferschein", documentId: "${args.bookingId}") für den Download-Link.`,
        },
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unbekannter Fehler'
      log.error('Error:', error)
      if (msg.includes('Positionen') || msg.includes('items')) {
        return { success: false, error: 'Keine Positionen vorhanden. Bitte zuerst Positionen mit update_booking_items hinzufügen.' }
      }
      return { success: false, error: `Fehler beim Erstellen des Lieferscheins: ${msg}` }
    }
  },

  /**
   * Update booking line items (add, replace, remove)
   */
  async update_booking_items(args: {
    businessId: string
    bookingId: string
    action: string
    items?: Array<{ description: string; quantity: number; unitPrice: string }>
    removeIndices?: number[]
  }) {
    try {
      // Verify booking belongs to business
      const booking = await db
        .select({
          id: bookings.id,
          items: bookings.items,
        })
        .from(bookings)
        .where(and(eq(bookings.id, args.bookingId), eq(bookings.businessId, args.businessId)))
        .limit(1)
        .then(rows => rows[0])

      if (!booking) {
        return { success: false, error: 'Buchung nicht gefunden' }
      }

      const currentItems: InvoiceLineItem[] = (booking.items as InvoiceLineItem[] | null) || []

      // Compute total for new items
      const computeTotal = (item: { quantity: number; unitPrice: string }): string => {
        return (item.quantity * parseFloat(item.unitPrice)).toFixed(2)
      }

      let updatedItems: InvoiceLineItem[]

      switch (args.action) {
        case 'add': {
          if (!args.items || args.items.length === 0) {
            return { success: false, error: 'Keine Positionen zum Hinzufügen angegeben' }
          }
          const newItems: InvoiceLineItem[] = args.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: computeTotal(item),
          }))
          updatedItems = [...currentItems, ...newItems]
          break
        }
        case 'replace': {
          if (!args.items || args.items.length === 0) {
            return { success: false, error: 'Keine Positionen zum Ersetzen angegeben' }
          }
          updatedItems = args.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: computeTotal(item),
          }))
          break
        }
        case 'remove': {
          if (!args.removeIndices || args.removeIndices.length === 0) {
            return { success: false, error: 'Keine Indizes zum Entfernen angegeben' }
          }
          const indicesToRemove = new Set(args.removeIndices)
          updatedItems = currentItems.filter((_, i) => !indicesToRemove.has(i))
          break
        }
        default:
          return { success: false, error: `Unbekannte Aktion: ${args.action}. Verwende "add", "replace" oder "remove".` }
      }

      // Compute grand total
      const grandTotal = updatedItems.reduce((sum, item) => sum + parseFloat(item.total), 0).toFixed(2)

      // Write back to booking
      await db
        .update(bookings)
        .set({ items: updatedItems, updatedAt: new Date() })
        .where(eq(bookings.id, args.bookingId))

      // Log action
      await db.insert(bookingActions).values({
        bookingId: args.bookingId,
        action: 'items_updated',
        actorType: 'staff',
        metadata: {
          actionType: args.action,
          itemCount: updatedItems.length,
          grandTotal,
        },
      })

      return {
        success: true,
        data: {
          bookingId: args.bookingId,
          items: updatedItems,
          itemCount: updatedItems.length,
          grandTotal,
          message: `Positionen aktualisiert (${args.action}): ${updatedItems.length} Position${updatedItems.length !== 1 ? 'en' : ''}, Gesamt: ${grandTotal} €`,
        },
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Aktualisieren der Positionen' }
    }
  },

  /**
   * Get a presigned download link for an invoice or Lieferschein PDF
   */
  async get_download_link(args: {
    businessId: string
    documentType: string
    documentId: string
  }) {
    try {
      if (args.documentType === 'invoice') {
        // Get invoice and verify ownership
        const result = await getInvoiceById(args.documentId)
        if (!result || result.invoice.businessId !== args.businessId) {
          return { success: false, error: 'Rechnung nicht gefunden' }
        }

        // Auto-generate PDF if missing
        let r2Key = result.invoice.pdfR2Key
        if (!r2Key) {
          r2Key = await generateAndUploadInvoicePdf(args.documentId)
        }

        const url = await getDownloadUrl(r2Key)
        const filename = `${result.invoice.invoiceNumber}.pdf`

        return {
          success: true,
          data: {
            url,
            filename,
            message: `Download-Link erstellt. Verwende in der Antwort: [DOWNLOAD:${url}|${filename}]`,
          },
        }
      } else if (args.documentType === 'lieferschein') {
        // Get booking and verify ownership
        const booking = await db
          .select({
            id: bookings.id,
            lieferscheinR2Key: bookings.lieferscheinR2Key,
          })
          .from(bookings)
          .where(and(eq(bookings.id, args.documentId), eq(bookings.businessId, args.businessId)))
          .limit(1)
          .then(rows => rows[0])

        if (!booking) {
          return { success: false, error: 'Buchung nicht gefunden' }
        }

        if (!booking.lieferscheinR2Key) {
          return { success: false, error: 'Kein Lieferschein vorhanden. Verwende generate_lieferschein zuerst.' }
        }

        const url = await getDownloadUrl(booking.lieferscheinR2Key)
        const filename = `Lieferschein-${args.documentId.substring(0, 8)}.pdf`

        return {
          success: true,
          data: {
            url,
            filename,
            message: `Download-Link erstellt. Verwende in der Antwort: [DOWNLOAD:${url}|${filename}]`,
          },
        }
      } else {
        return { success: false, error: `Unbekannter Dokumenttyp: ${args.documentType}. Verwende "invoice" oder "lieferschein".` }
      }
    } catch (error) {
      log.error('Error:', error)
      return { success: false, error: 'Fehler beim Erstellen des Download-Links' }
    }
  },
}
