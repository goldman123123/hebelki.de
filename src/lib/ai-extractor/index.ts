import { ScrapedPage, KnowledgeEntry, DetectedService } from './types'
import { createChatCompletion } from '@/modules/chatbot/lib/openrouter'
import { getAIConfig } from '@/lib/ai/config'
import { logAIUsage } from '@/lib/ai/usage'
import { createLogger } from '@/lib/logger'

const log = createLogger('lib:ai-extractor:index')

async function extractKnowledgeBatch(
  pages: ScrapedPage[],
  businessType: string,
  businessId?: string
): Promise<KnowledgeEntry[]> {
  const combinedContent = pages
    .map(p => `=== PAGE: ${p.url} ===\nTitle: ${p.metadata?.title || 'Untitled'}\n\n${p.markdown}`)
    .join('\n\n---\n\n')
    .slice(0, 300000) // Increased from 200KB to 300KB

  // Enhanced prompt with 15+ specific categories
  const systemPrompt = `You are an expert data extraction specialist. Extract COMPREHENSIVE, DETAILED knowledge base entries from website content for a ${businessType} business.

**CRITICAL INSTRUCTIONS:**
- Extract EVERY piece of useful information, not just summaries
- Be THOROUGH and DETAILED - capture all specifics
- Include ALL services, prices, policies, procedures, and details mentioned
- Extract complete paragraphs and explanations, not just bullet points
- Preserve exact pricing, timing, and technical details
- Confidence should reflect HOW CLEARLY the information is stated, not how much detail exists

**Extract and categorize into these specific categories:**

1. **services** - Individual services/products offered
   - Include: full description, pricing, duration, requirements, what's included

2. **pricing** - Pricing structures, packages, discounts
   - Include: exact prices, price ranges, package deals, seasonal rates

3. **policies** - Business policies and rules
   - Include: booking policies, cancellation policies, payment terms, refund policies

4. **procedures** - How things work, step-by-step processes
   - Include: booking procedures, checkout process, service delivery steps

5. **faq** - Common questions and detailed answers
   - Include: complete Q&A pairs from FAQ sections

6. **hours** - Operating hours, availability, scheduling
   - Include: business hours, staff schedules, seasonal hours, special hours

7. **location** - Address, directions, parking, accessibility
   - Include: full address, landmarks, parking info, public transport, accessibility features

8. **contact** - Contact information and methods
   - Include: phone, email, social media, contact forms, emergency contacts

9. **team** - Staff members, team info, qualifications
   - Include: staff bios, qualifications, specializations, photos

10. **about** - Company history, mission, values, story
    - Include: founding story, mission statement, company values, achievements

11. **qualifications** - Certifications, licenses, accreditations
    - Include: professional certifications, industry memberships, awards

12. **equipment** - Tools, technology, facilities used
    - Include: equipment descriptions, technology used, facility features

13. **safety** - Safety protocols, hygiene, compliance
    - Include: safety measures, COVID protocols, hygiene standards

14. **booking** - Booking instructions, availability, requirements
    - Include: how to book, lead time, deposit requirements, what to bring

15. **testimonials** - Customer reviews, testimonials, case studies
    - Include: customer quotes, success stories, before/after examples

16. **other** - Anything else important that doesn't fit above categories
    - Include: special programs, partnerships, community involvement

**Output Format:**
Return a JSON array with this structure:
[{
  "title": "Specific, descriptive title (e.g., 'Deep Tissue Massage - 90 Minutes')",
  "content": "COMPLETE, DETAILED content - include ALL relevant information, exact quotes, full descriptions. Minimum 2-3 sentences for each entry. Include prices, durations, requirements, benefits, etc.",
  "category": "one of the 16 categories above",
  "confidence": 0-100 (based on clarity of information, NOT completeness)
}]

**Confidence Scoring:**
- 90-100: Explicitly stated, official information
- 70-89: Clearly mentioned but may lack some details
- 50-69: Implied or requires interpretation
- Below 50: Uncertain or ambiguous

**Quality Standards:**
- Minimum content length: 100 characters per entry
- Include specific details: prices (€X), durations (X min), addresses (full street)
- Preserve exact wording for policies and procedures
- Extract even if confidence is 50-69 - we'll filter later
- Aim for 50-100+ entries per batch (for detailed websites)

Return ONLY valid JSON, no other text.`

  try {
    const aiConfig = businessId ? await getAIConfig(businessId) : null
    const model = aiConfig?.extractionModel || 'google/gemini-2.5-flash-lite'

    log.info('Starting AI extraction...')
    log.info('Model:', model)
    log.info('Content length:', combinedContent.length, 'chars')
    log.info('Pages in batch:', pages.length)

    const response = await createChatCompletion({
      model,
      apiKey: aiConfig?.apiKey,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract comprehensive knowledge from:\n\n${combinedContent}` }
      ],
      temperature: 0.4,  // Increased from 0.2 for more comprehensive extraction
      max_tokens: 8000   // Increased from 4000 to allow more detailed output
    })

    if (businessId) {
      await logAIUsage({
        businessId,
        channel: 'extraction',
        model: response.model || model,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
      })
    }

    log.info('AI response received')
    const content = response.choices[0].message.content
    log.info('Raw AI response length:', content.length, 'chars')

    // Try to extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      log.error('No JSON array found in AI response')
      return []
    }

    const extracted = JSON.parse(jsonMatch[0])
    log.info('Extracted entries:', extracted.length)

    // Lower threshold to 60% to capture more entries
    const filtered = extracted.filter((e: KnowledgeEntry) => {
      const hasMinLength = e.content.length >= 50
      const hasGoodConfidence = e.confidence >= 60
      return hasMinLength && hasGoodConfidence
    })

    log.info('Filtered entries (confidence >= 60%, length >= 50):', filtered.length)

    return filtered
  } catch (error) {
    log.error('AI extraction error:', error)
    if (error instanceof Error) {
      log.error('Error message:', error.message)
      log.error('Error stack:', error.stack)
    }
    return []
  }
}

export async function extractKnowledgeFromContent(
  scrapedPages: ScrapedPage[],
  businessType: string,
  businessId?: string
): Promise<KnowledgeEntry[]> {
  // Separate critical pages for priority processing
  const criticalPages = scrapedPages.filter(p =>
    p.url.includes('impressum') ||
    p.url.includes('about') ||
    p.url.includes('über') ||
    p.url.includes('ueber') ||
    p.url.includes('contact') ||
    p.url.includes('kontakt')
  )

  const normalPages = scrapedPages.filter(p => !criticalPages.some(cp => cp.url === p.url))

  const allKnowledge: KnowledgeEntry[] = []

  // Process critical pages first
  if (criticalPages.length > 0) {
    log.info(`Processing ${criticalPages.length} critical pages first...`)
    const criticalKnowledge = await extractKnowledgeBatch(criticalPages, businessType, businessId)
    allKnowledge.push(...criticalKnowledge)
  }

  // Process remaining pages in batches of 15
  const batchSize = 15
  for (let i = 0; i < normalPages.length; i += batchSize) {
    const batch = normalPages.slice(i, i + batchSize)
    log.info(`Processing batch ${Math.floor(i / batchSize) + 1}: pages ${i + 1}-${Math.min(i + batchSize, normalPages.length)} of ${normalPages.length}`)

    try {
      const batchResults = await extractKnowledgeBatch(batch, businessType, businessId)
      allKnowledge.push(...batchResults)
    } catch (error) {
      log.error(`Error processing batch ${Math.floor(i / batchSize) + 1}:`, error)
      // Continue with next batch even if this one fails
    }
  }

  log.info(`Extracted ${allKnowledge.length} total knowledge entries from ${scrapedPages.length} pages`)
  return allKnowledge
}

async function extractServicesBatch(
  pages: ScrapedPage[],
  businessType: string,
  businessId?: string
): Promise<DetectedService[]> {
  const combinedContent = pages
    .map(p => `URL: ${p.url}\n${p.markdown}`)
    .join('\n\n---\n\n')
    .slice(0, 200000) // Max 200k characters per batch - handles larger sites

  const systemPrompt = `Extract service offerings from ${businessType} website content.

CRITICAL: Only extract data that is EXPLICITLY stated on the website.
DO NOT estimate, infer, or generate any values that are not clearly mentioned.

For each service, extract:
- name (string, required) - The service name
- description (string, max 200 chars) - What the service offers
- durationMinutes (number, ONLY if explicitly stated, otherwise null)
- price (number in EUR, ONLY if explicitly stated with currency, otherwise null)
- category (string) - Type of service
- staffMember (string, if mentioned, otherwise null)
- confidence (0-100, based ONLY on how clearly the SERVICE ITSELF is described)

IMPORTANT: Calculate confidence based on the service description quality, NOT on whether price or duration is present.
- A service clearly described but without pricing = HIGH confidence (80-95)
- A service vaguely described with pricing = MEDIUM confidence (60-75)
- Missing price or duration should NOT reduce confidence if the service is well described

CRITICAL: Treat list items as SEPARATE SERVICES, not examples of a category.

Example:
If the website shows:
  ### Montage & Demontage
  - Antennen und Mobilfunktechnik
  - Werbetafeln und Leuchtreklamen
  - Blitzschutzanlagen

Extract THREE services:
1. "Antennen und Mobilfunktechnik" (confidence: 75-85%)
2. "Werbetafeln und Leuchtreklamen" (confidence: 75-85%)
3. "Blitzschutzanlagen" (confidence: 75-85%)

Do NOT extract only "Montage & Demontage" as a single service.
Do NOT require full descriptions for list items - the name alone is enough for 70-80% confidence.

If a service has no price listed on the website, return "price": null.
If duration is not explicitly stated, return "durationMinutes": null.
Do not make assumptions or estimations.

Return JSON array. Only include services with confidence >= 60. Return valid JSON only, no other text.`

  try {
    const aiConfig = businessId ? await getAIConfig(businessId) : null
    const model = aiConfig?.extractionModel || 'google/gemini-2.5-flash-lite'

    log.info('Starting AI extraction...')
    log.info('Model:', model)
    log.info('Content length:', combinedContent.length, 'chars')

    const response = await createChatCompletion({
      model,
      apiKey: aiConfig?.apiKey,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: combinedContent }
      ],
      temperature: 0.3,
      max_tokens: 8000
    })

    if (businessId) {
      await logAIUsage({
        businessId,
        channel: 'extraction',
        model: response.model || model,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
      })
    }

    log.info('AI response received')
    log.info('Response structure:', JSON.stringify({
      id: response.id,
      model: response.model,
      finish_reason: response.choices[0].finish_reason,
      usage: response.usage
    }, null, 2))

    const content = response.choices[0].message.content
    log.info('Raw AI response:', content.substring(0, 500) + '...')

    // Try to extract JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      log.error('No JSON array found in AI response')
      log.error('Full response:', content)
      return []
    }

    log.info('JSON found, parsing...')
    const extracted = JSON.parse(jsonMatch[0])
    log.info('Extracted services:', extracted.length)

    // Swap name and description - descriptions are more complete and make better service names
    const swapped = extracted.map((service: DetectedService) => ({
      ...service,
      name: service.description || service.name,
      description: service.name
    }))

    // Debug logging to see what's being filtered
    const kept = swapped.filter((e: DetectedService) => e.confidence >= 60)
    const rejected = extracted.filter((e: DetectedService) => e.confidence < 60)

    log.info(`Kept ${kept.length} services (confidence >= 60%)`)
    if (rejected.length > 0) {
      log.info(`Filtered ${rejected.length} services (confidence < 60%):`)
      rejected.forEach((s: DetectedService) => log.info(`   - ${s.name}: ${s.confidence}%`))
    }

    return kept
  } catch (error) {
    log.error('AI extraction error:', error)
    if (error instanceof Error) {
      log.error('Error message:', error.message)
      log.error('Error stack:', error.stack)
    }
    return []
  }
}

export async function extractServicesFromContent(
  scrapedPages: ScrapedPage[],
  businessType: string,
  businessId?: string
): Promise<DetectedService[]> {
  // Prioritize service-related pages
  const servicePriority = scrapedPages.filter(p =>
    p.url.includes('service') ||
    p.url.includes('leistung') ||
    p.url.includes('angebot') ||
    p.url.includes('pricing') ||
    p.url.includes('preis')
  )

  const normalPages = scrapedPages.filter(p => !servicePriority.some(sp => sp.url === p.url))

  const allServices: DetectedService[] = []

  // Process service pages first
  if (servicePriority.length > 0) {
    log.info(`Processing ${servicePriority.length} service-related pages first...`)
    const priorityServices = await extractServicesBatch(servicePriority, businessType, businessId)
    allServices.push(...priorityServices)
  }

  // Process remaining pages in batches of 15
  const batchSize = 15
  for (let i = 0; i < normalPages.length; i += batchSize) {
    const batch = normalPages.slice(i, i + batchSize)
    log.info(`Processing services batch ${Math.floor(i / batchSize) + 1}: pages ${i + 1}-${Math.min(i + batchSize, normalPages.length)} of ${normalPages.length}`)

    try {
      const batchResults = await extractServicesBatch(batch, businessType, businessId)
      allServices.push(...batchResults)
    } catch (error) {
      log.error(`Error processing services batch ${Math.floor(i / batchSize) + 1}:`, error)
      // Continue with next batch even if this one fails
    }
  }

  log.info(`Extracted ${allServices.length} total services from ${scrapedPages.length} pages`)
  return allServices
}
