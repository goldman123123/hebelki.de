import { createChatCompletion } from '@/modules/chatbot/lib/openrouter'
import { db } from '@/lib/db'
import { businesses, services, staff, chatbotKnowledge } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { getAIConfig } from '@/lib/ai/config'
import { logAIUsage } from '@/lib/ai/usage'
import { createLogger } from '@/lib/logger'

const log = createLogger('posts:generate-post')

// ── Types ──────────────────────────────────────────────────────────

export type PostType =
  | 'service_spotlight'
  | 'tip_educational'
  | 'seasonal_promo'
  | 'team_intro'
  | 'faq_answer'
  | 'general_awareness'

export type Platform = 'instagram' | 'facebook' | 'linkedin'

export interface GeneratePostOptions {
  postType: PostType
  platform: Platform
  selectedServiceIds?: string[]
  customInstructions?: string
}

export interface GeneratedPost {
  caption: string
  hashtags: string[]
  callToAction: string
  featuredServices: { name: string; price: string | null; duration: string }[]
  characterCount: number
}

interface BusinessData {
  business: typeof businesses.$inferSelect
  serviceList: (typeof services.$inferSelect)[]
  staffList: (typeof staff.$inferSelect)[]
  knowledgeEntries: { title: string | null; content: string; category: string | null }[]
}

// ── Data Fetching ──────────────────────────────────────────────────

async function fetchBusinessData(businessId: string): Promise<BusinessData> {
  const [businessData, serviceList, staffList, knowledgeEntries] = await Promise.all([
    db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1).then(r => r[0]),
    db.select().from(services).where(and(eq(services.businessId, businessId), eq(services.isActive, true))),
    db.select().from(staff).where(and(eq(staff.businessId, businessId), eq(staff.isActive, true), isNull(staff.deletedAt))),
    db.select({
      title: chatbotKnowledge.title,
      content: chatbotKnowledge.content,
      category: chatbotKnowledge.category,
    }).from(chatbotKnowledge).where(
      and(
        eq(chatbotKnowledge.businessId, businessId),
        eq(chatbotKnowledge.isActive, true),
        eq(chatbotKnowledge.audience, 'public'),
      )
    ),
  ])

  if (!businessData) throw new Error('Business not found')

  return { business: businessData, serviceList, staffList, knowledgeEntries }
}

// ── Platform Rules ─────────────────────────────────────────────────

const PLATFORM_RULES: Record<Platform, string> = {
  instagram: `Plattform: Instagram
- Emoji-freundlich, visuell ansprechend
- 20-30 relevante Hashtags
- Maximal ~2200 Zeichen
- Kurze Absätze, Zeilenumbrüche für Lesbarkeit
- Call-to-Action: "Link in Bio" oder "Jetzt buchen"`,

  facebook: `Plattform: Facebook
- Gesprächiger, persönlicher Ton
- 3-5 Hashtags (nicht mehr)
- Link kann direkt im Text stehen
- Längere Texte OK, aber mit Hook am Anfang
- Fragen stellen um Engagement zu fördern`,

  linkedin: `Plattform: LinkedIn
- Professioneller, seriöser Ton
- Branchenrelevante Perspektive
- 3-5 Hashtags
- Mehrwert und Expertise betonen
- Business-Kontext und Fachkompetenz zeigen`,
}

// ── Post Type Descriptions ─────────────────────────────────────────

const POST_TYPE_INSTRUCTIONS: Record<PostType, string> = {
  service_spotlight: `Erstelle einen Post, der 1-3 ausgewählte Dienstleistungen hervorhebt.
Betone Vorteile, Preis (wenn vorhanden), und Dauer.
Mache Lust, diese Leistung zu buchen.`,

  tip_educational: `Erstelle einen informativen Post mit einem Experten-Tipp oder Ratschlag.
Nutze Wissen aus der Wissensdatenbank des Unternehmens.
Positioniere das Unternehmen als Experte in seinem Bereich.`,

  seasonal_promo: `Erstelle einen saisonalen oder anlassbezogenen Werbepost.
Verbinde die ausgewählten Dienstleistungen mit dem aktuellen Anlass.
Schaffe Dringlichkeit und Handlungsaufforderung.`,

  team_intro: `Erstelle einen Post, der das Team oder einzelne Teammitglieder vorstellt.
Zeige die menschliche Seite des Unternehmens.
Betone Qualifikationen und Persönlichkeit.`,

  faq_answer: `Erstelle einen Post, der eine häufig gestellte Frage beantwortet.
Nutze Einträge aus der Wissensdatenbank (besonders FAQ-Kategorie).
Informativ und hilfreich, positioniert das Unternehmen als vertrauenswürdig.`,

  general_awareness: `Erstelle einen Markenbekanntheit-Post: Warum sollte man dieses Unternehmen wählen?
Nutze Unternehmensbeschreibung und Wissensdatenbank.
Betone Alleinstellungsmerkmale und Vertrauen.`,
}

// ── Prompt Builder ─────────────────────────────────────────────────

function buildPostPrompt(data: BusinessData, options: GeneratePostOptions): string {
  const { business, serviceList, staffList, knowledgeEntries } = data
  const { postType, platform, selectedServiceIds, customInstructions } = options

  // Filter to selected services if specified
  const featured = selectedServiceIds?.length
    ? serviceList.filter(s => selectedServiceIds.includes(s.id))
    : serviceList

  const servicesBlock = featured.length > 0
    ? featured.map(s =>
        `- ${s.name}: ${s.description || 'Keine Beschreibung'} (${s.durationMinutes} Min., ${s.price ? s.price + ' EUR' : 'Preis auf Anfrage'})`
      ).join('\n')
    : 'Keine Dienstleistungen ausgewählt.'

  const staffBlock = staffList.length > 0
    ? staffList.map(s => `- ${s.name}: ${s.title || 'Mitarbeiter'} — ${s.bio || 'Keine Bio'}`).join('\n')
    : 'Kein Team registriert.'

  const knowledgeBlock = knowledgeEntries.length > 0
    ? knowledgeEntries.map(k => `[${k.category || 'allgemein'}] ${k.title || ''}: ${k.content.substring(0, 300)}`).join('\n\n')
    : 'Keine Wissensdatenbank-Einträge.'

  return `Du bist ein Social-Media-Experte für deutsche Unternehmen.
Schreibe ALLES auf Deutsch.

## Unternehmen
- Name: ${business.name}
- Typ: ${business.type}
- Tagline: ${business.tagline || 'Keine'}
- Beschreibung: ${business.description || 'Keine'}
- Buchungslink: https://www.hebelki.de/book/${business.slug}

## Dienstleistungen
${servicesBlock}

## Team
${staffBlock}

## Wissensdatenbank
${knowledgeBlock}

## Aufgabe
${POST_TYPE_INSTRUCTIONS[postType]}

## Plattform-Regeln
${PLATFORM_RULES[platform]}

${customInstructions ? `## Besondere Hinweise vom Nutzer\n${customInstructions}\n` : ''}
## WICHTIGE REGELN
1. Erfinde KEINE Preise, Telefonnummern oder Adressen — verwende NUR die oben angegebenen Daten.
2. Wenn ein Preis angegeben ist, verwende ihn exakt. Wenn "Preis auf Anfrage", schreibe das.
3. Der Buchungslink ist: https://www.hebelki.de/book/${business.slug}
4. Hashtags müssen relevant zum Unternehmen und zur Branche sein.

Antworte NUR mit validem JSON (kein Markdown, keine Code-Blöcke):
{
  "caption": "string (der vollständige Post-Text OHNE Hashtags)",
  "hashtags": ["string (ohne #-Zeichen, z.B. 'friseur' statt '#friseur')"],
  "callToAction": "string (z.B. 'Jetzt Termin buchen unter: https://www.hebelki.de/book/${business.slug}')"
}`
}

// ── Post Generation ────────────────────────────────────────────────

export async function generatePost(
  businessId: string,
  options: GeneratePostOptions,
): Promise<{ post: GeneratedPost; model: string }> {
  const data = await fetchBusinessData(businessId)
  const prompt = buildPostPrompt(data, options)

  const aiConfig = await getAIConfig(businessId)
  const model = aiConfig.postModel
  const response = await createChatCompletion({
    model,
    apiKey: aiConfig.apiKey,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 1500,
  })

  await logAIUsage({
    businessId,
    channel: 'post',
    model: response.model || model,
    promptTokens: response.usage?.prompt_tokens,
    completionTokens: response.usage?.completion_tokens,
    totalTokens: response.usage?.total_tokens,
  })

  const raw = response.choices[0]?.message?.content || '{}'
  const cleaned = raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    log.error('Failed to parse AI response:', cleaned.substring(0, 500))
    parsed = {}
  }

  // Cross-check featured services against real DB data
  const selectedServices = options.selectedServiceIds?.length
    ? data.serviceList.filter(s => options.selectedServiceIds!.includes(s.id))
    : []

  const caption = (parsed.caption as string) || ''
  const hashtags = (parsed.hashtags as string[]) || []
  const callToAction = (parsed.callToAction as string) || `Jetzt buchen: https://www.hebelki.de/book/${data.business.slug}`

  const fullText = `${caption}\n\n${hashtags.map(h => `#${h}`).join(' ')}`

  const post: GeneratedPost = {
    caption,
    hashtags,
    callToAction,
    featuredServices: selectedServices.map(s => ({
      name: s.name,
      price: s.price ? `${s.price} EUR` : null,
      duration: `${s.durationMinutes} Min.`,
    })),
    characterCount: fullText.length,
  }

  return { post, model }
}
