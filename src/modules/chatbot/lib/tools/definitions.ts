/**
 * Chatbot Tool Definitions
 *
 * Defines functions the AI can call to interact with the booking system.
 */

import type { Tool } from '../openrouter'

/**
 * Public/Customer tool definitions
 */
export const publicToolDefs: Tool[] = [
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
      name: 'request_data_deletion',
      description: 'Startet eine DSGVO-Löschanfrage für den Kunden. Sendet eine Bestätigungs-E-Mail an die angegebene Adresse. Der Kunde muss die Löschung per E-Mail-Link bestätigen.',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          customerEmail: {
            type: 'string',
            description: 'Die E-Mail-Adresse des Kunden, der seine Daten löschen möchte',
          },
        },
        required: ['businessId', 'customerEmail'],
        additionalProperties: false,
      },
    },
  },
]

/**
 * Admin tool definitions
 */
export const adminToolDefs: Tool[] = [
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
          durationMinutes: {
            type: 'number',
            description: 'Optionale Dauer in Minuten (überschreibt Service-Standard). Verwende dies wenn der Auftrag länger/kürzer dauert als normal.',
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
      name: 'update_customer',
      description: '[ADMIN] Aktualisiert einen bestehenden Kundendatensatz (Name, E-Mail, Telefon, Notizen, Adresse).',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          customerId: {
            type: 'string',
            description: 'Die ID des zu aktualisierenden Kunden',
          },
          name: {
            type: 'string',
            description: 'Neuer Name des Kunden (optional)',
          },
          email: {
            type: 'string',
            description: 'Neue E-Mail des Kunden (optional)',
          },
          phone: {
            type: 'string',
            description: 'Neue Telefonnummer des Kunden (optional)',
          },
          notes: {
            type: 'string',
            description: 'Neue interne Notizen (optional)',
          },
          street: {
            type: 'string',
            description: 'Straße und Hausnummer (z.B. "Schlossallee 3")',
          },
          city: {
            type: 'string',
            description: 'Stadt (z.B. "Paderborn")',
          },
          postalCode: {
            type: 'string',
            description: 'Postleitzahl (z.B. "33100")',
          },
          country: {
            type: 'string',
            description: 'Land (Standard: "Deutschland")',
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
 * Assistant-only tool definitions (Virtual Assistant at /tools/assistant)
 */
export const assistantToolDefs: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'search_invoices',
      description: '[ASSISTENT] Durchsucht Rechnungen nach Kunde, Status oder Datum.',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          customerName: {
            type: 'string',
            description: 'Kundenname (Teilsuche)',
          },
          customerEmail: {
            type: 'string',
            description: 'Kunden-E-Mail',
          },
          status: {
            type: 'string',
            description: 'Rechnungsstatus: draft, sent, paid, overdue, cancelled',
          },
          dateFrom: {
            type: 'string',
            description: 'Startdatum im Format YYYY-MM-DD',
          },
          dateTo: {
            type: 'string',
            description: 'Enddatum im Format YYYY-MM-DD',
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
      name: 'get_invoice_details',
      description: '[ASSISTENT] Zeigt vollständige Rechnungsdetails mit Positionen und Storno-Kette.',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          invoiceId: {
            type: 'string',
            description: 'Die ID der Rechnung',
          },
        },
        required: ['businessId', 'invoiceId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_booking_documents',
      description: '[ASSISTENT] Zeigt Rechnung und Lieferschein-Status für eine Buchung.',
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
      name: 'get_monthly_schedule',
      description: '[ASSISTENT] Zeigt Monatsübersicht mit Buchungen, freier Kapazität pro Tag, blockierten Tagen und Auslastung. VERWENDE bei "Verfügbarkeit diesen Monat", "Wie voll ist nächste Woche", "Wann habe ich noch Platz".',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          year: {
            type: 'number',
            description: 'Das Jahr (z.B. 2026)',
          },
          month: {
            type: 'number',
            description: 'Der Monat (1-12)',
          },
        },
        required: ['businessId', 'year', 'month'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'block_day',
      description: '[ASSISTENT] Blockiert einen Tag oder Zeitraum (z.B. Betriebsurlaub, Feiertag).',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          date: {
            type: 'string',
            description: 'Das Datum im Format YYYY-MM-DD',
          },
          staffId: {
            type: 'string',
            description: 'Mitarbeiter-ID (optional, leer = alle blockieren)',
          },
          reason: {
            type: 'string',
            description: 'Grund für die Blockierung (optional)',
          },
          isAvailable: {
            type: 'boolean',
            description: 'Auf true setzen für Sonderverfügbarkeit statt Blockierung (Standard: false)',
          },
          startTime: {
            type: 'string',
            description: 'Startzeit im Format HH:MM (optional, für Teilblockierung)',
          },
          endTime: {
            type: 'string',
            description: 'Endzeit im Format HH:MM (optional, für Teilblockierung)',
          },
        },
        required: ['businessId', 'date'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_whatsapp',
      description: '[ASSISTENT] Sendet eine WhatsApp-Nachricht an einen Kunden.',
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
          message: {
            type: 'string',
            description: 'Die Nachricht, die gesendet werden soll',
          },
        },
        required: ['businessId', 'customerId', 'message'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_knowledge_entry',
      description: '[ASSISTENT] Fügt einen neuen Eintrag zur Wissensdatenbank hinzu mit Zielgruppen-Steuerung.',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          title: {
            type: 'string',
            description: 'Titel des Eintrags',
          },
          content: {
            type: 'string',
            description: 'Inhalt des Eintrags',
          },
          category: {
            type: 'string',
            description: 'Kategorie (optional): faq, services, pricing, policies, hours, contact, other',
          },
          audience: {
            type: 'string',
            description: 'Zielgruppe: public (für Kunden-Bot sichtbar) oder internal (nur für Inhaber/Mitarbeiter)',
          },
          scopeType: {
            type: 'string',
            description: 'Geltungsbereich: global (Standard), customer, staff',
          },
          scopeId: {
            type: 'string',
            description: 'ID für den Geltungsbereich (nur bei scopeType != global)',
          },
        },
        required: ['businessId', 'title', 'content', 'audience'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_booking',
      description: '[ASSISTENT] Aktualisiert Buchungsdetails: Mitarbeiterzuweisung, Notizen, interne Notizen. Verwende reschedule_booking für Zeitänderungen und update_booking_status für Statusänderungen.',
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
          staffId: {
            type: 'string',
            description: 'Neuer Mitarbeiter (optional). Muss für den Service qualifiziert sein.',
          },
          notes: {
            type: 'string',
            description: 'Kundennotizen (überschreibt bestehende)',
          },
          internalNotes: {
            type: 'string',
            description: 'Interne Notizen (überschreibt bestehende)',
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
      name: 'get_affected_bookings',
      description: '[ASSISTENT] Zeigt alle Buchungen eines Mitarbeiters in einem Zeitraum. Nützlich für Krankheitsplanung: "Welche Kunden sind betroffen wenn Mitarbeiter X ausfällt?"',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          staffId: {
            type: 'string',
            description: 'Die ID des Mitarbeiters',
          },
          startDate: {
            type: 'string',
            description: 'Startdatum (YYYY-MM-DD)',
          },
          endDate: {
            type: 'string',
            description: 'Enddatum (YYYY-MM-DD)',
          },
        },
        required: ['businessId', 'staffId', 'startDate', 'endDate'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'block_staff_period',
      description: '[ASSISTENT] Blockiert einen Mitarbeiter für einen Zeitraum (z.B. Krankheit, Urlaub). Erstellt Verfügbarkeitsüberschreibungen für jeden Tag im Zeitraum.',
      parameters: {
        type: 'object',
        properties: {
          businessId: {
            type: 'string',
            description: 'Die ID des Unternehmens',
          },
          staffId: {
            type: 'string',
            description: 'Die ID des Mitarbeiters',
          },
          startDate: {
            type: 'string',
            description: 'Startdatum (YYYY-MM-DD)',
          },
          endDate: {
            type: 'string',
            description: 'Enddatum (YYYY-MM-DD)',
          },
          reason: {
            type: 'string',
            description: 'Grund (z.B. "Krank", "Urlaub")',
          },
        },
        required: ['businessId', 'staffId', 'startDate', 'endDate', 'reason'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_service',
      description: '[ASSISTENT] Erstellt eine neue Dienstleistung. Frage den Nutzer nach: Name, Dauer (Minuten), optional Beschreibung, Kategorie, Preis, Pufferzeit.',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          name: { type: 'string', description: 'Name der Dienstleistung (2-100 Zeichen)' },
          durationMinutes: { type: 'number', description: 'Dauer in Minuten (5-480)' },
          description: { type: 'string', description: 'Beschreibung (optional, max 500 Zeichen)' },
          category: { type: 'string', description: 'Kategorie (optional, z.B. "Baumpflege", "Höhenarbeit")' },
          price: { type: 'string', description: 'Preis in EUR (optional, z.B. "150.00")' },
          bufferMinutes: { type: 'number', description: 'Pufferzeit zwischen Terminen in Minuten (optional, 0-60, Standard: 0)' },
          capacity: { type: 'number', description: 'Kapazität — gleichzeitige Buchungen (optional, Standard: 1)' },
        },
        required: ['businessId', 'name', 'durationMinutes'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_service',
      description: '[ASSISTENT] Aktualisiert eine bestehende Dienstleistung. Verwende get_available_services um die Service-ID zu finden.',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          serviceId: { type: 'string', description: 'Die ID der Dienstleistung' },
          name: { type: 'string', description: 'Neuer Name (optional)' },
          durationMinutes: { type: 'number', description: 'Neue Dauer in Minuten (optional)' },
          description: { type: 'string', description: 'Neue Beschreibung (optional)' },
          category: { type: 'string', description: 'Neue Kategorie (optional)' },
          price: { type: 'string', description: 'Neuer Preis (optional)' },
          bufferMinutes: { type: 'number', description: 'Neue Pufferzeit (optional)' },
          isActive: { type: 'boolean', description: 'Aktiv/Inaktiv setzen (optional)' },
        },
        required: ['businessId', 'serviceId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_service',
      description: '[ASSISTENT] Deaktiviert eine Dienstleistung (Soft-Delete). Verwende get_available_services um die Service-ID zu finden. Bestätige IMMER mit dem Nutzer bevor du löschst.',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          serviceId: { type: 'string', description: 'Die ID der Dienstleistung' },
        },
        required: ['businessId', 'serviceId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'classify_uploaded_document',
      description: '[ASSISTENT] Klassifiziert ein hochgeladenes Dokument: Zielgruppe, Geltungsbereich, Datenkategorie. Verwende nach dem Upload, wenn der Nutzer angibt wie das Dokument genutzt werden soll.',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          documentId: { type: 'string', description: 'Die ID des hochgeladenen Dokuments' },
          audience: { type: 'string', description: 'Zielgruppe: public (für Kunden-Bot sichtbar) oder internal (nur intern)' },
          dataClass: { type: 'string', description: 'Datenkategorie: knowledge (in Wissensdatenbank indexieren) oder stored_only (nur speichern)' },
          scopeType: { type: 'string', description: 'Geltungsbereich: global (Standard), customer, staff' },
          scopeId: { type: 'string', description: 'ID für den Geltungsbereich (Kunden- oder Mitarbeiter-ID, nur bei scopeType != global)' },
          containsPii: { type: 'boolean', description: 'Enthält personenbezogene Daten (Standard: false)' },
        },
        required: ['businessId', 'documentId', 'audience', 'dataClass'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_email_with_attachments',
      description: '[ASSISTENT] Sendet eine E-Mail mit Dateianhängen an einen Kunden. Anhänge können hochgeladene Dateien, Rechnungen oder Lieferscheine sein (über R2-Keys).',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          customerId: { type: 'string', description: 'Die ID des Kunden' },
          subject: { type: 'string', description: 'Betreff der E-Mail' },
          body: { type: 'string', description: 'Text der E-Mail' },
          attachmentR2Keys: {
            type: 'array',
            description: 'R2-Keys der anzuhängenden Dateien',
            items: {
              type: 'object',
              properties: {
                r2Key: { type: 'string', description: 'Der R2-Speicherschlüssel der Datei' },
                filename: { type: 'string', description: 'Dateiname für den Anhang (z.B. "Rechnung-2026-001.pdf")' },
              },
              required: ['r2Key', 'filename'],
            },
          },
        },
        required: ['businessId', 'customerId', 'subject', 'body'],
        additionalProperties: false,
      },
    },
  },
  // ============================================
  // STAFF MANAGEMENT TOOLS
  // ============================================
  {
    type: 'function',
    function: {
      name: 'create_staff',
      description: '[ASSISTENT] Erstellt einen neuen Mitarbeiter. Frage den Nutzer nach: Name, optional E-Mail, Telefon, Titel, Bio.',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          name: { type: 'string', description: 'Name des Mitarbeiters' },
          email: { type: 'string', description: 'E-Mail-Adresse (optional)' },
          phone: { type: 'string', description: 'Telefonnummer (optional)' },
          title: { type: 'string', description: 'Berufsbezeichnung (z.B. "Physiotherapeut", "Stylistin") (optional)' },
          bio: { type: 'string', description: 'Kurze Beschreibung / Bio (optional)' },
        },
        required: ['businessId', 'name'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_staff',
      description: '[ASSISTENT] Aktualisiert einen bestehenden Mitarbeiter. Verwende get_available_staff um die Mitarbeiter-ID zu finden.',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          staffId: { type: 'string', description: 'Die ID des Mitarbeiters' },
          name: { type: 'string', description: 'Neuer Name (optional)' },
          email: { type: 'string', description: 'Neue E-Mail-Adresse (optional)' },
          phone: { type: 'string', description: 'Neue Telefonnummer (optional)' },
          title: { type: 'string', description: 'Neue Berufsbezeichnung (optional)' },
          bio: { type: 'string', description: 'Neue Bio (optional)' },
          isActive: { type: 'boolean', description: 'Aktiv/Inaktiv setzen (optional)' },
        },
        required: ['businessId', 'staffId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_staff',
      description: '[ASSISTENT] Deaktiviert einen Mitarbeiter (Soft-Delete). Bestätige IMMER mit dem Nutzer bevor du löschst. Warnt bei betroffenen zukünftigen Buchungen.',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          staffId: { type: 'string', description: 'Die ID des Mitarbeiters' },
        },
        required: ['businessId', 'staffId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'assign_staff_to_service',
      description: '[ASSISTENT] Weist einen Mitarbeiter einer Dienstleistung zu. Verwende get_available_staff und get_available_services um die IDs zu finden.',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          staffId: { type: 'string', description: 'Die ID des Mitarbeiters' },
          serviceId: { type: 'string', description: 'Die ID der Dienstleistung' },
          sortOrder: { type: 'number', description: 'Priorität/Reihenfolge (optional, Standard: 999, niedrigere Zahl = höhere Priorität)' },
        },
        required: ['businessId', 'staffId', 'serviceId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_staff_from_service',
      description: '[ASSISTENT] Entfernt die Zuweisung eines Mitarbeiters von einer Dienstleistung.',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          staffId: { type: 'string', description: 'Die ID des Mitarbeiters' },
          serviceId: { type: 'string', description: 'Die ID der Dienstleistung' },
        },
        required: ['businessId', 'staffId', 'serviceId'],
        additionalProperties: false,
      },
    },
  },
  // ============================================
  // AVAILABILITY, BUSINESS SETTINGS, KB, CUSTOMER
  // ============================================
  {
    type: 'function',
    function: {
      name: 'get_availability_template',
      description: '[ASSISTENT] Zeigt den Wochenplan (Öffnungszeiten) des Unternehmens oder eines Mitarbeiters.',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          staffId: { type: 'string', description: 'Mitarbeiter-ID (optional, leer = Geschäftszeiten)' },
        },
        required: ['businessId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_availability_template',
      description: '[ASSISTENT] Setzt den Wochenplan (Öffnungszeiten). Überschreibt alle bestehenden Zeitfenster. Tage ohne Einträge gelten als geschlossen.',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          staffId: { type: 'string', description: 'Mitarbeiter-ID (optional, leer = Geschäftszeiten)' },
          slots: {
            type: 'array',
            description: 'Zeitfenster für die Woche',
            items: {
              type: 'object',
              properties: {
                dayOfWeek: { type: 'number', description: 'Wochentag (0=Sonntag, 1=Montag, ..., 6=Samstag)' },
                startTime: { type: 'string', description: 'Startzeit im Format HH:MM (z.B. "09:00")' },
                endTime: { type: 'string', description: 'Endzeit im Format HH:MM (z.B. "17:00")' },
              },
              required: ['dayOfWeek', 'startTime', 'endTime'],
            },
          },
        },
        required: ['businessId', 'slots'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_business_profile',
      description: '[ASSISTENT] Aktualisiert das Geschäftsprofil (Name, Kontakt, Beschreibung, rechtliche Angaben).',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          name: { type: 'string', description: 'Neuer Firmenname (optional)' },
          email: { type: 'string', description: 'Neue E-Mail-Adresse (optional)' },
          phone: { type: 'string', description: 'Neue Telefonnummer (optional)' },
          address: { type: 'string', description: 'Neue Adresse (optional)' },
          legalName: { type: 'string', description: 'Offizieller Firmenname (optional)' },
          legalForm: { type: 'string', description: 'Rechtsform: GmbH, UG, GbR, Einzelunternehmer (optional)' },
          description: { type: 'string', description: 'Beschreibung / Über uns (optional)' },
          tagline: { type: 'string', description: 'Kurzer Slogan (optional)' },
        },
        required: ['businessId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_booking_rules',
      description: '[ASSISTENT] Aktualisiert die Buchungsrichtlinien (Vorlaufzeit, Stornierungsfrist, etc.).',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          minBookingNoticeHours: { type: 'number', description: 'Mindestvorlaufzeit in Stunden (optional)' },
          maxAdvanceBookingDays: { type: 'number', description: 'Maximale Vorausbuchung in Tagen (optional)' },
          cancellationPolicyHours: { type: 'number', description: 'Stornierungsfrist in Stunden (optional)' },
          requireApproval: { type: 'boolean', description: 'Buchungen müssen bestätigt werden (optional)' },
          requireEmailConfirmation: { type: 'boolean', description: 'E-Mail-Bestätigung erforderlich (optional)' },
          allowWaitlist: { type: 'boolean', description: 'Warteliste erlauben (optional)' },
        },
        required: ['businessId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_knowledge_entry',
      description: '[ASSISTENT] Aktualisiert einen bestehenden Wissenseintrag. Verwende search_knowledge_base um den Eintrag zu finden.',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          entryId: { type: 'string', description: 'Die ID des Wissenseintrags' },
          title: { type: 'string', description: 'Neuer Titel (optional)' },
          content: { type: 'string', description: 'Neuer Inhalt (optional, Embedding wird neu generiert)' },
          category: { type: 'string', description: 'Neue Kategorie (optional)' },
          audience: { type: 'string', description: 'Neue Zielgruppe: public oder internal (optional)' },
          scopeType: { type: 'string', description: 'Neuer Geltungsbereich: global, customer, staff (optional)' },
        },
        required: ['businessId', 'entryId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_knowledge_entry',
      description: '[ASSISTENT] Löscht einen Wissenseintrag dauerhaft. Bestätige IMMER mit dem Nutzer bevor du löschst.',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          entryId: { type: 'string', description: 'Die ID des Wissenseintrags' },
        },
        required: ['businessId', 'entryId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_customer',
      description: '[ASSISTENT] Löscht einen Kunden und alle zugehörigen Daten (Buchungen, Gespräche). Bestätige IMMER mit dem Nutzer bevor du löschst. NICHT RÜCKGÄNGIG MACHBAR.',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          customerId: { type: 'string', description: 'Die ID des Kunden' },
        },
        required: ['businessId', 'customerId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_staff_service_priority',
      description: '[ASSISTENT] Ändert die Prioritätsreihenfolge der Mitarbeiter für eine Dienstleistung. Niedrigere sortOrder = höhere Priorität.',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          serviceId: { type: 'string', description: 'Die ID der Dienstleistung' },
          staffPriority: {
            type: 'array',
            description: 'Prioritätsliste der Mitarbeiter',
            items: {
              type: 'object',
              properties: {
                staffId: { type: 'string', description: 'Die ID des Mitarbeiters' },
                sortOrder: { type: 'number', description: 'Priorität (1 = höchste)' },
              },
              required: ['staffId', 'sortOrder'],
            },
          },
        },
        required: ['businessId', 'serviceId', 'staffPriority'],
        additionalProperties: false,
      },
    },
  },
  // ============================================
  // INVOICE, LIEFERSCHEIN & DOWNLOAD TOOLS
  // ============================================
  {
    type: 'function',
    function: {
      name: 'create_invoice',
      description: '[ASSISTENT] Erstellt eine Rechnung (Entwurf) für eine Buchung. Buchung muss existieren und Kunde braucht eine Adresse.',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          bookingId: { type: 'string', description: 'Die ID der Buchung' },
        },
        required: ['businessId', 'bookingId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_invoice',
      description: '[ASSISTENT] Versendet eine Rechnung per E-Mail an den Kunden. PDF wird automatisch generiert. Rechnung muss im Status "draft" sein.',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          invoiceId: { type: 'string', description: 'Die ID der Rechnung' },
        },
        required: ['businessId', 'invoiceId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mark_invoice_paid',
      description: '[ASSISTENT] Markiert eine versendete Rechnung als bezahlt.',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          invoiceId: { type: 'string', description: 'Die ID der Rechnung' },
          paymentMethod: { type: 'string', description: 'Zahlungsmethode (z.B. "Überweisung", "Bar", "PayPal") (optional)' },
          paymentReference: { type: 'string', description: 'Zahlungsreferenz/Transaktions-ID (optional)' },
        },
        required: ['businessId', 'invoiceId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_invoice_storno',
      description: '[ASSISTENT] Storniert eine Rechnung und erstellt eine Stornorechnung. Nur für versendete oder bezahlte Rechnungen. IMMER Grund erfragen!',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          invoiceId: { type: 'string', description: 'Die ID der Rechnung' },
          reason: { type: 'string', description: 'Grund für die Stornierung' },
        },
        required: ['businessId', 'invoiceId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_replacement_invoice',
      description: '[ASSISTENT] Erstellt eine Ersatzrechnung für eine stornierte Buchung. Die alte Rechnung muss storniert sein.',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          bookingId: { type: 'string', description: 'Die ID der Buchung' },
          cancelledInvoiceId: { type: 'string', description: 'Die ID der stornierten Rechnung' },
        },
        required: ['businessId', 'bookingId', 'cancelledInvoiceId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_lieferschein',
      description: '[ASSISTENT] Erstellt einen Lieferschein (PDF) für eine Buchung. Buchung muss Positionen haben.',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          bookingId: { type: 'string', description: 'Die ID der Buchung' },
        },
        required: ['businessId', 'bookingId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_booking_items',
      description: '[ASSISTENT] Verwaltet Buchungspositionen. Positionen hinzufügen, ersetzen oder entfernen. Beispiel: "2x Seilklettern 50€" → add mit items [{description:"Seilklettern",quantity:2,unitPrice:"50.00"}]',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          bookingId: { type: 'string', description: 'Die ID der Buchung' },
          action: { type: 'string', description: 'Aktion: "add" (hinzufügen), "replace" (alle ersetzen), "remove" (entfernen nach Index)' },
          items: {
            type: 'array',
            description: 'Positionen für add/replace (jeweils description, quantity, unitPrice)',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string', description: 'Bezeichnung der Position' },
                quantity: { type: 'number', description: 'Anzahl' },
                unitPrice: { type: 'string', description: 'Einzelpreis als String (z.B. "50.00")' },
              },
              required: ['description', 'quantity', 'unitPrice'],
            },
          },
          removeIndices: {
            type: 'array',
            description: 'Indizes der zu entfernenden Positionen (0-basiert, nur bei action "remove")',
            items: { type: 'number' },
          },
        },
        required: ['businessId', 'bookingId', 'action'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_download_link',
      description: '[ASSISTENT] Erstellt einen Download-Link für eine Rechnung oder einen Lieferschein. Ergebnis IMMER als [DOWNLOAD:url|dateiname] in die Antwort einbauen!',
      parameters: {
        type: 'object',
        properties: {
          businessId: { type: 'string', description: 'Die ID des Unternehmens' },
          documentType: { type: 'string', description: 'Dokumenttyp: "invoice" oder "lieferschein"' },
          documentId: { type: 'string', description: 'Bei invoice: invoiceId, bei lieferschein: bookingId' },
        },
        required: ['businessId', 'documentType', 'documentId'],
        additionalProperties: false,
      },
    },
  },
]
