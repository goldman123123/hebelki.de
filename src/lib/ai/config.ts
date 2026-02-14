import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export interface AIConfig {
  apiKey: string
  chatbotModel: string
  websiteModel: string
  extractionModel: string
  postModel: string
  isCustomKey: boolean
}

const DEFAULTS = {
  chatbotModel: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-2024-08-06',
  websiteModel: 'google/gemini-2.5-flash',
  extractionModel: 'google/gemini-2.5-flash-lite',
  postModel: 'google/gemini-2.5-flash',
}

export async function getAIConfig(businessId: string): Promise<AIConfig> {
  const biz = await db.select({ settings: businesses.settings })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1)
    .then(rows => rows[0])

  const settings = (biz?.settings || {}) as Record<string, unknown>
  const customKey = settings.aiApiKey as string | undefined

  return {
    apiKey: customKey || process.env.OPENROUTER_API_KEY || '',
    chatbotModel: (settings.aiChatbotModel as string) || DEFAULTS.chatbotModel,
    websiteModel: (settings.aiWebsiteModel as string) || DEFAULTS.websiteModel,
    extractionModel: (settings.aiExtractionModel as string) || DEFAULTS.extractionModel,
    postModel: (settings.aiPostModel as string) || DEFAULTS.postModel,
    isCustomKey: !!customKey,
  }
}

// Available models for the UI dropdown
export const AVAILABLE_MODELS = [
  { id: 'openai/gpt-4o', label: 'GPT-4o', provider: 'OpenAI', tier: 'premium' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI', tier: 'standard' },
  { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4', provider: 'Anthropic', tier: 'premium' },
  { id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'Google', tier: 'standard' },
  { id: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', provider: 'Google', tier: 'budget' },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3', provider: 'DeepSeek', tier: 'budget' },
] as const
