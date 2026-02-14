/**
 * Wizard State Validation Schemas
 *
 * Zod schemas for validating wizard state data
 */

import { z } from 'zod'
import { createLogger } from '@/lib/logger'

const log = createLogger('lib:validation:wizard-state')

export const businessDataSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  type: z.string(),
  timezone: z.string(),
  email: z.string().email().optional(),
})

export const timeSlotSchema = z.object({
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
})

export const weeklyScheduleSchema = z.record(
  z.string(), // day of week (0-6)
  z.array(timeSlotSchema)
)

export const staffMemberSchema = z.object({
  id: z.string().uuid().optional(),
  tempId: z.string(),
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  title: z.string().optional(),
  availability: weeklyScheduleSchema,
})

export const detectedServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  durationMinutes: z.number().int().positive().nullable().optional(),
  price: z.number().positive().nullable().optional(),
  category: z.string().optional(),
  staffMember: z.string().optional(),
  confidence: z.number().min(0).max(1),
  approved: z.boolean().optional(),
  staffIds: z.array(z.string()).optional(),
})

export const scrapeResultsSchema = z.object({
  knowledgeCount: z.number().int().min(0),
  servicesCount: z.number().int().min(0),
  pagesScraped: z.number().int().min(0),
  pagesFailed: z.number().int().min(0),
})

export const wizardStateSchema = z.object({
  step: z.number().int().min(1).max(6),
  businessData: businessDataSchema.nullable(),
  setupChoice: z.enum(['chatbot', 'booking']).nullable(),
  scrapeJobId: z.string().nullable(),
  scrapedData: z.object({
    status: z.string(),
    progress: z.number().min(0).max(100),
    pagesScraped: z.number().int().min(0),
    knowledgeEntriesCreated: z.number().int().min(0).optional(),
    servicesDetected: z.array(z.any()).optional(),
  }).nullable(),
  detectedServices: z.array(detectedServiceSchema),
  staffMembers: z.array(staffMemberSchema).nullable(),
  staffConfigured: z.boolean(),
  onboardingComplete: z.boolean(),
  chatbotScraperState: z.object({
    websiteUrl: z.string().url(),
    discoveredPages: z.array(z.any()), // CategorizedPage - complex type
    selectedUrls: z.array(z.string().url()),
    discoverySource: z.enum(['sitemap', 'homepage']),
    scrapeResults: scrapeResultsSchema.optional(),
  }).optional(),
})

export type WizardState = z.infer<typeof wizardStateSchema>
export type BusinessData = z.infer<typeof businessDataSchema>
export type StaffMember = z.infer<typeof staffMemberSchema>
export type DetectedService = z.infer<typeof detectedServiceSchema>
export type ScrapeResults = z.infer<typeof scrapeResultsSchema>

/**
 * Get default wizard state
 */
export function getDefaultWizardState(): WizardState {
  return {
    step: 1,
    businessData: null,
    setupChoice: null,
    scrapeJobId: null,
    scrapedData: null,
    detectedServices: [],
    staffMembers: null,
    staffConfigured: false,
    onboardingComplete: false,
  }
}

/**
 * Validate and sanitize wizard state
 */
export function validateWizardState(state: unknown): WizardState {
  const result = wizardStateSchema.safeParse(state)

  if (!result.success) {
    log.warn('Invalid wizard state, using defaults:', result.error.issues)
    return getDefaultWizardState()
  }

  return result.data
}

/**
 * Parse step from URL parameter
 */
export function parseStepParam(stepParam: string | null): number {
  if (!stepParam) return 1

  const step = parseInt(stepParam, 10)

  if (isNaN(step) || step < 1 || step > 6) {
    return 1
  }

  return step
}

/**
 * Parse mode parameter from URL
 */
export function parseModeParam(modeParam: string | null): {
  step: number
  setupChoice: 'chatbot' | 'booking' | null
} {
  if (modeParam === 'chatbot') {
    return { step: 3, setupChoice: 'chatbot' }
  }

  if (modeParam === 'booking') {
    return { step: 3, setupChoice: 'booking' }
  }

  return { step: 1, setupChoice: null }
}
