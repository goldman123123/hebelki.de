/**
 * Centralized Type Definitions for Chatbot Module
 *
 * All chatbot-related types in one place to avoid duplicates
 * and improve maintainability.
 */

/**
 * Metadata Types
 */

export interface KnowledgeMetadata {
  url?: string
  documentName?: string
  embeddingVectorId?: string
  [key: string]: string | number | boolean | undefined
}

export interface ConversationMetadata {
  aiModel?: string
  totalTokens?: number
  isInternal?: boolean
  teamPhone?: string
  actorRole?: string
  actorName?: string
  pinVerified?: boolean
  pinVerifiedAt?: string
  handoffStatus?: string
  ownerNotifiedAt?: string
  customerPhone?: string
  ownerTimeoutSeconds?: number
  liveQueuedAt?: string
  [key: string]: string | number | boolean | undefined
}

export interface MessageMetadata {
  toolCalls?: ToolCallData[]
  model?: string
  tokens?: number
  intent?: string
  confidence?: number
  staffName?: string
  staffClerkUserId?: string
  viaWhatsApp?: boolean
  [key: string]: string | number | boolean | ToolCallData[] | undefined
}

export interface ToolCallData {
  id: string
  name: string
  arguments?: string
  result?: unknown
}

export interface ScrapeJobMetadata {
  source?: string
  extractionModel?: string
  [key: string]: string | number | boolean | undefined
}

export interface ScrapeEventData {
  url?: string
  pageCount?: number
  chunkCount?: number
  entryCount?: number
  progress?: number
  total?: number
  error?: string
  [key: string]: string | number | boolean | undefined
}

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
  metadata: KnowledgeMetadata
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
  metadata: ConversationMetadata
  createdAt: Date
  updatedAt: Date
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface Message {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  metadata: MessageMetadata
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
  data?: unknown
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
  metadata: KnowledgeMetadata
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
  metadata?: ScrapeJobMetadata
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
  data: ScrapeEventData
}
