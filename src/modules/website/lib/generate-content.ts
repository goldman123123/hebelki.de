import { createChatCompletion } from '@/modules/chatbot/lib/openrouter'
import { db } from '@/lib/db'
import { businesses, services, staff, chatbotKnowledge, businessWebsites } from '@/lib/db/schema'
import type { WebsiteSectionContent, TemplateId } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { getAIConfig } from '@/lib/ai/config'
import { logAIUsage } from '@/lib/ai/usage'
import { createLogger } from '@/lib/logger'

const log = createLogger('website:generate-content')

interface BusinessData {
  business: typeof businesses.$inferSelect
  serviceList: (typeof services.$inferSelect)[]
  staffList: (typeof staff.$inferSelect)[]
  knowledgeEntries: { title: string | null; content: string; category: string | null }[]
}

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

function buildPrompt(data: BusinessData, templateId: TemplateId): string {
  const { business, serviceList, staffList, knowledgeEntries } = data

  const styleHints: Record<TemplateId, string> = {
    'dark-luxury': 'Elegant, premium, sophisticated tone. Short powerful statements.',
    'brutalism': 'Bold, direct, energetic. Short punchy copy. Unconventional.',
    'glassmorphism': 'Modern, clean, tech-forward. Balanced and polished.',
    'cyberpunk': 'Futuristic, edgy, bold. Technical flair, uppercase energy.',
    'editorial': 'Magazine-quality, storytelling, long-form. Elegant prose.',
    'neo-minimal': 'Ultra-clean, minimal words, maximum impact. Understated luxury.',
  }

  return `You are a professional website copywriter creating a long-form landing page for a German business.
Write ALL content in German. The tone should match: ${styleHints[templateId]}

## Business Info
- Name: ${business.name}
- Type: ${business.type}
- Tagline: ${business.tagline || 'None'}
- Description: ${business.description || 'None'}
- Founded: ${business.foundedYear || 'Unknown'}
- Location: ${business.address || 'Not specified'}

## Services (${serviceList.length})
${serviceList.map(s => `- ${s.name}: ${s.description || 'No description'} (${s.durationMinutes} min, ${s.price ? s.price + ' EUR' : 'Preis auf Anfrage'})`).join('\n')}

## Staff (${staffList.length})
${staffList.map(s => `- ${s.name}: ${s.title || 'Mitarbeiter'} — ${s.bio || 'No bio'}`).join('\n')}

## Knowledge Base Entries (${knowledgeEntries.length})
${knowledgeEntries.map(k => `[${k.category || 'general'}] ${k.title || ''}: ${k.content.substring(0, 300)}`).join('\n\n')}

## Instructions
Generate a COMPREHENSIVE long-form landing page as JSON. This should feel like a real, professional landing page — not a stub.
DO NOT invent hard facts (prices, phone numbers, addresses) — use only the data above.
You MAY create realistic-sounding testimonials, benefit statements, and process descriptions based on the business type and services.

### Content guidelines:
- **about.description**: Write 3-5 rich paragraphs about the business, its mission, what makes it special
- **about.stats**: Generate 4-6 impressive stats (e.g. "Jahre Erfahrung", "Zufriedene Kunden", "Behandlungen/Jahr")
- **testimonials**: Create 3-4 realistic customer testimonials with first names and ratings (4-5 stars)
- **howItWorks**: Write 3-4 clear steps explaining the customer journey (e.g. "Termin buchen" → "Beratung" → "Behandlung" → "Nachsorge")
- **benefits**: Write 4-6 compelling benefit statements about why customers should choose this business
- **faq**: Generate 5-7 frequently asked questions with detailed answers
- **bookingCta**: Write a persuasive call-to-action

Return ONLY valid JSON matching this exact structure (no markdown, no code blocks):
{
  "hero": {
    "headline": "string (3-8 words, impactful)",
    "subheadline": "string (2-3 sentences, compelling)",
    "ctaText": "string (e.g. 'Jetzt Termin buchen')",
    "ctaLink": "/book/${business.slug}"
  },
  "about": {
    "title": "string",
    "description": "string (3-5 paragraphs separated by \\n\\n)",
    "stats": [{"label": "string", "value": "string"}]
  },
  "services": {
    "title": "string",
    "subtitle": "string (1-2 sentences describing the service range)"
  },
  "testimonials": {
    "title": "string",
    "subtitle": "string",
    "items": [{"name": "string (first name only)", "text": "string (2-3 sentences)", "rating": 5}]
  },
  "howItWorks": {
    "title": "string",
    "subtitle": "string",
    "steps": [{"step": "01", "title": "string", "description": "string (1-2 sentences)"}]
  },
  "benefits": {
    "title": "string",
    "subtitle": "string",
    "items": [{"title": "string (2-4 words)", "description": "string (1-2 sentences)"}]
  },
  "faq": {
    "title": "string",
    "subtitle": "string",
    "items": [{"question": "string", "answer": "string (2-4 sentences)"}]
  },
  "bookingCta": {
    "headline": "string (3-8 words)",
    "description": "string (2-3 sentences, persuasive)",
    "ctaText": "string",
    "ctaLink": "/book/${business.slug}"
  },
  "metaTitle": "string (50-60 chars)",
  "metaDescription": "string (150-160 chars)"
}`
}

function mergeFactualData(
  aiContent: Record<string, unknown>,
  data: BusinessData,
): WebsiteSectionContent {
  const { business, serviceList, staffList } = data
  const ai = aiContent as Record<string, Record<string, unknown>>

  const hero = ai.hero as Record<string, string>
  const about = ai.about as Record<string, unknown>
  const servicesAi = ai.services as Record<string, string>
  const testimonialsAi = ai.testimonials as Record<string, unknown>
  const howItWorksAi = ai.howItWorks as Record<string, unknown>
  const benefitsAi = ai.benefits as Record<string, unknown>
  const faq = ai.faq as Record<string, unknown>
  const bookingCta = ai.bookingCta as Record<string, string>

  const socialLinks: { platform: string; url: string }[] = []
  if (business.socialInstagram) socialLinks.push({ platform: 'instagram', url: business.socialInstagram })
  if (business.socialFacebook) socialLinks.push({ platform: 'facebook', url: business.socialFacebook })
  if (business.socialLinkedin) socialLinks.push({ platform: 'linkedin', url: business.socialLinkedin })
  if (business.socialTwitter) socialLinks.push({ platform: 'twitter', url: business.socialTwitter })

  return {
    hero: {
      headline: hero?.headline || business.name,
      subheadline: hero?.subheadline || business.tagline || '',
      ctaText: hero?.ctaText || 'Termin buchen',
      ctaLink: `/book/${business.slug}`,
    },
    about: {
      title: (about?.title as string) || `Über ${business.name}`,
      description: (about?.description as string) || business.description || '',
      stats: (about?.stats as { label: string; value: string }[]) || [],
    },
    services: {
      title: servicesAi?.title || 'Unsere Leistungen',
      subtitle: servicesAi?.subtitle || '',
      items: serviceList.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description || '',
        price: s.price ? `${s.price} €` : null,
        duration: `${s.durationMinutes} Min.`,
      })),
    },
    team: {
      title: 'Unser Team',
      subtitle: '',
      members: staffList.map(s => ({
        id: s.id,
        name: s.name,
        title: s.title || '',
        bio: s.bio || '',
        avatarUrl: s.avatarUrl,
      })),
    },
    testimonials: {
      title: (testimonialsAi?.title as string) || 'Was unsere Kunden sagen',
      subtitle: (testimonialsAi?.subtitle as string) || '',
      items: (testimonialsAi?.items as { name: string; text: string; rating: number }[]) || [],
    },
    howItWorks: {
      title: (howItWorksAi?.title as string) || 'So funktioniert es',
      subtitle: (howItWorksAi?.subtitle as string) || '',
      steps: (howItWorksAi?.steps as { step: string; title: string; description: string }[]) || [],
    },
    benefits: {
      title: (benefitsAi?.title as string) || `Warum ${business.name}`,
      subtitle: (benefitsAi?.subtitle as string) || '',
      items: (benefitsAi?.items as { title: string; description: string }[]) || [],
    },
    faq: {
      title: (faq?.title as string) || 'Häufige Fragen',
      subtitle: (faq?.subtitle as string) || '',
      items: (faq?.items as { question: string; answer: string }[]) || [],
    },
    contact: {
      title: 'Kontakt',
      subtitle: '',
      phone: business.phone,
      email: business.email,
      address: business.address,
      socialLinks,
    },
    bookingCta: {
      headline: bookingCta?.headline || 'Jetzt Termin buchen',
      description: bookingCta?.description || '',
      ctaText: bookingCta?.ctaText || 'Termin buchen',
      ctaLink: `/book/${business.slug}`,
    },
    footer: {
      copyrightText: `© ${new Date().getFullYear()} ${business.legalName || business.name}. Alle Rechte vorbehalten.`,
      legalName: business.legalName,
      legalForm: business.legalForm,
      registrationNumber: business.registrationNumber,
      registrationCourt: business.registrationCourt,
    },
  }
}

export async function generateWebsiteContent(
  businessId: string,
  templateId: TemplateId,
): Promise<{ sections: WebsiteSectionContent; metaTitle: string; metaDescription: string; model: string }> {
  const data = await fetchBusinessData(businessId)
  const prompt = buildPrompt(data, templateId)

  const aiConfig = await getAIConfig(businessId)
  const model = aiConfig.websiteModel
  const response = await createChatCompletion({
    model,
    apiKey: aiConfig.apiKey,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 5000,
  })

  await logAIUsage({
    businessId,
    channel: 'website',
    model: response.model || model,
    promptTokens: response.usage?.prompt_tokens,
    completionTokens: response.usage?.completion_tokens,
    totalTokens: response.usage?.total_tokens,
  })

  const raw = response.choices[0]?.message?.content || '{}'

  // Strip markdown code blocks if present
  const cleaned = raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim()

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    log.error('Failed to parse AI response:', cleaned.substring(0, 500))
    parsed = {}
  }

  const sections = mergeFactualData(parsed, data)
  const metaTitle = (parsed.metaTitle as string) || `${data.business.name} — ${data.business.tagline || data.business.type}`
  const metaDescription = (parsed.metaDescription as string) || data.business.description?.substring(0, 160) || ''

  return { sections, metaTitle, metaDescription, model }
}

export async function regenerateSection(
  businessId: string,
  sectionName: string,
  templateId: TemplateId,
): Promise<Record<string, unknown>> {
  const data = await fetchBusinessData(businessId)

  const styleHints: Record<TemplateId, string> = {
    'dark-luxury': 'Elegant, premium, sophisticated tone.',
    'brutalism': 'Bold, direct, energetic.',
    'glassmorphism': 'Modern, clean, tech-forward.',
    'cyberpunk': 'Futuristic, edgy, bold.',
    'editorial': 'Magazine-quality, storytelling.',
    'neo-minimal': 'Ultra-clean, minimal words.',
  }

  const sectionContext: Record<string, string> = {
    hero: 'headline (3-8 words), subheadline (2-3 sentences), ctaText',
    about: 'title, description (3-5 paragraphs), stats (4-6 items with label + value)',
    testimonials: 'title, subtitle, items (3-4 items with name, text 2-3 sentences, rating 4-5)',
    howItWorks: 'title, subtitle, steps (3-4 items with step number, title, description)',
    benefits: 'title, subtitle, items (4-6 items with title 2-4 words, description 1-2 sentences)',
    faq: 'title, subtitle, items (5-7 questions with detailed answers)',
    bookingCta: 'headline (3-8 words), description (2-3 sentences), ctaText',
  }

  const prompt = `Regenerate ONLY the "${sectionName}" section for this German business website.
Business: ${data.business.name} (${data.business.type})
Services: ${data.serviceList.map(s => s.name).join(', ')}
Knowledge base: ${data.knowledgeEntries.map(k => k.content.substring(0, 200)).join(' | ')}
Tone: ${styleHints[templateId]}
Expected fields: ${sectionContext[sectionName] || 'title, content'}
Return ONLY valid JSON for this single section (no markdown).`

  const aiConfig = await getAIConfig(businessId)
  const response = await createChatCompletion({
    model: aiConfig.websiteModel,
    apiKey: aiConfig.apiKey,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8,
    max_tokens: 2000,
  })

  await logAIUsage({
    businessId,
    channel: 'website',
    model: response.model || aiConfig.websiteModel,
    promptTokens: response.usage?.prompt_tokens,
    completionTokens: response.usage?.completion_tokens,
    totalTokens: response.usage?.total_tokens,
  })

  const raw = response.choices[0]?.message?.content || '{}'
  const cleaned = raw.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    log.error('Failed to parse AI response')
    return {}
  }
}
