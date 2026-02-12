/**
 * Public/Customer Tool Handlers
 *
 * These 7 tools are available to all users (customers, staff, owners).
 */

import { db } from '@/lib/db'
import { services, staff, businesses } from '@/lib/db/schema'
import { eq, and, isNull, asc } from 'drizzle-orm'
import { getStaffForService } from '@/lib/db/queries'
import { hybridSearch, searchWithCategoryThreshold, type AccessContext } from '@/lib/search/hybrid-search'
import { updateConversationIntent } from '../../conversation'
import type { InternalAccessContext } from '../types'

/**
 * Public tool handlers
 */
export const publicHandlers = {
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
  async get_available_services(args: { businessId: string; _conversationId?: string }) {
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

    // Track intent: customer is browsing services
    if (args._conversationId) {
      updateConversationIntent(args._conversationId, {
        state: 'browsing_services',
      }).catch(err => console.error('[Intent] Failed to update:', err))
    }

    return {
      success: true,
      data: servicesList,
    }
  },

  /**
   * Get available staff for a business
   */
  async get_available_staff(args: { businessId: string; serviceId?: string }) {
    if (args.serviceId) {
      // Use existing query that joins staff_services
      const staffList = await getStaffForService(args.serviceId, args.businessId)
      return { success: true, data: staffList }
    }

    // Fallback: all active, non-deleted staff (no service filter)
    const staffList = await db
      .select({
        id: staff.id,
        name: staff.name,
        title: staff.title,
      })
      .from(staff)
      .where(and(
        eq(staff.businessId, args.businessId),
        eq(staff.isActive, true),
        isNull(staff.deletedAt)
      ))
      .orderBy(asc(staff.name))

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
    _conversationId?: string
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

      // Define slot type for availability API response
      interface AvailabilitySlot {
        available: boolean
        start: string
        end: string
        recommendedStaffId?: string
        recommendedStaffName?: string
      }

      // Format slots (show all available slots, limit to first 20 for performance) WITH INDICES
      // IMPORTANT: Include serviceId and staffId so AI can directly call create_hold
      const slots = (data.slots || []) as AvailabilitySlot[]
      const availableSlots = slots
        .filter((s) => s.available)
        .slice(0, 20)  // Increased from 6 to 20 to show more options
        .map((s, index: number) => ({
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

      // Track intent: customer is checking availability
      if (args._conversationId) {
        // Get service name for context
        const service = await db
          .select({ name: services.name })
          .from(services)
          .where(eq(services.id, args.serviceId))
          .limit(1)
          .then(rows => rows[0])

        updateConversationIntent(args._conversationId, {
          state: 'checking_availability',
          serviceId: args.serviceId,
          serviceName: service?.name,
          selectedDate: args.date,
        }).catch(err => console.error('[Intent] Failed to update:', err))
      }

      const totalAvailable = slots.filter((s) => s.available).length

      return {
        success: true,
        data: {
          date: args.date,
          timezone,
          slotsFound: availableSlots.length,
          totalSlotsAvailable: totalAvailable,
          slots: availableSlots,
          message: availableSlots.length > 0
            ? `${availableSlots.length} freie Termine angezeigt${totalAvailable > availableSlots.length ? ` (von insgesamt ${totalAvailable} verfügbaren)` : ''} (Zeiten in ${timezone}). Zeigen Sie die Slots mit Nummern an (z.B. "Slot 1: 07:00 Uhr").`
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
    _conversationId?: string
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
      try {
        const timestamp = new Date(args.startsAt)
        if (isNaN(timestamp.getTime())) {
          return {
            success: false,
            error: 'Ungültiges Zeitformat. Bitte prüfen Sie erneut die Verfügbarkeit.',
            code: 'INVALID_TIMESTAMP',
          }
        }
      } catch {
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

      // Use server-assigned staffId (may differ from args.staffId due to auto-assignment)
      const assignedStaffId = data.staffId || args.staffId || null

      console.log('[create_hold] SUCCESS - Hold created:', data.holdId, 'staffId:', assignedStaffId)

      // Track intent: hold is active, customer needs to provide details
      if (args._conversationId) {
        // Get service name for context
        const service = await db
          .select({ name: services.name })
          .from(services)
          .where(eq(services.id, args.serviceId))
          .limit(1)
          .then(rows => rows[0])

        // Get staff name from the assigned staff (server may have auto-assigned)
        let staffName: string | undefined
        if (assignedStaffId) {
          const staffMember = await db
            .select({ name: staff.name })
            .from(staff)
            .where(eq(staff.id, assignedStaffId))
            .limit(1)
            .then(rows => rows[0])
          staffName = staffMember?.name
        }

        updateConversationIntent(args._conversationId, {
          state: 'hold_active',
          holdId: data.holdId,
          holdExpiresAt: data.expiresAt,
          serviceId: args.serviceId,
          serviceName: service?.name,
          selectedSlot: {
            start: args.startsAt,
            staffId: assignedStaffId,
            staffName,
          },
        }).catch(err => console.error('[Intent] Failed to update:', err))
      }

      return {
        success: true,
        data: {
          holdId: data.holdId,
          expiresAt: data.expiresAt,
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          staffId: assignedStaffId,
          expiresInMinutes: 5,
        },
        nextStep: 'WICHTIG: Der Termin ist NOCH NICHT gebucht — nur für 5 Minuten reserviert. Du MUSST jetzt Name, E-Mail und Telefon des Kunden erfragen und dann confirm_booking() aufrufen, um die Buchung abzuschließen.',
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
    _conversationId?: string
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
          // Reset intent on hold expiry
          if (args._conversationId) {
            updateConversationIntent(args._conversationId, {
              state: 'idle',
              holdId: undefined,
              holdExpiresAt: undefined,
            }).catch(err => console.error('[Intent] Failed to update:', err))
          }
          return {
            success: false,
            error: 'Reservierung abgelaufen. Bitte wählen Sie einen neuen Termin.',
            code: 'HOLD_EXPIRED',
          }
        }
        return { success: false, error: data.error || 'Failed to confirm booking' }
      }

      // Track intent: booking completed, reset to idle
      if (args._conversationId) {
        updateConversationIntent(args._conversationId, {
          state: 'idle',
          holdId: undefined,
          holdExpiresAt: undefined,
          serviceId: undefined,
          serviceName: undefined,
          selectedDate: undefined,
          selectedSlot: undefined,
          customerData: undefined,
        }).catch(err => console.error('[Intent] Failed to update:', err))
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
   * Search knowledge base using modern hybrid search (vector + keyword)
   * Combines semantic understanding with exact keyword matching for best results
   *
   * Phase 1: Now respects access context for audience/scope filtering
   * - Customer mode: only public + global documents
   * - Staff/Owner mode: public + internal, with customer-scoped access
   */
  async search_knowledge_base(args: {
    businessId: string
    query: string
    category?: string
    limit?: number
    // Internal: injected by conversation handler (not from AI)
    _accessContext?: InternalAccessContext
  }) {
    const { businessId, query, category, limit = 5, _accessContext } = args

    try {
      // Build access context for search (Phase 1)
      const accessContext: AccessContext | undefined = _accessContext ? {
        businessId,
        actorType: _accessContext.actorType,
        actorId: _accessContext.actorId,
        customerScopeId: _accessContext.customerScopeId,
      } : undefined

      console.log(`[TOOL] Hybrid search: "${query}" (category: ${category || 'all'}, actorType: ${_accessContext?.actorType || 'customer'})`)

      // Use category-specific thresholds if category is provided
      const results = category
        ? await searchWithCategoryThreshold(businessId, query, category, accessContext)
        : await hybridSearch(businessId, query, {
            limit,
            minScore: 0.5,
            accessContext,
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

  /**
   * Request GDPR data deletion via email confirmation flow
   */
  async request_data_deletion(args: { businessId: string; customerEmail: string }) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.hebelki.de'
      const response = await fetch(`${baseUrl}/api/gdpr/request-deletion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: args.customerEmail,
          businessId: args.businessId,
        }),
      })

      if (!response.ok) {
        return {
          success: false,
          error: 'Fehler beim Erstellen der Löschanfrage. Bitte versuchen Sie es später erneut.',
        }
      }

      return {
        success: true,
        data: {
          message: 'Falls ein Konto mit dieser E-Mail existiert, wird eine Bestätigungs-E-Mail gesendet. Der Kunde muss die Löschung per Link in der E-Mail bestätigen. Der Link ist 7 Tage gültig.',
        },
      }
    } catch (error) {
      console.error('[request_data_deletion] Error:', error)
      return {
        success: false,
        error: 'Fehler bei der Verarbeitung der Löschanfrage.',
      }
    }
  },
}
