/**
 * Tool Bridge: OpenAI Realtime API → Hebelki tool handlers.
 *
 * Thin adapter that:
 * 1. Takes OpenAI Realtime's tool call format
 * 2. Injects businessId + access context (same pattern as text chatbot)
 * 3. Calls existing executeTool() from the chatbot module
 * 4. Returns result in a format suitable for OpenAI Realtime
 *
 * Zero changes to existing tool handlers — all 50+ tools work as-is.
 */

import { executeTool } from '../modules/chatbot/lib/tools'

interface RealtimeToolCall {
  call_id: string
  name: string
  arguments: string // JSON string
}

interface ToolBridgeResult {
  call_id: string
  output: string // JSON string for conversation.item.create
}

/**
 * Execute a tool call from the OpenAI Realtime API.
 *
 * Mirrors the server-side injection logic from conversation.ts:
 * - businessId is always overridden
 * - _accessContext is always 'customer' for voice callers
 * - _conversationId is injected for intent tracking
 */
export async function executeVoiceToolCall(
  toolCall: RealtimeToolCall,
  businessId: string,
  conversationId?: string,
): Promise<ToolBridgeResult> {
  let args: Record<string, unknown>

  try {
    args = JSON.parse(toolCall.arguments)
  } catch {
    console.error(`[VoiceToolBridge] Failed to parse args for ${toolCall.name}:`, toolCall.arguments)
    return {
      call_id: toolCall.call_id,
      output: JSON.stringify({
        success: false,
        code: 'INVALID_TOOL_ARGS',
        error: 'Tool arguments could not be parsed',
      }),
    }
  }

  // Server-side injection — same pattern as conversation.ts line 1088-1101
  const safeArgs = {
    ...args,
    businessId,
    _accessContext: {
      actorType: 'customer' as const,
      actorId: undefined,
      customerScopeId: undefined,
    },
    ...(conversationId ? { _conversationId: conversationId } : {}),
  }

  console.log(`[VoiceToolBridge] Executing: ${toolCall.name}`, {
    businessId,
    args: { ...safeArgs, _accessContext: '[REDACTED]' },
  })

  try {
    const result = await executeTool(toolCall.name, safeArgs)

    return {
      call_id: toolCall.call_id,
      output: JSON.stringify(result),
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[VoiceToolBridge] Tool execution error (${toolCall.name}):`, errorMessage)

    return {
      call_id: toolCall.call_id,
      output: JSON.stringify({
        success: false,
        code: 'INTERNAL_ERROR',
        error: errorMessage,
      }),
    }
  }
}
