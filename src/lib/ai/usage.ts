import { db } from '@/lib/db'
import { aiUsageLog } from '@/lib/db/schema'
import { createLogger } from '@/lib/logger'

const log = createLogger('lib:ai:usage')

// Cost estimates per 1M tokens (in cents) - approximate
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'openai/gpt-4o': { input: 250, output: 1000 },
  'openai/gpt-4o-mini': { input: 15, output: 60 },
  'google/gemini-2.5-flash': { input: 15, output: 60 },
  'google/gemini-2.5-flash-lite': { input: 8, output: 30 },
  'anthropic/claude-sonnet-4': { input: 300, output: 1500 },
  'deepseek/deepseek-chat': { input: 14, output: 28 },
  'openai/text-embedding-3-small': { input: 2, output: 0 },
}

export async function logAIUsage(params: {
  businessId: string
  channel: string
  model: string
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    const costs = MODEL_COSTS[params.model] || { input: 100, output: 400 }
    const estimatedCostCents = Math.ceil(
      ((params.promptTokens || 0) * costs.input + (params.completionTokens || 0) * costs.output) / 1_000_000
    )

    await db.insert(aiUsageLog).values({
      businessId: params.businessId,
      channel: params.channel,
      model: params.model,
      promptTokens: params.promptTokens || 0,
      completionTokens: params.completionTokens || 0,
      totalTokens: params.totalTokens || (params.promptTokens || 0) + (params.completionTokens || 0),
      estimatedCostCents,
      metadata: params.metadata || {},
    })
  } catch (error) {
    // Never let usage logging break the main flow
    log.error('Failed to log:', error)
  }
}
