/**
 * Chatbot Conversation Handler
 *
 * Manages conversation flow, tool calling, and response generation.
 */

import { db } from '@/lib/db'
import { chatbotConversations, chatbotMessages, businesses, services } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import {
  createChatCompletion,
  parseToolArguments,
  type ChatMessage,
  type ToolCall,
  type ParseResult,
} from './openrouter'
import { tools, executeTool } from './tools'

/**
 * Business context for dynamic system prompts
 */
interface BusinessContext {
  name: string
  type: string | null
  services: Array<{ name: string; description: string | null }>
  policies?: {
    minBookingNoticeHours: number | null
    cancellationPolicyHours: number | null
  }
  customInstructions?: string
}

/**
 * Get system prompt for the chatbot based on business context
 */
function getSystemPrompt(context: BusinessContext, businessId: string, isAdmin: boolean = false): string {
  // Map business type to German description
  const typeDescriptions: Record<string, string> = {
    'clinic': 'eine medizinische Praxis',
    'salon': 'ein Salon',
    'consultant': 'ein Beratungsunternehmen',
    'gym': 'ein Fitnessstudio',
    'other': 'ein Unternehmen'
  }

  const businessType = typeDescriptions[context.type || 'other'] || typeDescriptions['other']

  // DO NOT include services in prompt - they will be fetched via tools
  // DO NOT include policies in prompt - they are enforced in tools

  return `Du bist der freundliche KI-Assistent für ${context.name}, ${businessType}.

DEINE ROLLE:
- Beantworte Fragen zu verfügbaren Behandlungen, Preisen und Öffnungszeiten
- Hilf Kunden, Termine zu buchen
- Sei höflich, professionell und hilfsbereit
- Verwende ausschließlich die formelle "Sie"-Anrede

${context.customInstructions || ''}

STRENGE REGELN - TOOLS SIND DIE EINZIGE QUELLE DER WAHRHEIT:

1. **Services & Preise**: IMMER get_available_services() aufrufen, NIE aus Gedächtnis
2. **Verfügbarkeit**: IMMER check_availability() aufrufen mit Datum
3. **Datum-Fragen**: Nutze get_current_date() für korrekte Daten - NIE selbst berechnen
4. **Slot-Auswahl**: Verwende exakten ISO timestamp aus Slot-Daten, NIE rekonstruieren
5. **Wissensbasis**: Nutze search_knowledge_base() für FAQs, Policies, Öffnungszeiten

BUCHUNGSABLAUF (Reihenfolge PFLICHT):

1. Service auswählen
   → get_available_services()
   → Zeige Namen, Preis, Dauer

2. Verfügbarkeit prüfen
   → Kunde nennt Wunsch (z.B. "morgen", "nächste Woche", "18. Feb")
   → get_current_date() aufrufen
   → check_availability(date: Datum aus Tool) aufrufen
   → Zeige Slots: "Slot 1: 07:00 Uhr, Slot 2: 08:00 Uhr..." (max 6)

3. Slot reservieren
   → Kunde wählt (z.B. "Slot 2" oder "08:00")
   → Finde den Slot aus der check_availability Antwort
   → Der Slot enthält ALLE benötigten Daten: start, serviceId, staffId, staffName
   → Das System wählt automatisch den am besten verfügbaren Mitarbeiter basierend auf Priorität
   → Beispiel: Wenn Slot 2 = {slotIndex: 2, start: "2026-02-05T09:00:00.000Z", serviceId: "abc123", staffId: "def456", staffName: "Sarah"}
   → DANN: create_hold(businessId: "${businessId}", serviceId: "abc123", staffId: "def456", startsAt: "2026-02-05T09:00:00.000Z")
   → WICHTIG: Verwende serviceId und staffId DIREKT aus dem Slot-Objekt
   → Falls staffName vorhanden: "Termin für 5 Minuten reserviert mit [staffName]"
   → Falls kein staffName: "Termin für 5 Minuten reserviert"

4. Kundendaten sammeln
   → Name, E-Mail, Telefon

5. Bestätigung einholen
   → Zeige Zusammenfassung

6. Buchung abschließen
   → confirm_booking()
   → Die Antwort enthält: bookingId, serviceName, staffName (falls zugewiesen)
   → Erfolgsmeldung mit allen Details
   → Falls Kunde nach Mitarbeiter fragt: Verwende staffName aus confirm_booking Antwort

KRITISCHE REGELN:

- NIEMALS Zeitstempel rekonstruieren oder Daten selbst berechnen
- NIEMALS Services/Preise aus Gedächtnis nennen
- IMMER exakte Werte aus Tool-Antworten verwenden
- IMMER ALLE erforderlichen Parameter an Tools übergeben (NIEMALS leer lassen!)
- Bei create_hold MÜSSEN businessId, serviceId UND startsAt übergeben werden
- Bei Tool-Fehler: Kunde informieren und alternative Optionen anbieten
- Bei "HOLD_EXPIRED": Neuen Termin wählen lassen
- Bei "SLOT_UNAVAILABLE": "Dieser Termin ist nicht mehr verfügbar. Andere Option?"

FEHLERBEHANDLUNG (Error Codes):

1. INVALID_TOOL_ARGS:
   → "Es gab ein technisches Problem bei der Verarbeitung."
   → Prüfe, ob alle benötigten Informationen vorhanden sind
   → Sammle fehlende Daten vom Kunden
   → Versuche die Aktion erneut

2. MISSING_REQUIRED_ARGS:
   → "Es fehlen Informationen für diese Aktion."
   → Prüfe im error.details.missing welche Parameter fehlen
   → Sammle die fehlenden Daten explizit vom Kunden
   → Versuche die Aktion mit vollständigen Parametern erneut

3. SLOT_UNAVAILABLE:
   → "Dieser Termin ist leider nicht mehr verfügbar."
   → SOFORT check_availability(gleicher Tag) aufrufen
   → Neue verfügbare Slots anzeigen
   → "Welchen dieser verfügbaren Termine möchten Sie stattdessen?"

4. INVALID_TIMESTAMP:
   → "Es gab ein Problem mit dem gewählten Zeitpunkt."
   → check_availability(gleicher Tag) aufrufen
   → Slots erneut zeigen mit Nummern
   → "Bitte wählen Sie Slot 1, 2, 3, etc."

5. INVALID_PAYLOAD:
   → "Es fehlen Informationen für die Reservierung."
   → Prüfe welche Daten fehlen
   → Sammle fehlende Informationen
   → Versuche erneut

6. HOLD_EXPIRED (bei confirm_booking):
   → "Ihre Reservierung ist abgelaufen."
   → "Möchten Sie einen neuen Termin wählen?"
   → Zurück zu Verfügbarkeitsprüfung

7. Andere Fehler (nach 3+ Versuchen):
   → "Es gibt ein technisches Problem."
   → "Ich leite Ihre Anfrage an unser Team weiter."
   → Eskalation

VERFÜGBARE TOOLS:
- get_current_date: Holt aktuelles Datum/Zeit (für Datum-Berechnungen)
- get_available_services: Listet Services mit Preisen
- get_available_staff: Listet verfügbare Mitarbeiter
- check_availability: Prüft freie Termine (benötigt Datum YYYY-MM-DD)
- create_hold: Reserviert Zeitslot (5 Min.)
- confirm_booking: Bestätigt Buchung mit Kundendaten
- search_knowledge_base: Durchsucht Wissensdatenbank (Hybrid-Suche)
${isAdmin ? `
ADMIN TOOLS (Nur für Sie verfügbar):
- search_bookings: Buchungen suchen
- update_booking_status: Buchungsstatus ändern
- reschedule_booking: Buchung verschieben
` : ''}

WICHTIG: Für alle Tool-Aufrufe diese businessId verwenden: ${businessId}

ESKALATION:
Bei unlösbarem Problem: "Das tut mir leid. Ich leite Ihre Anfrage an unser Team weiter."

Antworte IMMER auf Deutsch und sei freundlich!`
}

/**
 * Handle an incoming chat message
 */
export async function handleChatMessage(params: {
  businessId: string
  conversationId?: string
  message: string
  channel?: string
  customerId?: string
  adminContext?: { userId: string; role: string; isAdmin: boolean } // NEW
}): Promise<{
  conversationId: string
  response: string
  metadata?: Record<string, unknown>
}> {
  const { businessId, message, channel = 'web', customerId, adminContext } = params
  const isAdmin = adminContext?.isAdmin || false

  // 1. Get business info
  const business = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1)
    .then(rows => rows[0])

  if (!business) {
    throw new Error('Business not found')
  }

  // 2. Get active services for context
  const businessServices = await db
    .select({
      name: services.name,
      description: services.description,
    })
    .from(services)
    .where(and(
      eq(services.businessId, businessId),
      eq(services.isActive, true)
    ))
    .orderBy(services.sortOrder)

  // 3. Build business context for dynamic prompt
  const businessContext: BusinessContext = {
    name: business.name,
    type: business.type,
    services: businessServices,
    policies: {
      minBookingNoticeHours: business.minBookingNoticeHours,
      cancellationPolicyHours: business.cancellationPolicyHours,
    },
    customInstructions: typeof business.settings === 'object' && business.settings !== null
      ? (business.settings as { chatbotInstructions?: string }).chatbotInstructions
      : undefined
  }

  // 4. Get or create conversation
  let conversationId = params.conversationId

  if (!conversationId) {
    const [conversation] = await db
      .insert(chatbotConversations)
      .values({
        businessId,
        customerId,
        channel,
        status: 'active',
      })
      .returning()

    conversationId = conversation.id
  }

  // 5. Save user message
  await db.insert(chatbotMessages).values({
    conversationId,
    role: 'user',
    content: message,
  })

  // 6. Get conversation history
  const history = await db
    .select({
      role: chatbotMessages.role,
      content: chatbotMessages.content,
      metadata: chatbotMessages.metadata,
    })
    .from(chatbotMessages)
    .where(eq(chatbotMessages.conversationId, conversationId))
    .orderBy(chatbotMessages.createdAt)
    .limit(20) // Last 20 messages for context

  // 7. Filter tools based on admin status
  const adminOnlyTools = ['search_bookings', 'update_booking_status', 'reschedule_booking']
  const availableTools = isAdmin
    ? tools // All tools
    : tools.filter(t => !adminOnlyTools.includes(t.function.name))

  // 8. Build messages for AI with dynamic system prompt
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: getSystemPrompt(businessContext, businessId, isAdmin),
    },
    ...history.map((h) => {
      const baseMessage = {
        role: h.role as ChatMessage['role'],
        content: h.content,
      }

      // Reconstruct assistant messages with tool_calls
      if (h.role === 'assistant' && h.metadata && typeof h.metadata === 'object' && 'tool_calls' in h.metadata) {
        return {
          ...baseMessage,
          tool_calls: h.metadata.tool_calls as ToolCall[],
        }
      }

      // Reconstruct tool messages with tool_call_id and name
      if (h.role === 'tool' && h.metadata && typeof h.metadata === 'object') {
        const metadata = h.metadata as Record<string, unknown>
        if (metadata.tool_call_id && metadata.tool_name) {
          return {
            ...baseMessage,
            tool_call_id: metadata.tool_call_id as string,
            name: metadata.tool_name as string,
          }
        }
      }

      return baseMessage
    }),
  ]

  // 9. Call AI with tool support
  let response = await createChatCompletion({
    messages,
    tools: availableTools,
    temperature: 0.7,
    max_tokens: 1000,
  })

  // Validate response structure
  if (!response || !response.choices || !response.choices[0]) {
    console.error('[Conversation] Invalid OpenRouter response structure:', {
      hasResponse: !!response,
      hasChoices: !!response?.choices,
      choicesLength: response?.choices?.length,
      response: JSON.stringify(response).substring(0, 500),
    })
    throw new Error('Invalid response from AI model')
  }

  let assistantMessage = response.choices[0].message
  let toolCalls = assistantMessage.tool_calls
  let finalResponse = assistantMessage.content

  // 10. Handle tool calls (may require multiple rounds)
  // Increased from 5 to 10 to allow "next available" searches across multiple days
  const maxToolRounds = 10
  let toolRound = 0

  while (toolCalls && toolCalls.length > 0 && toolRound < maxToolRounds) {
    toolRound++

    // Save assistant message with tool calls
    await db.insert(chatbotMessages).values({
      conversationId,
      role: 'assistant',
      content: assistantMessage.content || '',
      metadata: { tool_calls: toolCalls },
    })

    // Execute each tool call
    const toolResults: ChatMessage[] = []

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name
      const rawArgs = toolCall.function.arguments

      // DEBUG: Log FULL tool call structure
      console.log('[TOOL CALL DEBUG]', {
        tool: toolName,
        rawArgsType: typeof rawArgs,
        rawArgsLength: typeof rawArgs === 'string' ? rawArgs.length : 'N/A',
        rawArgsPreview: typeof rawArgs === 'string' ? rawArgs.substring(0, 100) : rawArgs,
      })

      // PHASE 1 FIX A: Parse arguments with structured result
      const parseResult = parseToolArguments(rawArgs)

      if (!parseResult.success) {
        console.error(`[Chatbot] Parse failed for ${toolName}:`, parseResult.error)

        // Return error to model so it can retry
        const errorResponse = {
          success: false,
          code: 'INVALID_TOOL_ARGS',
          error: 'Tool arguments could not be parsed',
          details: {
            reason: parseResult.error,
            hint: 'Check that all required parameters are provided in correct format',
          },
        }

        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolName,
          content: JSON.stringify(errorResponse),
        })

        // Save error to DB
        await db.insert(chatbotMessages).values({
          conversationId,
          role: 'tool',
          content: JSON.stringify(errorResponse),
          metadata: {
            tool_call_id: toolCall.id,
            tool_name: toolName,
          },
        })

        continue // Skip to next tool call
      }

      const toolArgs = parseResult.data!

      // PHASE 1 FIX B: Validate required fields for this tool
      const toolDef = availableTools.find(t => t.function.name === toolName)
      if (toolDef) {
        const required = toolDef.function.parameters.required || []
        const properties = toolDef.function.parameters.properties || {}

        // Check for missing/invalid required fields
        const missing: string[] = []
        for (const key of required) {
          const value = toolArgs[key]
          const propType = properties[key]?.type

          // Missing if undefined or null
          if (value === undefined || value === null) {
            missing.push(key)
            continue
          }

          // For strings: also treat empty string as missing
          if (propType === 'string' && value === '') {
            missing.push(key)
            continue
          }

          // For other types: 0, false, [] are VALID (not missing)
        }

        if (missing.length > 0) {
          console.error(`[Chatbot] Missing required args for ${toolName}:`, missing)

          const errorResponse = {
            success: false,
            code: 'MISSING_REQUIRED_ARGS',
            error: `Missing required parameters: ${missing.join(', ')}`,
            details: {
              required: required,
              provided: Object.keys(toolArgs),
              missing: missing,
            },
          }

          toolResults.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolName,
            content: JSON.stringify(errorResponse),
          })

          await db.insert(chatbotMessages).values({
            conversationId,
            role: 'tool',
            content: JSON.stringify(errorResponse),
            metadata: {
              tool_call_id: toolCall.id,
              tool_name: toolName,
            },
          })

          continue // Skip to next tool call
        }
      }

      // PHASE 1 FIX C: SERVER-SIDE INJECTION - Always override businessId
      const safeToolArgs = {
        ...toolArgs,
        businessId: businessId, // Force to conversation's businessId
      }

      console.log(`[Chatbot] Executing tool: ${toolName}`, {
        originalBusinessId: toolArgs.businessId,
        injectedBusinessId: safeToolArgs.businessId,
        args: safeToolArgs,
      })

      try {
        // Execute with safe args (businessId guaranteed correct)
        const result = await executeTool(toolName, safeToolArgs)

        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolName,
          content: JSON.stringify(result),
        })

        // Save tool result
        await db.insert(chatbotMessages).values({
          conversationId,
          role: 'tool',
          content: JSON.stringify(result),
          metadata: {
            tool_call_id: toolCall.id,
            tool_name: toolName,
          },
        })
      } catch (error) {
        console.error(`[Chatbot] Tool execution error:`, error)

        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        const errorResponse = {
          success: false,
          code: 'INTERNAL_ERROR',
          error: errorMessage,
        }

        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolName,
          content: JSON.stringify(errorResponse),
        })

        // Save error to DB
        await db.insert(chatbotMessages).values({
          conversationId,
          role: 'tool',
          content: JSON.stringify(errorResponse),
          metadata: {
            tool_call_id: toolCall.id,
            tool_name: toolName,
          },
        })
      }
    }

    // Get AI response with tool results
    messages.push(assistantMessage)
    messages.push(...toolResults)

    response = await createChatCompletion({
      messages,
      tools: availableTools,
      temperature: 0.7,
      max_tokens: 1000,
    })

    // Validate response structure
    if (!response || !response.choices || !response.choices[0]) {
      console.error('[Conversation] Invalid OpenRouter response structure:', {
        hasResponse: !!response,
        hasChoices: !!response?.choices,
        choicesLength: response?.choices?.length,
        response: JSON.stringify(response).substring(0, 500),
      })
      throw new Error('Invalid response from AI model')
    }

    assistantMessage = response.choices[0].message
    toolCalls = assistantMessage.tool_calls
    finalResponse = assistantMessage.content
  }

  // 10. Validate finalResponse and provide graceful fallback
  if (!finalResponse || finalResponse.trim() === '') {
    // Check if there were tool errors
    const hadToolErrors = messages.some(m => {
      if (m.role === 'tool') {
        try {
          const parsed = JSON.parse(m.content || '{}')
          return parsed.success === false
        } catch {
          return false
        }
      }
      return false
    })

    if (hadToolErrors) {
      finalResponse = 'Es gab einen technischen Fehler bei der Verarbeitung Ihrer Anfrage. Bitte versuchen Sie es erneut oder kontaktieren Sie uns direkt.'
    } else {
      finalResponse = 'Entschuldigung, ich konnte keine passende Antwort generieren. Wie kann ich Ihnen weiterhelfen?'
    }

    console.warn('[Conversation] AI failed to generate response, using fallback', {
      conversationId,
      hadToolErrors,
      toolRound,
    })
  }

  // 11. Save final assistant response
  await db.insert(chatbotMessages).values({
    conversationId,
    role: 'assistant',
    content: finalResponse || '',
    metadata: {
      model: response.model,
      usage: response.usage,
    },
  })

  // 12. Update conversation timestamp
  await db
    .update(chatbotConversations)
    .set({ updatedAt: new Date() })
    .where(eq(chatbotConversations.id, conversationId))

  return {
    conversationId,
    response: finalResponse || 'Entschuldigung, ich konnte keine Antwort generieren.',
    metadata: {
      model: response.model,
      usage: response.usage,
      toolCallsExecuted: toolRound,
    },
  }
}

/**
 * Get conversation history
 */
export async function getConversationHistory(conversationId: string) {
  const messages = await db
    .select({
      id: chatbotMessages.id,
      role: chatbotMessages.role,
      content: chatbotMessages.content,
      createdAt: chatbotMessages.createdAt,
      metadata: chatbotMessages.metadata,
    })
    .from(chatbotMessages)
    .where(eq(chatbotMessages.conversationId, conversationId))
    .orderBy(chatbotMessages.createdAt)

  return messages
}

/**
 * List conversations for a business
 */
export async function listConversations(businessId: string, limit = 50) {
  const conversations = await db
    .select()
    .from(chatbotConversations)
    .where(eq(chatbotConversations.businessId, businessId))
    .orderBy(desc(chatbotConversations.updatedAt))
    .limit(limit)

  return conversations
}
