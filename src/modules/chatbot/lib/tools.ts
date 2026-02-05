/**
 * Chatbot Tool Definitions
 *
 * Defines functions the AI can call to interact with the booking system.
 */

import type { Tool } from './openrouter'
import { db } from '@/lib/db'
import { services, staff, customers, bookings, businesses } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { hybridSearch, searchWithCategoryThreshold } from '@/lib/search/hybrid-search'

/**
 * Tool definitions for OpenRouter function calling
 */
export const tools: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'get_current_date',
      description: 'Ruft das aktuelle Datum vom Server ab. IMMER ZUERST AUFRUFEN wenn du Termine prüfen oder "morgen" berechnen musst! Gibt Daten in der Zeitzone des Unternehmens zurück.',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens (für korrekte Zeitzone)',
          },
        },
        required: ['businessId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_available_services',
      description: 'Ruft die verfügbaren Dienstleistungen für ein Unternehmen ab. Verwenden Sie dies, um dem Kunden die Behandlungsoptionen zu zeigen.',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
        },
        required: ['businessId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_available_staff',
      description: 'Ruft die verfügbaren Mitarbeiter für ein Unternehmen ab.',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          serviceId: {
            type: 'string',
            description: 'Die ID der Dienstleistung (optional, um nur qualifizierte Mitarbeiter anzuzeigen)',
          },
        },
        required: ['businessId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description: 'Prüft verfügbare Zeitfenster für einen bestimmten Service und optional einen bestimmten Mitarbeiter.',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          serviceId: {
            type: 'string',
            description: 'Die ID der Dienstleistung',
          },
          staffId: {
            type: 'string',
            description: 'Die ID des Mitarbeiters (optional)',
          },
          date: {
            type: 'string',
            description: 'Das gewünschte Datum im Format YYYY-MM-DD',
          },
        },
        required: ['businessId', 'serviceId', 'date'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_hold',
      description: 'Reserviert einen Zeitslot für 5 Minuten. Verwenden Sie dies NUR, wenn der Kunde einen bestimmten Zeitslot ausgewählt hat.',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          serviceId: {
            type: 'string',
            description: 'Die ID der Dienstleistung',
          },
          staffId: {
            type: 'string',
            description: 'Die ID des Mitarbeiters (optional)',
          },
          startsAt: {
            type: 'string',
            description: 'Startzeit im ISO 8601 Format (z.B. "2024-03-15T10:00:00Z")',
          },
        },
        required: ['businessId', 'serviceId', 'startsAt'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'confirm_booking',
      description: 'Bestätigt die Buchung mit Kundendaten. Verwenden Sie dies NUR NACH create_hold UND nachdem der Kunde die Details bestätigt hat.',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          holdId: {
            type: 'string',
            description: 'Die Hold-ID aus create_hold',
          },
          customerName: {
            type: 'string',
            description: 'Der vollständige Name des Kunden',
          },
          customerEmail: {
            type: 'string',
            description: 'Die E-Mail-Adresse des Kunden',
          },
          customerPhone: {
            type: 'string',
            description: 'Die Telefonnummer des Kunden (optional)',
          },
          customerTimezone: {
            type: 'string',
            description: 'Zeitzone des Kunden (z.B. "Europe/Berlin", optional)',
          },
          notes: {
            type: 'string',
            description: 'Zusätzliche Hinweise vom Kunden (optional)',
          },
        },
        required: ['businessId', 'holdId', 'customerName', 'customerEmail'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_bookings',
      description: '[NUR FÜR ADMINS] Durchsucht Buchungen. Verwenden Sie dies, um Buchungen nach Kundenname, Datum oder Status zu finden.',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          customerName: {
            type: 'string',
            description: 'Kundenname (optional, Teilsuche)',
          },
          customerEmail: {
            type: 'string',
            description: 'Kunden-E-Mail (optional)',
          },
          status: {
            type: 'string',
            description: 'Buchungsstatus (optional): pending, confirmed, cancelled, completed, no_show, all',
          },
          dateFrom: {
            type: 'string',
            description: 'Startdatum im Format YYYY-MM-DD (optional)',
          },
          dateTo: {
            type: 'string',
            description: 'Enddatum im Format YYYY-MM-DD (optional)',
          },
          limit: {
            type: 'number',
            description: 'Maximale Anzahl Ergebnisse (Standard: 10, Max: 50)',
          },
        },
        required: ['businessId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_booking_status',
      description: '[NUR FÜR ADMINS] Ändert den Status einer Buchung (bestätigen, stornieren, abschließen).',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          bookingId: {
            type: 'string',
            description: 'Die ID der Buchung',
          },
          newStatus: {
            type: 'string',
            description: 'Neuer Status: confirmed, cancelled, completed, no_show',
          },
          reason: {
            type: 'string',
            description: 'Grund für die Änderung (optional, aber empfohlen bei Stornierung)',
          },
        },
        required: ['businessId', 'bookingId', 'newStatus'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reschedule_booking',
      description: '[NUR FÜR ADMINS] Verschiebt eine Buchung auf einen neuen Zeitpunkt.',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          bookingId: {
            type: 'string',
            description: 'Die ID der Buchung',
          },
          newStartsAt: {
            type: 'string',
            description: 'Neue Startzeit im ISO 8601 Format',
          },
          reason: {
            type: 'string',
            description: 'Grund für die Verschiebung (optional)',
          },
        },
        required: ['businessId', 'bookingId', 'newStartsAt'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_knowledge_base',
      description: 'Durchsucht die Wissensdatenbank des Unternehmens mit modernster Hybrid-Suche (semantisch + Stichwortsuche). Findet relevante Informationen über FAQs, Richtlinien, Services, Öffnungszeiten, etc.',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          query: {
            type: 'string',
            description: 'Die Suchanfrage (funktioniert auch mit umgangssprachlichen Formulierungen)',
          },
          category: {
            type: 'string',
            description: 'Kategorie einschränken (optional): faq, services, pricing, policies, hours, contact, qualifications, other',
          },
        },
        required: ['businessId', 'query'],
        additionalProperties: false,
      },
    },
  },
]

/**
 * Tool execution handlers
 */
export const toolHandlers = {
  /**
   * Get current date from server in business timezone
   */
  async get_current_date(args: { businessId: string }) {
    try {
      // Fetch business to get timezone
      const business = await db
        .select({ timezone: businesses.timezone })
        .from(businesses)
        .where(eq(businesses.id, args.businessId))
        .limit(1)
        .then(rows => rows[0])

      if (!business) {
        return { success: false, error: 'Business not found' }
      }

      const timezone = business.timezone

      // Get current time in business timezone
      const now = new Date()
      const businessNow = new Date(now.toLocaleString('en-US', { timeZone: timezone }))

      // Calculate tomorrow in business timezone
      const tomorrow = new Date(businessNow)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Calculate next 7 days in business timezone
      const next7Days = []
      for (let i = 1; i <= 7; i++) {
        const futureDate = new Date(businessNow)
        futureDate.setDate(futureDate.getDate() + i)
        next7Days.push(futureDate.toISOString().split('T')[0])
      }

      return {
        success: true,
        data: {
          // Current date/time (UTC)
          nowUtc: now.toISOString(),

          // Business local time
          businessTimezoneNow: businessNow.toISOString(),
          businessDate: businessNow.toISOString().split('T')[0], // YYYY-MM-DD in business TZ
          businessTime: businessNow.toTimeString().split(' ')[0], // HH:MM:SS

          // Tomorrow in business timezone
          tomorrow: tomorrow.toISOString().split('T')[0],

          // Next 7 days (for "next available" searches) in business TZ
          next7Days,

          // Day of week info (in business timezone)
          dayOfWeek: businessNow.getDay(), // 0=Sunday, 6=Saturday
          dayName: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][businessNow.getDay()],

          // Timezone
          timezone,
        },
      }
    } catch (error) {
      console.error('[get_current_date] Error:', error)
      return { success: false, error: 'Fehler beim Abrufen des Datums' }
    }
  },

  /**
   * Get available services for a business
   */
  async get_available_services(args: { businessId: string }) {
    const servicesList = await db
      .select({
        id: services.id,
        name: services.name,
        description: services.description,
        durationMinutes: services.durationMinutes,
        price: services.price,
        category: services.category,
      })
      .from(services)
      .where(and(
        eq(services.businessId, args.businessId),
        eq(services.isActive, true)
      ))
      .orderBy(services.sortOrder)

    return {
      success: true,
      data: servicesList,
    }
  },

  /**
   * Get available staff for a business
   */
  async get_available_staff(args: { businessId: string; serviceId?: string }) {
    const staffList = await db
      .select({
        id: staff.id,
        name: staff.name,
        title: staff.title,
      })
      .from(staff)
      .where(and(
        eq(staff.businessId, args.businessId),
        eq(staff.isActive, true)
      ))

    // TODO: Filter by serviceId if provided (requires join with staff_services)

    return {
      success: true,
      data: staffList,
    }
  },

  /**
   * Check availability for a service on a specific date
   */
  async check_availability(args: {
    businessId: string
    serviceId: string
    staffId?: string
    date: string
  }) {
    try {
      // Get business slug
      const business = await db
        .select({ slug: businesses.slug })
        .from(businesses)
        .where(eq(businesses.id, args.businessId))
        .limit(1)
        .then(rows => rows[0])

      if (!business) return { success: false, error: 'Business not found' }

      // Call availability API
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005'
      const url = `${baseUrl}/api/${business.slug}/availability?serviceId=${args.serviceId}&date=${args.date}${args.staffId ? `&staffId=${args.staffId}` : ''}`

      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to fetch availability' }
      }

      // Get business timezone for display
      const businessInfo = await db
        .select({ timezone: businesses.timezone })
        .from(businesses)
        .where(eq(businesses.id, args.businessId))
        .limit(1)
        .then(rows => rows[0])

      const timezone = businessInfo?.timezone || 'Europe/Berlin'

      // Format slots (show all available slots, limit to first 20 for performance) WITH INDICES
      // IMPORTANT: Include serviceId and staffId so AI can directly call create_hold
      const availableSlots = data.slots
        ?.filter((s: any) => s.available)
        ?.slice(0, 20)  // Increased from 6 to 20 to show more options
        ?.map((s: any, index: number) => ({
          slotIndex: index + 1,  // Add numbered index (1, 2, 3, etc.)
          start: s.start,        // Keep full ISO timestamp (UTC)
          end: s.end,
          timeLabel: new Date(s.start).toLocaleString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: timezone,
          }),
          timezone, // Include timezone for reference
          serviceId: args.serviceId, // Include serviceId for easy create_hold calls
          staffId: s.recommendedStaffId || args.staffId || null, // Use recommended staff or specified staff
          staffName: s.recommendedStaffName || null,            // Include staff name for display
        }))

      return {
        success: true,
        data: {
          date: args.date,
          timezone,
          slotsFound: availableSlots?.length || 0,
          totalSlotsAvailable: data.slots?.filter((s: any) => s.available)?.length || 0,
          slots: availableSlots || [],
          message: availableSlots?.length > 0
            ? `${availableSlots.length} freie Termine angezeigt${data.slots?.filter((s: any) => s.available)?.length > availableSlots.length ? ` (von insgesamt ${data.slots.filter((s: any) => s.available).length} verfügbaren)` : ''} (Zeiten in ${timezone}). Zeigen Sie die Slots mit Nummern an (z.B. "Slot 1: 07:00 Uhr").`
            : 'Keine freien Termine an diesem Tag',
        },
      }
    } catch (error) {
      console.error('[check_availability] Error:', error)
      return { success: false, error: 'Fehler beim Abrufen der Verfügbarkeit' }
    }
  },

  /**
   * Create a hold on a time slot
   */
  async create_hold(args: {
    businessId: string
    serviceId: string
    staffId?: string
    startsAt: string
  }) {
    try {
      console.log('[create_hold] Called with args:', JSON.stringify(args, null, 2))

      // VALIDATE PAYLOAD - Check required parameters
      if (!args.businessId || !args.serviceId || !args.startsAt) {
        console.log('[create_hold] Validation failed - missing parameters')
        return {
          success: false,
          error: 'Fehlende Parameter für die Reservierung.',
          code: 'INVALID_PAYLOAD',
          details: {
            hasBusinessId: !!args.businessId,
            hasServiceId: !!args.serviceId,
            hasStartsAt: !!args.startsAt,
          },
        }
      }

      // VALIDATE TIMESTAMP FORMAT
      let timestamp: Date
      try {
        timestamp = new Date(args.startsAt)
        if (isNaN(timestamp.getTime())) {
          return {
            success: false,
            error: 'Ungültiges Zeitformat. Bitte prüfen Sie erneut die Verfügbarkeit.',
            code: 'INVALID_TIMESTAMP',
          }
        }
      } catch (e) {
        return {
          success: false,
          error: 'Zeitformat konnte nicht verarbeitet werden.',
          code: 'INVALID_TIMESTAMP',
        }
      }

      // Get business slug
      const business = await db
        .select({ slug: businesses.slug })
        .from(businesses)
        .where(eq(businesses.id, args.businessId))
        .limit(1)
        .then(rows => rows[0])

      if (!business) return { success: false, error: 'Business not found' }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005'
      const url = `${baseUrl}/api/${business.slug}/holds`

      console.log('[create_hold] Calling API:', url)
      console.log('[create_hold] Request body:', JSON.stringify({
        serviceId: args.serviceId,
        staffId: args.staffId,
        startsAt: args.startsAt,
        holdDurationMinutes: 5,
      }, null, 2))

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: args.serviceId,
          staffId: args.staffId,
          startsAt: args.startsAt,
          holdDurationMinutes: 5,
        }),
      })

      const data = await response.json()

      console.log('[create_hold] API response status:', response.status)
      console.log('[create_hold] API response data:', JSON.stringify(data, null, 2))

      if (!response.ok) {
        // CATEGORIZE API ERRORS
        if (response.status === 409) {
          return {
            success: false,
            error: 'Dieser Zeitslot ist leider nicht mehr verfügbar. Möchten Sie einen anderen Termin wählen?',
            code: 'SLOT_UNAVAILABLE',
            details: data.details || {},
          }
        }

        if (response.status === 400) {
          return {
            success: false,
            error: 'Ungültige Anfrage. Bitte versuchen Sie es erneut.',
            code: 'INVALID_REQUEST',
            details: data,
          }
        }

        return {
          success: false,
          error: data.error || 'Fehler beim Erstellen der Reservierung.',
          code: data.code || 'UNKNOWN_ERROR',
        }
      }

      console.log('[create_hold] SUCCESS - Hold created:', data.holdId)
      return {
        success: true,
        data: {
          holdId: data.holdId,
          expiresAt: data.expiresAt,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          expiresInMinutes: 5,
        },
      }
    } catch (error) {
      console.error('[create_hold] EXCEPTION caught:', error)
      console.error('[create_hold] Error details:', error instanceof Error ? error.message : String(error))
      return {
        success: false,
        error: 'Fehler beim Erstellen der Reservierung. Bitte versuchen Sie es erneut.',
        code: 'INTERNAL_ERROR',
      }
    }
  },

  /**
   * Confirm a booking with customer details
   */
  async confirm_booking(args: {
    businessId: string
    holdId: string
    customerName: string
    customerEmail: string
    customerPhone?: string
    customerTimezone?: string
    notes?: string
  }) {
    try {
      // Get business slug
      const business = await db
        .select({ slug: businesses.slug })
        .from(businesses)
        .where(eq(businesses.id, args.businessId))
        .limit(1)
        .then(rows => rows[0])

      if (!business) return { success: false, error: 'Business not found' }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3005'
      const url = `${baseUrl}/api/${business.slug}/confirm`

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holdId: args.holdId,
          customerName: args.customerName,
          customerEmail: args.customerEmail,
          customerPhone: args.customerPhone,
          customerTimezone: args.customerTimezone || 'Europe/Berlin',
          notes: args.notes,
          idempotencyKey: `${args.holdId}-${args.customerEmail}`,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.code === 'HOLD_EXPIRED') {
          return {
            success: false,
            error: 'Reservierung abgelaufen. Bitte wählen Sie einen neuen Termin.',
            code: 'HOLD_EXPIRED',
          }
        }
        return { success: false, error: data.error || 'Failed to confirm booking' }
      }

      return {
        success: true,
        data: {
          bookingId: data.bookingId,
          confirmationToken: data.confirmationToken,
          message: 'Buchung erfolgreich! Bestätigungs-E-Mail wurde gesendet.',
          // Include booking details for reference
          startsAt: data.booking?.startsAt,
          endsAt: data.booking?.endsAt,
          serviceName: data.service?.name,
          servicePrice: data.service?.price,
          staffName: data.staff?.name || null,
          staffEmail: data.staff?.email || null,
        },
      }
    } catch (error) {
      console.error('[confirm_booking] Error:', error)
      return { success: false, error: 'Fehler beim Bestätigen der Buchung' }
    }
  },

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
      const { gte, lte, like, or, sql } = await import('drizzle-orm')
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

      // Query bookings with customer data
      let results = await db
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

      // Filter by customer name/email in memory (if needed)
      if (args.customerName) {
        const searchTerm = args.customerName.toLowerCase()
        results = results.filter(b => b.customerName?.toLowerCase().includes(searchTerm))
      }

      if (args.customerEmail) {
        const searchTerm = args.customerEmail.toLowerCase()
        results = results.filter(b => b.customerEmail?.toLowerCase().includes(searchTerm))
      }

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
      console.error('[search_bookings] Error:', error)
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
      const updateData: any = {
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
      console.error('[update_booking_status] Error:', error)
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

      // Calculate new end time
      const newStartsAt = new Date(args.newStartsAt)
      const durationMinutes = booking.service?.durationMinutes || 60
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
      console.error('[reschedule_booking] Error:', error)
      return { success: false, error: 'Fehler beim Verschieben der Buchung' }
    }
  },

  /**
   * Search knowledge base using modern hybrid search (vector + keyword)
   * Combines semantic understanding with exact keyword matching for best results
   */
  async search_knowledge_base(args: {
    businessId: string
    query: string
    category?: string
    limit?: number
  }) {
    const { businessId, query, category, limit = 5 } = args

    try {
      console.log(`[TOOL] Hybrid search: "${query}" (category: ${category || 'all'})`)

      // Use category-specific thresholds if category is provided
      const results = category
        ? await searchWithCategoryThreshold(businessId, query, category)
        : await hybridSearch(businessId, query, {
            limit,
            minScore: 0.5,
          })

      console.log(`[TOOL] Found ${results.length} results (method: ${results[0]?.method || 'none'})`)

      return {
        success: true,
        data: {
          results: results.map(r => ({
            id: r.id,
            title: r.title,
            content: r.content,
            category: r.category,
            source: r.source,
            score: r.score,
          })),
          count: results.length,
          message: results.length > 0
            ? `${results.length} relevante Einträge gefunden (Hybrid-Suche: semantisch + Stichwortsuche)`
            : 'Keine passenden Einträge in der Wissensdatenbank gefunden. Bitte informieren Sie den Kunden, dass diese Information derzeit nicht verfügbar ist.',
        },
      }
    } catch (error) {
      console.error('[TOOL] Knowledge base search error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Suchfehler',
        data: {
          results: [],
          count: 0,
        },
      }
    }
  },
}

/**
 * Execute a tool call
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const handler = toolHandlers[toolName as keyof typeof toolHandlers]

  if (!handler) {
    throw new Error(`Unknown tool: ${toolName}`)
  }

  // @ts-expect-error - Dynamic tool execution
  return handler(args)
}
