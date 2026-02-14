/**
 * Chatbot Conversation Handler
 *
 * Manages conversation flow, tool calling, and response generation.
 */

import { db, dbRetry } from '@/lib/db'
import { chatbotConversations, chatbotMessages, businesses, services, type ConversationIntent } from '@/lib/db/schema'
import { eq, and, desc, or, inArray } from 'drizzle-orm'
import {
  createChatCompletion,
  parseToolArguments,
  type ChatMessage,
  type ToolCall,
} from './openrouter'
import { tools, executeTool } from './tools'
import { getAIConfig } from '@/lib/ai/config'
import { logAIUsage } from '@/lib/ai/usage'
import { getBusinessLocale } from '@/lib/locale'
import { getEmailTranslations } from '@/lib/email-i18n'
import type { Locale } from '@/i18n/config'
import { createLogger } from '@/lib/logger'

const log = createLogger('chatbot:conversation')

// ============================================
// CONVERSATION MEMORY SYSTEM
// ============================================

/**
 * Configuration for conversation memory
 */
const MEMORY_CONFIG = {
  MESSAGES_BEFORE_SUMMARY: 10,  // Generate summary after this many messages
  RECENT_MESSAGES_WITH_SUMMARY: 5,  // Load this many recent messages when we have a summary
  RECENT_MESSAGES_WITHOUT_SUMMARY: 10,  // Load this many messages when no summary exists
  MAX_MESSAGES_FOR_SUMMARY: 20,  // Max messages to include in summary generation
}

/**
 * Conversation context loaded for AI
 */
interface ConversationContext {
  summary: string | null
  messages: Array<{
    role: string
    content: string
    metadata: unknown
  }>
  intent: ConversationIntent | null
  messagesSinceSummary: number
}

/**
 * Ensure every assistant message with tool_calls has matching tool responses.
 * OpenAI returns 400 if tool_call_ids are missing their tool responses.
 * Drops orphaned assistant+tool_calls at the start (from history truncation)
 * and strips tool_calls from assistant messages whose tool responses were lost.
 */
function sanitizeToolMessages(
  messages: Array<{ role: string; content: string; metadata: unknown }>
): Array<{ role: string; content: string; metadata: unknown }> {
  // Collect all tool_call_ids that have a tool response
  const answeredToolCallIds = new Set<string>()
  for (const m of messages) {
    if (m.role === 'tool' && m.metadata && typeof m.metadata === 'object') {
      const meta = m.metadata as Record<string, unknown>
      if (meta.tool_call_id) answeredToolCallIds.add(meta.tool_call_id as string)
    }
  }

  const result: typeof messages = []
  for (const m of messages) {
    if (m.role === 'assistant' && m.metadata && typeof m.metadata === 'object' && 'tool_calls' in m.metadata) {
      const toolCalls = (m.metadata as Record<string, unknown>).tool_calls as Array<{ id: string }> | undefined
      if (toolCalls?.length) {
        const allAnswered = toolCalls.every(tc => answeredToolCallIds.has(tc.id))
        if (allAnswered) {
          result.push(m)
        } else if (m.content) {
          // Keep the text content but drop tool_calls
          result.push({ role: m.role, content: m.content, metadata: {} })
        }
        // If no content and no answered tool_calls, skip entirely
        continue
      }
    }

    // Drop orphaned tool messages whose assistant is missing
    if (m.role === 'tool') {
      const meta = m.metadata as Record<string, unknown> | undefined
      const toolCallId = meta?.tool_call_id as string | undefined
      // Only include if the parent assistant message made it into results
      if (toolCallId) {
        const hasParent = result.some(r =>
          r.role === 'assistant' &&
          r.metadata && typeof r.metadata === 'object' &&
          'tool_calls' in r.metadata &&
          ((r.metadata as Record<string, unknown>).tool_calls as Array<{ id: string }>)?.some(tc => tc.id === toolCallId)
        )
        if (!hasParent) continue
      }
    }

    result.push(m)
  }

  return result
}

/**
 * Load optimized conversation context
 * Uses summary + recent messages instead of full history
 */
async function loadConversationContext(conversationId: string): Promise<ConversationContext> {
  // Get conversation with summary and intent
  const conversation = await db
    .select({
      summary: chatbotConversations.summary,
      currentIntent: chatbotConversations.currentIntent,
      messagesSinceSummary: chatbotConversations.messagesSinceSummary,
    })
    .from(chatbotConversations)
    .where(eq(chatbotConversations.id, conversationId))
    .limit(1)
    .then(rows => rows[0])

  if (!conversation) {
    return { summary: null, messages: [], intent: null, messagesSinceSummary: 0 }
  }

  const hasSummary = !!conversation.summary

  // Determine how many messages to load
  const messageLimit = hasSummary
    ? MEMORY_CONFIG.RECENT_MESSAGES_WITH_SUMMARY
    : MEMORY_CONFIG.RECENT_MESSAGES_WITHOUT_SUMMARY

  // Load recent user/assistant messages (skip tool messages for compaction)
  // But we need tool messages for proper conversation reconstruction
  const recentMessages = await db
    .select({
      role: chatbotMessages.role,
      content: chatbotMessages.content,
      metadata: chatbotMessages.metadata,
    })
    .from(chatbotMessages)
    .where(eq(chatbotMessages.conversationId, conversationId))
    .orderBy(desc(chatbotMessages.createdAt))
    .limit(messageLimit * 2)  // Get more to account for tool messages

  // Reverse to chronological order
  const chronological = recentMessages.reverse()

  // Sanitize: ensure every assistant message with tool_calls has its
  // matching tool responses, otherwise OpenAI returns 400.
  const sanitized = sanitizeToolMessages(chronological)

  return {
    summary: conversation.summary,
    messages: sanitized,
    intent: conversation.currentIntent as ConversationIntent | null,
    messagesSinceSummary: conversation.messagesSinceSummary || 0,
  }
}

/**
 * Generate a conversation summary using AI
 */
async function generateConversationSummary(conversationId: string, locale: Locale = 'de'): Promise<string> {
  const ts = await getEmailTranslations(locale, 'chatbotPrompts.summary')

  // Get messages to summarize
  const messages = await db
    .select({
      role: chatbotMessages.role,
      content: chatbotMessages.content,
    })
    .from(chatbotMessages)
    .where(and(
      eq(chatbotMessages.conversationId, conversationId),
      or(
        eq(chatbotMessages.role, 'user'),
        eq(chatbotMessages.role, 'assistant')
      )
    ))
    .orderBy(chatbotMessages.createdAt)
    .limit(MEMORY_CONFIG.MAX_MESSAGES_FOR_SUMMARY)

  if (messages.length === 0) {
    return ''
  }

  // Format messages for summarization
  const conversationText = messages
    .map(m => `${m.role === 'user' ? ts('customerLabel') : ts('assistantLabel')}: ${m.content}`)
    .join('\n')

  // Generate summary using AI
  const summaryPrompt = `${ts('prompt')}

${conversationText}

${ts('instruction')}`

  try {
    const response = await createChatCompletion({
      messages: [{ role: 'user', content: summaryPrompt }],
      temperature: 0.3,
      max_tokens: 200,
    })

    const summary = response.choices[0]?.message?.content || ''
    return summary.trim()
  } catch (error) {
    log.error('Error:', error)
    return ''
  }
}

/**
 * Retry wrapper for DB updates — handles transient Neon HTTP connection drops.
 * 1 retry after 500ms delay is enough for intermittent socket failures.
 */
async function dbUpdateWithRetry(fn: () => Promise<void>, retries = 1): Promise<void> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await fn()
      return
    } catch (err) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 500))
        continue
      }
      throw err
    }
  }
}

/**
 * Update conversation summary if needed
 * Called after each message exchange
 */
async function updateSummaryIfNeeded(conversationId: string, currentMessageCount: number, locale: Locale = 'de'): Promise<void> {
  // Check if we should generate a new summary
  if (currentMessageCount < MEMORY_CONFIG.MESSAGES_BEFORE_SUMMARY) {
    // Just increment the counter
    await dbUpdateWithRetry(() =>
      db
        .update(chatbotConversations)
        .set({
          messagesSinceSummary: currentMessageCount,
          updatedAt: new Date(),
        })
        .where(eq(chatbotConversations.id, conversationId))
        .then(() => {})
    )
    return
  }

  // Time to generate a summary
  log.info(`Generating summary for conversation ${conversationId} (${currentMessageCount} messages)`)

  const summary = await generateConversationSummary(conversationId, locale)

  if (summary) {
    await dbUpdateWithRetry(() =>
      db
        .update(chatbotConversations)
        .set({
          summary,
          summaryUpdatedAt: new Date(),
          messagesSinceSummary: 0,  // Reset counter
          updatedAt: new Date(),
        })
        .where(eq(chatbotConversations.id, conversationId))
        .then(() => {})
    )

    log.info(`Summary generated: "${summary.substring(0, 100)}..."`)
  }
}

/**
 * Update conversation intent state
 * Called by tools when booking state changes
 */
export async function updateConversationIntent(
  conversationId: string,
  intentUpdate: Partial<ConversationIntent>
): Promise<void> {
  // Get current intent
  const conversation = await db
    .select({ currentIntent: chatbotConversations.currentIntent })
    .from(chatbotConversations)
    .where(eq(chatbotConversations.id, conversationId))
    .limit(1)
    .then(rows => rows[0])

  const currentIntent = (conversation?.currentIntent as ConversationIntent) || {
    state: 'idle',
    lastUpdated: new Date().toISOString(),
  }

  // Merge update
  const newIntent: ConversationIntent = {
    ...currentIntent,
    ...intentUpdate,
    lastUpdated: new Date().toISOString(),
  }

  await db
    .update(chatbotConversations)
    .set({
      currentIntent: newIntent,
      updatedAt: new Date(),
    })
    .where(eq(chatbotConversations.id, conversationId))

  log.info(`Updated conversation ${conversationId}: ${currentIntent.state} -> ${newIntent.state}`)
}

/**
 * Build intent context for system prompt
 * Used when customer reconnects to resume booking flow
 */
async function buildIntentContext(intent: ConversationIntent | null, locale: Locale = 'de'): Promise<string> {
  if (!intent || intent.state === 'idle') {
    return ''
  }

  const ti = await getEmailTranslations(locale, 'chatbotPrompts.intent')
  const parts: string[] = []

  switch (intent.state) {
    case 'browsing_services':
      parts.push(ti('browsingServices'))
      break

    case 'checking_availability':
      if (intent.serviceName) {
        parts.push(ti('interestedIn', { service: intent.serviceName }))
      }
      if (intent.selectedDate) {
        parts.push(ti('desiredDate', { date: intent.selectedDate }))
      }
      break

    case 'hold_active':
      parts.push(ti('activeHold'))
      if (intent.holdId) parts.push(`Hold-ID: ${intent.holdId}`)
      if (intent.holdExpiresAt) {
        const expiresAt = new Date(intent.holdExpiresAt)
        const now = new Date()
        if (expiresAt > now) {
          const minutesLeft = Math.round((expiresAt.getTime() - now.getTime()) / 60000)
          parts.push(ti('holdExpires', { minutes: minutesLeft }))
        } else {
          parts.push(ti('holdMaybeExpired'))
        }
      }
      if (intent.serviceName) parts.push(`Service: ${intent.serviceName}`)
      if (intent.selectedSlot?.staffName) parts.push(`Staff: ${intent.selectedSlot.staffName}`)
      break

    case 'collecting_details':
      parts.push(ti('collectingDetails'))
      if (intent.customerData?.name) parts.push(`Name: ${intent.customerData.name}`)
      if (intent.customerData?.email) parts.push(`Email: ${intent.customerData.email}`)
      break

    case 'awaiting_confirmation':
      parts.push(ti('awaitingConfirmation'))
      break
  }

  if (parts.length === 0) return ''

  return `\n\n${ti('previousSessionTitle')}
${parts.join('\n')}
${ti('resumeBooking')}
`
}

/**
 * Business context for dynamic system prompts
 */
interface BusinessContext {
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
 * Role type for prompt building
 */
type UserRole = 'customer' | 'staff' | 'owner'

/**
 * Build base prompt - shared by all roles
 */
async function buildBasePrompt(
  context: BusinessContext,
  businessId: string,
  channel: string,
  locale: Locale = 'de'
): Promise<string> {
  const tb = await getEmailTranslations(locale, 'chatbotPrompts.base')
  const tt = await getEmailTranslations(locale, 'chatbotPrompts.businessTypes')

  const businessType = tt(context.type || 'other')
  const contact = context.email || context.phone || 'our team'
  const languageRule = locale === 'de' ? tb('alwaysGerman') : tb('alwaysEnglish')

  return `${tb('intro', { name: context.name, type: businessType })}

${context.customInstructions || ''}

${tb('compliance')}
- ${tb('complianceFirst', { name: context.name })}
- ${tb('complianceNeverHuman')}
- ${tb('complianceBotQuestion', { name: context.name })}
- ${tb('complianceError', { contact })}
${channel === 'whatsapp' ? `- ${tb('complianceWhatsapp')}` : ''}

${tb('rulesTitle')}
1. ${tb('ruleServices')}
2. ${tb('ruleAvailability')}
3. ${tb('ruleDate')}
4. ${tb('ruleKnowledge')}

${tb('errorTitle')}
- ${tb('errorInvalidArgs')}
- ${tb('errorSlotUnavailable')}
- ${tb('errorHoldExpired')}
- ${tb('errorEscalate')}

WICHTIG: ${tb('businessIdNote', { businessId })}

${languageRule}`
}

/**
 * Build customer overlay - booking flow, FAQs
 */
async function buildCustomerOverlay(businessId: string, locale: Locale = 'de'): Promise<string> {
  const tc = await getEmailTranslations(locale, 'chatbotPrompts.customer')

  return `

${tc('roleTitle')}
- ${tc('roleDescription')}
- ${tc('roleBookings')}
- ${tc('roleFormal')}

${tc('bookingTitle')}

1. Service auswählen
   → get_available_services()
   → Zeige Namen, Preis, Dauer

2. Verfügbarkeit prüfen
   → get_current_date() aufrufen
   → check_availability(date: YYYY-MM-DD) aufrufen
   → Zeige Slots: "Slot 1: 07:00, Slot 2: 08:00..."

3. Slot reservieren
   → Finde den Slot aus check_availability Antwort
   → Der Slot enthält: start, serviceId, staffId, staffName
   → create_hold(businessId: "${businessId}", serviceId, staffId, startsAt)
   → WICHTIG: Verwende serviceId und staffId DIREKT aus dem Slot-Objekt

4. Kundendaten sammeln
   → Name, E-Mail, Telefon

5. Buchung abschließen
   → confirm_booking()

VERFÜGBARE TOOLS:
- get_current_date
- get_available_services
- get_available_staff
- check_availability
- create_hold
- confirm_booking
- search_knowledge_base`
}

/**
 * Build staff overlay - booking management, customer lookup
 */
async function buildStaffOverlay(): Promise<string> {
  return `

ADMIN-ROLLE FÜR MITARBEITER:
- Vollständiger Zugriff auf Buchungsverwaltung
- Kundendaten einsehen und bearbeiten
- E-Mails an Kunden senden

BOOKING MANAGEMENT TOOLS:
- get_todays_bookings: Heutige Termine anzeigen
- get_upcoming_bookings: Kommende Termine (7 Tage)
- create_booking_admin: Direktbuchung erstellen (ohne Hold-Flow)
- cancel_booking_with_notification: Stornieren + Kunde benachrichtigen
- search_bookings: Buchungen suchen
- update_booking_status: Status ändern
- reschedule_booking: Termin verschieben

CUSTOMER MANAGEMENT TOOLS:
- create_customer: Neuen Kunden anlegen
- update_customer: Bestehenden Kunden aktualisieren (Name, E-Mail, Telefon, Notizen)
- search_customers: Kunden suchen
- get_customer_bookings: Kundenhistorie anzeigen

COMMUNICATION TOOLS:
- send_email_to_customer: E-Mail an Kunden senden
- resend_booking_confirmation: Bestätigung erneut senden`
}

/**
 * Build owner overlay - analytics, conversation management
 */
async function buildOwnerOverlay(): Promise<string> {
  return `

INHABER-ROLLE (zusätzlich zu Mitarbeiter-Tools):
- Tagesübersichten und Statistiken
- Eskalierte Gespräche verwalten
- Gesprächsverläufe durchsuchen

ANALYTICS & REPORTING TOOLS:
- get_daily_summary: Tagesstatistiken (Buchungen, Umsatz, No-Shows)

CONVERSATION MANAGEMENT TOOLS:
- get_escalated_conversations: Eskalierte Chats anzeigen
- search_customer_conversations: Vergangene Gespräche durchsuchen`
}

/**
 * Build standalone assistant prompt for /tools/assistant
 * NOT layered — replaces getSystemPrompt() entirely
 */
async function buildAssistantPrompt(businessName: string, businessId: string, locale: Locale = 'de'): Promise<string> {
  const ta = await getEmailTranslations(locale, 'chatbotPrompts.assistant')
  const languageRule = locale === 'de' ? ta('alwaysGerman') : ta('alwaysGerman') // assistant always German for now
  return `Du bist der interne Geschäftsassistent für ${businessName}.
Du unterstützt den Inhaber bei allen betrieblichen Aufgaben.

Du hast Zugriff auf:
- Buchungskalender, Kundendaten, Rechnungen, Lieferscheine
- Monatsplanung, Wissensdatenbank (öffentlich + intern)
- Kommunikation (E-Mail, WhatsApp)
- Tagesübersicht und Statistiken
- Mitarbeiterverwaltung und Terminplanung
- Buchungsflexibilität (Dauer anpassen, Mitarbeiter zuweisen)
- Krankheitsplanung (betroffene Buchungen finden, Zeiträume blockieren)
- Dienstleistungsverwaltung (erstellen, bearbeiten, deaktivieren)

VERHALTEN:
- Sei proaktiv und strukturiert
- Formatiere Daten als übersichtliche Listen
- Bei Tagesübersicht: get_daily_summary + get_todays_bookings
- Bei Kundenfragen: search_customers → get_customer_bookings
- Bei Rechnungsfragen: search_invoices → get_invoice_details
- Bei Monatsplanung/Verfügbarkeit/Auslastung: get_monthly_schedule (EINMAL aufrufen — enthält Buchungen + freie Kapazität + Zusammenfassung. NICHT check_availability pro Service!)
- Bei Krankheit: get_affected_bookings → block_staff_period → Kunden benachrichtigen
- Bei Terminänderung mit anderer Dauer: reschedule_booking mit durationMinutes
- Bei Mitarbeiterzuweisung: update_booking mit staffId (prüft Service-Qualifikation)
- Bei neuer Dienstleistung: Frage nach Name und Dauer (Pflicht), dann optional Beschreibung, Kategorie, Preis → create_service
- Bei Änderung einer Dienstleistung: get_available_services → update_service
- Bei Löschung: get_available_services → Bestätigung einholen → delete_service

DATEI-UPLOAD:
- Wenn der Nutzer eine Datei hochlädt, siehst du [HOCHGELADENE DATEIEN] mit documentId und r2Key
- FRAGE IMMER wie das Dokument verwendet werden soll, falls nicht angegeben:
  • Öffentlich oder intern?
  • Kundenspezifisch? Für welchen Kunden?
  • In Wissensdatenbank indexieren oder nur speichern?
- Nutze classify_uploaded_document sobald klar ist
- Wenn "für [Kunde]" → scopeType='customer', suche Kunden mit search_customers
- Wenn "schick das an [Kunde]" → send_email_with_attachments mit der r2Key

E-MAIL MIT ANHANG:
- send_email_with_attachments kann R2-Dateien anhängen
- Für Rechnungen: send_invoice versendet Rechnung direkt per E-Mail
- Hochgeladene Dateien: r2Key aus dem Upload

RECHNUNGS-WORKFLOW:
- Rechnung erstellen: get_customer_bookings → create_invoice (Entwurf)
- Rechnung versenden: send_invoice (PDF + E-Mail, draft → sent)
- Bezahlt markieren: mark_invoice_paid (sent → paid)
- Stornierung: cancel_invoice_storno (erstellt Stornorechnung)
- Ersatzrechnung: update_booking_items → create_replacement_invoice
- IMMER zuerst get_booking_documents prüfen ob Rechnung existiert
- IMMER Stornierungsgrund erfragen vor cancel_invoice_storno

LIEFERSCHEIN:
- generate_lieferschein erstellt PDF aus Buchungspositionen
- Benötigt Positionen → ggf. erst update_booking_items

POSITIONEN:
- update_booking_items: action "add"/"replace"/"remove"
- Beispiel: "2x Seilklettern 50€" → add mit items [{description:"Seilklettern",quantity:2,unitPrice:"50.00"}]

DOWNLOAD — STRENGE REGELN:
- Für Downloads IMMER get_download_link aufrufen (gibt presigned https:// URL zurück)
- NIEMALS R2-Keys oder Dateipfade direkt als Download-Link verwenden
- Ergebnis von get_download_link enthält url und filename
- Diese EXAKT als [DOWNLOAD:url|dateiname] in Antwort einbauen
- Nutzer sieht dann automatisch einen Download-Button

WICHTIG:
- businessId für alle Tools: ${businessId}
- Antworte IMMER auf Deutsch
- Erfinde KEINE Daten — verwende NUR Tool-Ergebnisse`
}

/**
 * Get system prompt for the chatbot based on business context and role
 *
 * Architecture: Base + Role Overlay
 * - Base prompt: Shared by all roles (business context, compliance, error handling)
 * - Customer overlay: Booking flow, FAQs
 * - Staff overlay: + Booking management, customer lookup, communication
 * - Owner overlay: + Analytics, conversation management
 */
async function getSystemPrompt(
  context: BusinessContext,
  businessId: string,
  channel: string = 'web',
  role: UserRole = 'customer',
  locale: Locale = 'de'
): Promise<string> {
  // Build base prompt
  let prompt = await buildBasePrompt(context, businessId, channel, locale)

  // Add customer overlay (always included)
  prompt += await buildCustomerOverlay(businessId, locale)

  // Add staff overlay for staff and owner
  if (role === 'staff' || role === 'owner') {
    prompt += await buildStaffOverlay()
  }

  // Add owner overlay for owner only
  if (role === 'owner') {
    prompt += await buildOwnerOverlay()
  }

  return prompt
}

/**
 * Access context for search operations (Phase 1: Business Logic Separation)
 */
export interface ChatAccessContext {
  actorType: 'customer' | 'staff' | 'owner'
  actorId?: string  // customerId or clerkUserId
  customerScopeId?: string  // For staff querying about specific customer
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
  adminContext?: { userId: string; role: string; isAdmin: boolean }
  // Phase 1: Access context for search operations
  accessContext?: ChatAccessContext
  // Virtual Assistant mode
  isAssistant?: boolean
  // Force a specific mode (used by demo page)
  forceMode?: 'customer' | 'assistant'
  // Per-member tool capabilities (overrides role defaults when set)
  memberCapabilities?: { allowedTools?: string[] }
  // Uploaded files attached to this message
  attachedFiles?: Array<{
    documentId: string
    versionId: string
    r2Key: string
    filename: string
    contentType: string
    fileSize: number
  }>
}): Promise<{
  conversationId: string
  response: string
  metadata?: Record<string, unknown>
}> {
  const { businessId, message, channel = 'web', customerId, adminContext, accessContext, isAssistant: isAssistantParam, memberCapabilities, attachedFiles, forceMode } = params

  // forceMode overrides isAssistant
  const isAssistant = forceMode === 'assistant' || isAssistantParam

  // Determine user role
  let userRole: UserRole = 'customer'
  if (isAssistant) {
    userRole = 'owner'
  } else if (adminContext?.isAdmin) {
    userRole = adminContext.role === 'owner' ? 'owner' : 'staff'
  }

  // Derive access context if not provided
  // For assistant mode, force owner access
  const effectiveAccessContext: ChatAccessContext = isAssistant
    ? { actorType: 'owner', actorId: adminContext?.userId }
    : accessContext || {
        actorType: userRole,
        actorId: userRole !== 'customer' ? adminContext?.userId : customerId,
      }

  // 1. Get business info
  const business = await dbRetry(() =>
    db
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1)
      .then(rows => rows[0])
  )

  if (!business) {
    throw new Error('Business not found')
  }

  // 2. Get active services for context
  const businessServices = await dbRetry(() =>
    db
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
  )

  // 3. Build business context for dynamic prompt
  const businessContext: BusinessContext = {
    name: business.name,
    type: business.type,
    email: business.email,
    phone: business.phone,
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
    const [conversation] = await dbRetry(() =>
      db
        .insert(chatbotConversations)
        .values({
          businessId,
          customerId,
          channel,
          status: 'active',
        })
        .returning()
    )

    conversationId = conversation.id
  }

  // 4b. Resolve business locale for prompts
  const businessLocale = await getBusinessLocale(businessId)

  // 5. Build message with optional file context
  let augmentedMessage = message
  if (attachedFiles && attachedFiles.length > 0) {
    const fileList = attachedFiles
      .map(f => `- ${f.filename} (documentId: ${f.documentId}, r2Key: ${f.r2Key})`)
      .join('\n')
    augmentedMessage = `${message}\n\n[HOCHGELADENE DATEIEN]\n${fileList}`
  }

  // Save user message
  await dbRetry(() =>
    db.insert(chatbotMessages).values({
      conversationId,
      role: 'user',
      content: augmentedMessage,
      ...(attachedFiles && attachedFiles.length > 0 ? { metadata: { attachedFiles } } : {}),
    })
  )

  // 6. Load optimized conversation context (summary + recent messages)
  const context = await loadConversationContext(conversationId)

  // Build history from context
  const history = context.messages

  // Build intent context for reconnecting customers
  const intentContext = await buildIntentContext(context.intent, businessLocale)

  // Build summary context if available
  const tsSummary = await getEmailTranslations(businessLocale, 'chatbotPrompts.summary')
  const summaryContext = context.summary
    ? `\n\n${tsSummary('previousSummary')}\n${context.summary}\n`
    : ''

  // 7. Filter tools based on user role
  // Customer-only tools (base tools for booking flow)
  const customerTools = [
    'get_current_date',
    'get_available_services',
    'get_available_staff',
    'check_availability',
    'create_hold',
    'confirm_booking',
    'search_knowledge_base',
  ]

  // Staff tools (customer tools + booking/customer management)
  const staffTools = [
    ...customerTools,
    'search_bookings',
    'update_booking_status',
    'reschedule_booking',
    'get_todays_bookings',
    'get_upcoming_bookings',
    'create_booking_admin',
    'cancel_booking_with_notification',
    'create_customer',
    'update_customer',
    'search_customers',
    'get_customer_bookings',
    'send_email_to_customer',
    'resend_booking_confirmation',
  ]

  // Owner tools (staff tools + analytics + conversation management)
  const ownerTools = [
    ...staffTools,
    'get_daily_summary',
    'get_escalated_conversations',
    'search_customer_conversations',
  ]

  // Assistant tools (all owner tools + assistant-only tools)
  const assistantTools = [
    ...ownerTools,
    'search_invoices',
    'get_invoice_details',
    'get_booking_documents',
    'get_monthly_schedule',
    'block_day',
    'send_whatsapp',
    'add_knowledge_entry',
    'update_booking',
    'get_affected_bookings',
    'block_staff_period',
    'create_service',
    'update_service',
    'delete_service',
    'create_staff',
    'update_staff',
    'delete_staff',
    'assign_staff_to_service',
    'remove_staff_from_service',
    'get_availability_template',
    'update_availability_template',
    'update_business_profile',
    'update_booking_rules',
    'update_knowledge_entry',
    'delete_knowledge_entry',
    'delete_customer',
    'update_staff_service_priority',
    'classify_uploaded_document',
    'send_email_with_attachments',
    'create_invoice',
    'send_invoice',
    'mark_invoice_paid',
    'cancel_invoice_storno',
    'create_replacement_invoice',
    'generate_lieferschein',
    'update_booking_items',
    'get_download_link',
  ]

  // Select tools based on role (with per-member capability overrides)
  let allowedToolNames: string[]
  if (isAssistant) {
    allowedToolNames = assistantTools
  } else if (memberCapabilities?.allowedTools) {
    // Custom per-member capabilities — always include customer baseline
    allowedToolNames = [...new Set([...customerTools, ...memberCapabilities.allowedTools])]
  } else {
    switch (userRole) {
      case 'owner':
        allowedToolNames = ownerTools
        break
      case 'staff':
        allowedToolNames = staffTools
        break
      default:
        allowedToolNames = customerTools
    }
  }

  const availableTools = tools.filter(t => allowedToolNames.includes(t.function.name))

  // 8. Build messages for AI with dynamic system prompt
  // Include summary and intent context for better continuity
  const systemPromptContent = isAssistant
    ? (await buildAssistantPrompt(business.name, businessId, businessLocale)) + summaryContext
    : (await getSystemPrompt(businessContext, businessId, channel, userRole, businessLocale)) + summaryContext + intentContext

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: systemPromptContent,
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
  const aiConfig = await getAIConfig(businessId)
  const completionOpts = isAssistant
    ? { model: aiConfig.chatbotModel, apiKey: aiConfig.apiKey, temperature: 0.5, max_tokens: 2000 }
    : { model: aiConfig.chatbotModel, apiKey: aiConfig.apiKey, temperature: 0.7, max_tokens: 1000 }

  let response = await createChatCompletion({
    messages,
    tools: availableTools,
    ...completionOpts,
  })

  // Fire-and-forget usage logging (never await in chatbot path)
  logAIUsage({
    businessId,
    channel: 'chatbot',
    model: response.model || aiConfig.chatbotModel,
    promptTokens: response.usage?.prompt_tokens,
    completionTokens: response.usage?.completion_tokens,
    totalTokens: response.usage?.total_tokens,
  })

  // Validate response structure
  if (!response || !response.choices || !response.choices[0]) {
    log.error('Invalid OpenRouter response structure:', {
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
  const allToolNames: string[] = []

  while (toolCalls && toolCalls.length > 0 && toolRound < maxToolRounds) {
    toolRound++

    // Save assistant message with tool calls
    await dbRetry(() =>
      db.insert(chatbotMessages).values({
        conversationId,
        role: 'assistant',
        content: assistantMessage.content || '',
        metadata: { tool_calls: toolCalls },
      })
    )

    // Execute each tool call
    const toolResults: ChatMessage[] = []

    for (const toolCall of toolCalls) {
      const toolName = toolCall.function.name
      allToolNames.push(toolName)
      const rawArgs = toolCall.function.arguments

      // PHASE 1 FIX A: Parse arguments with structured result
      const parseResult = parseToolArguments(rawArgs)

      if (!parseResult.success) {
        log.error(`Parse failed for ${toolName}:`, parseResult.error)

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
        const properties = (toolDef.function.parameters.properties || {}) as Record<string, { type?: string }>

        // Check for missing/invalid required fields
        const missing: string[] = []
        for (const key of required) {
          const value = toolArgs[key]
          const propType = properties[key]?.type

          // Missing if undefined or null
          if (value === undefined || value === null) {
            // Skip businessId - we inject it server-side (line 867)
            if (key !== 'businessId') {
              missing.push(key)
            }
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
          log.error(`Missing required args for ${toolName}:`, missing)

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
      // Also inject access context for search operations and conversationId for intent tracking
      const safeToolArgs = {
        ...toolArgs,
        businessId: businessId, // Force to conversation's businessId
        // Phase 1: Pass access context for access-controlled searches
        _accessContext: {
          actorType: effectiveAccessContext.actorType,
          actorId: effectiveAccessContext.actorId,
          customerScopeId: effectiveAccessContext.customerScopeId,
        },
        // Per-member capabilities for defense-in-depth
        ...(memberCapabilities?.allowedTools ? { _memberCapabilities: memberCapabilities } : {}),
        // Memory: Pass conversationId for intent tracking
        _conversationId: conversationId,
      }

      log.info(`Executing tool: ${toolName}`, {
        originalBusinessId: toolArgs.businessId,
        injectedBusinessId: safeToolArgs.businessId,
        actorType: effectiveAccessContext.actorType,
        args: { ...safeToolArgs, _accessContext: '[REDACTED]' }, // Don't log full context
      })

      try {
        // Execute with safe args (businessId guaranteed correct, access context included)
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
        log.error(`Tool execution error:`, error)

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
      ...completionOpts,
    })

    // Fire-and-forget usage logging (never await in chatbot path)
    logAIUsage({
      businessId,
      channel: 'chatbot',
      model: response.model || aiConfig.chatbotModel,
      promptTokens: response.usage?.prompt_tokens,
      completionTokens: response.usage?.completion_tokens,
      totalTokens: response.usage?.total_tokens,
    })

    // Validate response structure
    if (!response || !response.choices || !response.choices[0]) {
      log.error('Invalid OpenRouter response structure:', {
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
    const tFallback = await getEmailTranslations(businessLocale, 'chatbotPrompts.fallback')
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
      finalResponse = tFallback('toolError')
    } else {
      finalResponse = tFallback('noResponse')
    }

    log.warn('AI failed to generate response, using fallback', {
      conversationId,
      hadToolErrors,
      toolRound,
    })
  }

  // 11. Save final assistant response with decision metadata (EU AI Act traceability)
  const fallbackTriggered = !response.choices[0]?.message?.content || response.choices[0].message.content.trim() === ''
  await dbRetry(() =>
    db.insert(chatbotMessages).values({
      conversationId,
      role: 'assistant',
      content: finalResponse || '',
      metadata: {
        model: response.model,
        usage: response.usage,
      },
      decisionMetadata: {
        toolsUsed: allToolNames,
        modelName: response.model,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        fallbackTriggered,
      },
    })
  )

  // 12. Update conversation timestamp and check if summary needed
  // Increment message count (user message + assistant response = 2)
  const newMessageCount = context.messagesSinceSummary + 2

  // Update summary in background (non-blocking)
  updateSummaryIfNeeded(conversationId, newMessageCount, businessLocale).catch(err => {
    log.error('Summary update failed:', err)
  })

  return {
    conversationId,
    response: finalResponse || (businessLocale === 'en' ? 'Sorry, I could not generate a response.' : 'Entschuldigung, ich konnte keine Antwort generieren.'),
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
  const messages = await dbRetry(() =>
    db
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
  )

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

  // Check which conversations have staff messages
  const conversationIds = conversations.map(c => c.id)
  let staffConversationIds: Set<string> = new Set()

  if (conversationIds.length > 0) {
    const staffMessages = await db
      .select({ conversationId: chatbotMessages.conversationId })
      .from(chatbotMessages)
      .where(and(
        inArray(chatbotMessages.conversationId, conversationIds),
        eq(chatbotMessages.role, 'staff')
      ))

    staffConversationIds = new Set(staffMessages.map(m => m.conversationId))
  }

  return conversations.map(c => ({
    ...c,
    hasStaffMessages: staffConversationIds.has(c.id),
  }))
}
