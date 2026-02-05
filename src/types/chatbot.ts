/**
 * Centralized Type Definitions for Chatbot Module
 *
 * All chatbot-related types in one place to avoid duplicates
 * and improve maintainability.
 */

/**
 * Knowledge Base Types
 */

export type KnowledgeCategory =
  | 'faq'
  | 'services'
  | 'pricing'
  | 'policies'
  | 'procedures'
  | 'hours'
  | 'location'
  | 'contact'
  | 'team'
  | 'about'
  | 'qualifications'
  | 'equipment'
  | 'safety'
  | 'booking'
  | 'testimonials'
  | 'other'

export type KnowledgeSource = 'manual' | 'website' | 'document' | 'chat_history'

export interface KnowledgeEntry {
  id: string
  businessId: string
  source: KnowledgeSource
  title: string
  content: string
  category: KnowledgeCategory | null
  metadata: Record<string, any>
  embedding?: number[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SearchResult {
  id: string
  title: string
  content: string
  category: string | null
  source: string
  score: number
  method: 'vector' | 'keyword' | 'hybrid'
}

/**
 * Conversation Types
 */

export type ConversationChannel = 'web' | 'whatsapp' | 'sms'

export type ConversationStatus = 'active' | 'escalated' | 'closed'

export interface Conversation {
  id: string
  businessId: string
  customerId?: string
  channel: ConversationChannel
  status: ConversationStatus
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface Message {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  metadata: Record<string, any>
  createdAt: Date
}

/**
 * Chatbot Tool Types
 */

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ToolResult {
  success: boolean
  data?: any
  error?: string
  message?: string
}

/**
 * Scraped Content Types
 */

export interface ScrapedPage {
  id?: string
  businessId: string
  url: string
  title: string | null
  description: string | null
  markdown: string
  html: string | null
  metadata: Record<string, any>
  isActive: boolean
  scrapedAt: Date
  createdAt?: Date
  updatedAt?: Date
}

export interface SemanticChunk {
  content: string
  startIndex: number
  endIndex: number
  sentences: string[]
  metadata?: Record<string, unknown>
}

/**
 * AI Extraction Types
 */

export interface ExtractedKnowledge {
  title: string
  content: string
  category: KnowledgeCategory | null
  confidence: number
  source?: string
}

export interface ExtractedService {
  name: string
  description?: string
  durationMinutes?: number | null
  price?: number | null
  category?: string
  staffMember?: string
  confidence: number
}

/**
 * Business Context for System Prompts
 */

export interface BusinessContext {
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
 * Chatbot Settings (stored in business.settings JSONB)
 */

export interface ChatbotSettings {
  chatbotInstructions?: string
  chatbotWelcomeMessage?: string
  chatbotColor?: string
  chatbotChannels?: ConversationChannel[]
  chatbotEnabled?: boolean
}

/**
 * Search & Query Types
 */

export interface HybridSearchOptions {
  limit?: number
  category?: KnowledgeCategory
  vectorWeight?: number
  keywordWeight?: number
  minScore?: number
}

export interface AugmentedQuery {
  original: string
  augmented: string[]
  translations: string[]
  synonyms: string[]
}

/**
 * Scraping Job Types
 */

export interface ScrapeJob {
  id: string
  businessId: string
  urls: string[]
  status: 'pending' | 'scraping' | 'extracting' | 'completed' | 'failed'
  scrapedPages: ScrapedPage[]
  failedUrls: string[]
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt?: Date
}

export interface ScrapeEvent {
  type:
    | 'started'
    | 'scraping'
    | 'scraped'
    | 'chunking'
    | 'chunking_complete'
    | 'extracting'
    | 'extraction_progress'
    | 'complete'
    | 'error'
  data: Record<string, any>
}
