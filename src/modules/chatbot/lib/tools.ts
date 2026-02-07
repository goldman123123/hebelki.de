/**
 * Chatbot Tool Definitions
 *
 * Defines functions the AI can call to interact with the booking system.
 */

import type { Tool } from './openrouter'
import { db } from '@/lib/db'
import { services, staff, customers, bookings, businesses, chatbotConversations, chatbotMessages, bookingActions } from '@/lib/db/schema'
import { eq, and, desc, or, ilike, gte, lte } from 'drizzle-orm'
import { hybridSearch, searchWithCategoryThreshold, type AccessContext } from '@/lib/search/hybrid-search'
import { updateConversationIntent } from './conversation'
import { sendEmail, sendCustomEmail } from '@/lib/email'

/**
 * Internal access context passed by conversation handler (Phase 1)
 * This is injected server-side and cannot be overridden by AI
 */
interface InternalAccessContext {
  actorType: 'customer' | 'staff' | 'owner'
  actorId?: string
  customerScopeId?: string
}

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
  {
    type: 'function',
    function: {
      name: 'search_customer_conversations',
      description: '[NUR FÜR ADMINS] Durchsucht vergangene Kundengespräche. Findet Konversationen nach Kundenname, E-Mail oder Suchbegriff im Gesprächsinhalt. Beispiel: "Was haben wir mit Tom besprochen?" oder "Zeig mir alle Gespräche von letzter Woche".',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          customerName: {
            type: 'string',
            description: 'Kundenname (Teilsuche möglich)',
          },
          customerEmail: {
            type: 'string',
            description: 'Kunden-E-Mail (Teilsuche möglich)',
          },
          searchQuery: {
            type: 'string',
            description: 'Suchbegriff im Gesprächsinhalt (optional)',
          },
          daysBack: {
            type: 'number',
            description: 'Suche in den letzten X Tagen (Standard: 30)',
          },
          limit: {
            type: 'number',
            description: 'Maximale Anzahl Gespräche (Standard: 5, Max: 20)',
          },
        },
        required: ['businessId'],
        additionalProperties: false,
      },
    },
  },
  // ============================================
  // PHASE 1: NEW ADMIN TOOLS (11 total)
  // ============================================
  {
    type: 'function',
    function: {
      name: 'get_todays_bookings',
      description: '[ADMIN] Zeigt alle Buchungen für heute. Gibt eine schnelle Übersicht des Tagesplans.',
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
      name: 'get_upcoming_bookings',
      description: '[ADMIN] Zeigt Buchungen der nächsten 7 Tage (oder angegebene Tage).',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          days: {
            type: 'number',
            description: 'Anzahl der Tage in die Zukunft (Standard: 7, Max: 30)',
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
      name: 'create_booking_admin',
      description: '[ADMIN] Erstellt eine Buchung direkt ohne Hold-Flow. Für Admin-Buchungen, die sofort bestätigt werden.',
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
            description: 'Startzeit im ISO 8601 Format',
          },
          customerName: {
            type: 'string',
            description: 'Name des Kunden',
          },
          customerEmail: {
            type: 'string',
            description: 'E-Mail des Kunden',
          },
          customerPhone: {
            type: 'string',
            description: 'Telefonnummer des Kunden (optional)',
          },
          notes: {
            type: 'string',
            description: 'Zusätzliche Notizen (optional)',
          },
          sendConfirmation: {
            type: 'boolean',
            description: 'Bestätigungs-E-Mail senden (Standard: true)',
          },
        },
        required: ['businessId', 'serviceId', 'startsAt', 'customerName', 'customerEmail'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_booking_with_notification',
      description: '[ADMIN] Storniert eine Buchung und benachrichtigt den Kunden per E-Mail.',
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
          reason: {
            type: 'string',
            description: 'Grund für die Stornierung',
          },
          notifyCustomer: {
            type: 'boolean',
            description: 'Kunden per E-Mail benachrichtigen (Standard: true)',
          },
        },
        required: ['businessId', 'bookingId', 'reason'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_customer',
      description: '[ADMIN] Erstellt einen neuen Kundendatensatz.',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          name: {
            type: 'string',
            description: 'Name des Kunden',
          },
          email: {
            type: 'string',
            description: 'E-Mail des Kunden (optional)',
          },
          phone: {
            type: 'string',
            description: 'Telefonnummer des Kunden (optional)',
          },
          notes: {
            type: 'string',
            description: 'Interne Notizen (optional)',
          },
        },
        required: ['businessId', 'name'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_customers',
      description: '[ADMIN] Sucht Kunden nach Name, E-Mail oder Telefon.',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          query: {
            type: 'string',
            description: 'Suchbegriff (Name, E-Mail oder Telefon)',
          },
          limit: {
            type: 'number',
            description: 'Maximale Anzahl Ergebnisse (Standard: 10)',
          },
        },
        required: ['businessId', 'query'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_customer_bookings',
      description: '[ADMIN] Zeigt alle Buchungen eines Kunden.',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          customerId: {
            type: 'string',
            description: 'Die ID des Kunden',
          },
          includeCompleted: {
            type: 'boolean',
            description: 'Abgeschlossene Buchungen einschließen (Standard: true)',
          },
        },
        required: ['businessId', 'customerId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_email_to_customer',
      description: '[ADMIN] Sendet eine benutzerdefinierte E-Mail an einen Kunden.',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          customerId: {
            type: 'string',
            description: 'Die ID des Kunden',
          },
          subject: {
            type: 'string',
            description: 'Betreff der E-Mail',
          },
          body: {
            type: 'string',
            description: 'Text der E-Mail',
          },
        },
        required: ['businessId', 'customerId', 'subject', 'body'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'resend_booking_confirmation',
      description: '[ADMIN] Sendet die Buchungsbestätigung erneut an den Kunden.',
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
        },
        required: ['businessId', 'bookingId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_daily_summary',
      description: '[ADMIN/OWNER] Zeigt Tagesübersicht mit Statistiken: Buchungen, Umsatz, No-Shows.',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          date: {
            type: 'string',
            description: 'Datum im Format YYYY-MM-DD (Standard: heute)',
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
      name: 'get_escalated_conversations',
      description: '[ADMIN/OWNER] Zeigt eskalierte Gespräche, die menschliche Aufmerksamkeit brauchen.',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          limit: {
            type: 'number',
            description: 'Maximale Anzahl Ergebnisse (Standard: 10)',
          },
        },
        required: ['businessId'],
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

      console.log('[create_hold] SUCCESS - Hold created:', data.holdId)

      // Track intent: hold is active, customer needs to provide details
      if (args._conversationId) {
        // Get service name for context
        const service = await db
          .select({ name: services.name })
          .from(services)
          .where(eq(services.id, args.serviceId))
          .limit(1)
          .then(rows => rows[0])

        // Get staff name if staffId provided
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

        updateConversationIntent(args._conversationId, {
          state: 'hold_active',
          holdId: data.holdId,
          holdExpiresAt: data.expiresAt,
          serviceId: args.serviceId,
          serviceName: service?.name,
          selectedSlot: {
            start: args.startsAt,
            staffId: args.staffId,
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
      console.error('[search_customer_conversations] Error:', error)
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
      console.error('[get_todays_bookings] Error:', error)
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
      console.error('[get_upcoming_bookings] Error:', error)
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
          console.error('[create_booking_admin] Email error:', emailError)
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
      console.error('[create_booking_admin] Error:', error)
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
          console.error('[cancel_booking_with_notification] Email error:', emailError)
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
      console.error('[cancel_booking_with_notification] Error:', error)
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
      console.error('[create_customer] Error:', error)
      return { success: false, error: 'Fehler beim Erstellen des Kunden' }
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
      console.error('[search_customers] Error:', error)
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
      console.error('[get_customer_bookings] Error:', error)
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
      console.error('[send_email_to_customer] Error:', error)
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
      console.error('[resend_booking_confirmation] Error:', error)
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
      console.error('[get_daily_summary] Error:', error)
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
      console.error('[get_escalated_conversations] Error:', error)
      return { success: false, error: 'Fehler beim Abrufen der eskalierten Gespräche' }
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
