/**
 * Centralized Type Definitions for Onboarding Module
 *
 * All onboarding wizard related types.
 */

import type { CategorizedPage, PageCategory, PagePriority } from '@/lib/scraper/page-categorizer'

/**
 * Re-export page categorizer types for convenience
 */
export type { CategorizedPage, PageCategory, PagePriority }

/**
 * Business Types
 */

export type BusinessType =
  | 'medical'
  | 'salon'
  | 'spa'
  | 'gym'
  | 'restaurant'
  | 'retail'
  | 'professional_services'
  | 'consultant'
  | 'clinic'
  | 'other'

export interface BusinessData {
  id: string
  name: string
  slug: string
  type: BusinessType
  description?: string
  phone?: string
  email?: string
  address?: string
  website?: string
  settings?: Record<string, unknown>
  onboardingState?: OnboardingState
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Onboarding State (stored in business.onboardingState JSONB)
 */

export interface OnboardingState {
  completed?: boolean
  completedAt?: string
  currentStep?: number
  businessDataComplete?: boolean
  servicesComplete?: boolean
  staffComplete?: boolean
  availabilityComplete?: boolean
  chatbotComplete?: boolean
  extractionComplete?: boolean
  knowledgeEntriesCreated?: number
  semanticChunksCreated?: number
  totalKnowledgeEntries?: number
  servicesForReview?: DetectedService[]
  scrapedPagesCount?: number
  failedPagesCount?: number
  scrapeCompletedAt?: string
}

/**
 * Wizard State
 */

export interface WizardState {
  step: number
  businessData: BusinessData | null
  staffMembers: StaffMember[]
  detectedServices: DetectedService[]
  chatbotScraperState?: ChatbotScraperState
  onboardingComplete?: boolean
}

/**
 * Staff Types
 */

export interface StaffMember {
  id?: string
  tempId?: string
  businessId?: string
  name: string
  email?: string
  phone?: string
  title?: string
  role?: string
  isActive: boolean
  sortOrder?: number
  createdAt?: Date
  updatedAt?: Date
}

/**
 * Service Types
 */

export interface Service {
  id?: string
  businessId: string
  name: string
  description?: string
  durationMinutes: number
  price: number
  category?: string
  isActive: boolean
  sortOrder: number
  createdAt?: Date
  updatedAt?: Date
}

export interface DetectedService {
  name: string
  description?: string
  durationMinutes?: number | null
  price?: number | null
  category?: string
  staffMember?: string
  confidence: number
}

/**
 * Chatbot Scraper State
 */

export interface ChatbotScraperState {
  websiteUrl: string
  discoveredPages: CategorizedPage[]
  selectedUrls: string[]
  discoverySource: 'sitemap' | 'homepage'
  scrapeResults?: ScrapeResults
}

export interface ScrapeResults {
  jobId: string
  knowledgeEntriesCreated: number
  chunksCreated?: number
  totalKnowledgeEntries?: number
  servicesDetected: number
  scrapedPagesCount: number
  failedPagesCount: number
  completedAt: Date
}

/**
 * Availability Types
 */

export interface TimeSlot {
  startTime: string // HH:mm format
  endTime: string // HH:mm format
}

export interface DaySchedule {
  dayOfWeek: number // 0 = Sunday, 1 = Monday, etc.
  slots: TimeSlot[]
}

export interface WeeklySchedule {
  [dayOfWeek: number]: TimeSlot[]
}

/**
 * Page Discovery Types
 */

export interface DiscoveredPage {
  url: string
  title?: string
  description?: string
  lastmod?: string
  priority?: number
  changefreq?: string
}

export interface PageDiscoveryResult {
  pages: CategorizedPage[]
  source: 'sitemap' | 'homepage'
  totalFound: number
  categorized: {
    high: number
    medium: number
    low: number
  }
}

/**
 * Step Props (for wizard steps)
 */

export interface StepProps {
  onNext: () => void
  onBack: () => void
  onSkip?: () => void
}

/**
 * Validation Types
 */

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}
