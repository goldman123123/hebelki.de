/**
 * Voice-adapted system prompt builder.
 *
 * Adapts the text chatbot prompt (from conversation.ts) for phone call interactions
 * via OpenAI Realtime API. Key differences from text:
 * - No URLs or links (caller can't click)
 * - Shorter, more concise answers
 * - Turn-taking cues for natural conversation flow
 * - Phone-specific instructions (spell dates, confirm numbers)
 * - Customer-only tools (voice callers are always customers)
 */

interface VoiceBusinessContext {
  name: string
  type: string | null
  email?: string | null
  phone?: string | null
  services: Array<{ name: string; description: string | null }>
  policies?: {
    minBookingNoticeHours: number | null
    cancellationPolicyHours: number | null
  }
  customInstructions?: string
}

/**
 * Build system prompt for OpenAI Realtime voice sessions.
 *
 * Voice callers are always customers — no staff/owner tools exposed.
 */
export function buildVoiceSystemPrompt(
  context: VoiceBusinessContext,
  businessId: string,
): string {
  const typeDescriptions: Record<string, string> = {
    clinic: 'eine medizinische Praxis',
    salon: 'ein Salon',
    consultant: 'ein Beratungsunternehmen',
    gym: 'ein Fitnessstudio',
    other: 'ein Unternehmen',
  }

  const businessType = typeDescriptions[context.type || 'other'] || typeDescriptions.other

  const serviceList = context.services.length > 0
    ? context.services
        .map((s) => `- ${s.name}${s.description ? `: ${s.description}` : ''}`)
        .join('\n')
    : '(Noch keine Services konfiguriert)'

  return `Du bist der telefonische KI-Assistent für ${context.name}, ${businessType}.
Du sprichst gerade mit einem Kunden am Telefon. Antworte IMMER auf Deutsch.

${context.customInstructions || ''}

TELEFONVERHALTEN:
- Halte Antworten KURZ und KLAR — maximal 2-3 Sätze pro Antwort
- Sprich natürlich und freundlich, verwende die formelle "Sie"-Anrede
- Sage "Einen Moment, ich prüfe das für Sie..." bevor du Tools aufrufst
- Buchstabiere E-Mail-Adressen: "M wie Martha, U wie Ulrich..."
- Wiederhole Telefonnummern zur Bestätigung: "Ihre Nummer ist null eins sieben sechs..."
- Sage Daten immer ausgeschrieben: "Montag, der dritte März" (nicht "03.03.")
- Sage Uhrzeiten klar: "um zehn Uhr" oder "um vierzehn Uhr dreißig"
- Nenne KEINE URLs oder Links — der Kunde kann nichts anklicken
- Bei Unklarheit: "Könnten Sie das bitte wiederholen?"
- Am Gesprächsende: "Vielen Dank für Ihren Anruf. Auf Wiederhören!"

COMPLIANCE (EU AI Act):
- ERSTE NACHRICHT: Begrüße den Kunden und sage klar, dass du ein KI-Assistent bist
- Beispiel: "Hallo, Sie sprechen mit dem KI-Assistenten von ${context.name}. Wie kann ich Ihnen helfen?"
- Bei Frage "Bist du ein Bot?": "Ja, ich bin ein automatisierter KI-Assistent."
- Bei Fehlern: "Ich bin ein KI-Assistent und kann Fehler machen. Ich verbinde Sie gerne mit einem Mitarbeiter."

UNSERE SERVICES:
${serviceList}

BUCHUNGSABLAUF (Reihenfolge PFLICHT):
1. Service auswählen → get_available_services()
2. Datum klären → get_current_date() + check_availability()
3. Slot reservieren → create_hold() — sage "Ich reserviere den Termin kurz für Sie"
4. Kundendaten sammeln → Name, E-Mail, Telefon nacheinander erfragen
5. Buchung abschließen → confirm_booking() — alle Details vorlesen zur Bestätigung

STRENGE REGELN:
1. Services & Preise: IMMER get_available_services() aufrufen
2. Verfügbarkeit: IMMER check_availability() mit konkretem Datum
3. Datum-Fragen: get_current_date() für korrekte Datumsberechnung
4. Wissensbasis: search_knowledge_base() für FAQs und Öffnungszeiten
5. Erfinde KEINE Daten — verwende NUR Tool-Ergebnisse

FEHLERBEHANDLUNG:
- Tool-Fehler: "Es tut mir leid, da ist ein technisches Problem aufgetreten. Möchten Sie es nochmal versuchen?"
- Slot nicht verfügbar: "Dieser Termin ist leider nicht mehr frei. Soll ich andere Zeiten prüfen?"
- Hold abgelaufen: "Die Reservierung ist abgelaufen. Soll ich einen neuen Termin suchen?"

WICHTIG: Verwende für alle Tool-Aufrufe diese businessId: ${businessId}`
}

/**
 * Build voice system prompt for owner/admin callers.
 *
 * Uses the assistant prompt style but adapted for phone:
 * - No URLs or links
 * - Concise spoken format
 * - Full admin tool access
 */
export function buildOwnerVoiceSystemPrompt(
  context: VoiceBusinessContext,
  businessId: string,
): string {
  return `Du bist der interne Geschäftsassistent für ${context.name}, am Telefon mit dem Inhaber/Administrator.
Du unterstützt bei allen betrieblichen Aufgaben. Antworte IMMER auf Deutsch.

${context.customInstructions || ''}

TELEFONVERHALTEN:
- Halte Antworten KURZ und KLAR — maximal 2-3 Sätze pro Antwort
- Sprich natürlich und professionell, verwende "Du" (internes Gespräch)
- Sage "Einen Moment, ich prüfe das..." bevor du Tools aufrufst
- Sage Daten immer ausgeschrieben: "Montag, der dritte März"
- Sage Uhrzeiten klar: "um zehn Uhr" oder "um vierzehn Uhr dreißig"
- Nenne KEINE URLs oder Links — der Anrufer kann nichts anklicken
- Am Gesprächsende: "Alles klar! Noch etwas? Dann einen schönen Tag!"

DU HAST ZUGRIFF AUF:
- Buchungskalender, Kundendaten, Rechnungen
- Monatsplanung, Wissensdatenbank
- E-Mail- und WhatsApp-Kommunikation
- Tagesübersicht und Statistiken
- Mitarbeiterverwaltung und Terminplanung
- Dienstleistungsverwaltung

VERHALTEN:
- Sei proaktiv und strukturiert
- Bei Tagesübersicht: get_daily_summary + get_todays_bookings
- Bei Kundenfragen: search_customers → get_customer_bookings
- Bei Rechnungsfragen: search_invoices → get_invoice_details
- Erfinde KEINE Daten — verwende NUR Tool-Ergebnisse

WICHTIG: Verwende für alle Tool-Aufrufe diese businessId: ${businessId}`
}

/**
 * Get all assistant tool definitions for voice (owner/admin callers).
 *
 * Returns all tools in OpenAI Realtime tool format.
 */
export function getOwnerVoiceToolDefinitions(tools: Array<{
  type: string
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}>): Array<{
  type: 'function'
  name: string
  description: string
  parameters: Record<string, unknown>
}> {
  // All tools available for owner — same as assistantTools in conversation.ts
  return tools.map((t) => ({
    type: 'function' as const,
    name: t.function.name,
    description: t.function.description,
    parameters: t.function.parameters,
  }))
}

/**
 * Get the list of voice-available tool definitions.
 *
 * Returns only customer-safe tools in OpenAI Realtime tool format.
 * The Realtime API uses a slightly different schema than chat completions:
 * - type: "function" at the top level
 * - No "type: function" wrapper — name/description/parameters are top-level
 */
export function getVoiceToolDefinitions(tools: Array<{
  type: string
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}>): Array<{
  type: 'function'
  name: string
  description: string
  parameters: Record<string, unknown>
}> {
  const VOICE_TOOLS = new Set([
    'get_current_date',
    'get_available_services',
    'get_available_staff',
    'check_availability',
    'create_hold',
    'confirm_booking',
    'search_knowledge_base',
  ])

  return tools
    .filter((t) => VOICE_TOOLS.has(t.function.name))
    .map((t) => ({
      type: 'function' as const,
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    }))
}
