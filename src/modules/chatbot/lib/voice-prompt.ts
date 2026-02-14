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

import type { Locale } from '@/i18n/config'
import { getEmailTranslations } from '@/lib/email-i18n'

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
export async function buildVoiceSystemPrompt(
  context: VoiceBusinessContext,
  businessId: string,
  locale: Locale = 'de',
): Promise<string> {
  const tv = await getEmailTranslations(locale, 'chatbotPrompts.voice')
  const tt = await getEmailTranslations(locale, 'chatbotPrompts.businessTypes')
  const tb = await getEmailTranslations(locale, 'chatbotPrompts.base')

  const businessType = tt(context.type || 'other')

  const serviceList = context.services.length > 0
    ? context.services
        .map((s) => `- ${s.name}${s.description ? `: ${s.description}` : ''}`)
        .join('\n')
    : tv('noServicesConfigured')

  return `${tv('intro', { name: context.name, type: businessType })}
${tv('alwaysLanguage')}

${context.customInstructions || ''}

${tv('behavior')}
- ${tv('keepShort')}
- ${tv('friendly')}
- ${tv('checkingTool')}
- ${tv('spellEmail')}
- ${tv('confirmPhone')}
- ${tv('spellDates')}
- ${tv('spellTimes')}
- ${tv('noUrls')}
- ${tv('repeatRequest')}
- ${tv('goodbye')}

${tb('compliance')}
- ${tv('complianceFirst')}
- ${tv('complianceExample', { name: context.name })}
- ${tv('complianceBotAnswer')}
- ${tv('complianceErrorFallback')}

SERVICES:
${serviceList}

BOOKING FLOW:
1. Service → get_available_services()
2. Date → get_current_date() + check_availability()
3. Hold → create_hold()
4. Customer data → Name, Email, Phone
5. Confirm → confirm_booking()

RULES:
1. ${tb('ruleServices')}
2. ${tb('ruleAvailability')}
3. ${tb('ruleDate')}
4. ${tb('ruleKnowledge')}
5. ${tb('errorTitle')}

ERROR HANDLING:
- ${tv('errorTool')}
- ${tv('errorSlot')}
- ${tv('errorHold')}

WICHTIG: ${tb('businessIdNote', { businessId })}`
}

/**
 * Build voice system prompt for owner/admin callers.
 *
 * Uses the assistant prompt style but adapted for phone:
 * - No URLs or links
 * - Concise spoken format
 * - Full admin tool access
 */
export async function buildOwnerVoiceSystemPrompt(
  context: VoiceBusinessContext,
  businessId: string,
  locale: Locale = 'de',
): Promise<string> {
  const tv = await getEmailTranslations(locale, 'chatbotPrompts.voice')
  const tb = await getEmailTranslations(locale, 'chatbotPrompts.base')

  return `${tv('ownerIntro', { name: context.name })}
${tv('alwaysLanguage')}

${context.customInstructions || ''}

${tv('behavior')}
- ${tv('keepShort')}
- ${tv('ownerFriendly')}
- ${tv('ownerCheckTool')}
- ${tv('spellDates')}
- ${tv('spellTimes')}
- ${tv('noUrls')}
- ${tv('ownerGoodbye')}

ACCESS:
- Booking calendar, customer data, invoices
- Monthly planning, knowledge base
- Email and WhatsApp communication
- Daily overview and statistics
- Staff management and scheduling
- Service management

BEHAVIOR:
- Be proactive and structured
- Daily overview: get_daily_summary + get_todays_bookings
- Customer questions: search_customers → get_customer_bookings
- Invoice questions: search_invoices → get_invoice_details
- Do NOT invent data — use ONLY tool results

WICHTIG: ${tb('businessIdNote', { businessId })}`
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
