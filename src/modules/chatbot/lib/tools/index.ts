/**
 * Chatbot Tool Definitions
 *
 * Defines functions the AI can call to interact with the booking system.
 */

import type { Tool } from '../openrouter'
import type { InternalAccessContext } from './types'
import { publicToolDefs, adminToolDefs, assistantToolDefs } from './definitions'
import { publicHandlers } from './handlers/public'
import { adminHandlers } from './handlers/admin'
import { assistantHandlers } from './handlers/assistant'
import { createLogger } from '@/lib/logger'

const log = createLogger('chatbot:tools:index')

/**
 * Tool definitions for OpenRouter function calling
 */
export const tools: Tool[] = [
  ...publicToolDefs,
  ...adminToolDefs,
  ...assistantToolDefs,
]

/**
 * Tool execution handlers
 */
export const toolHandlers = {
  ...publicHandlers,
  ...adminHandlers,
  ...assistantHandlers,
}

// Customer-safe tools (no auth gate needed)
const CUSTOMER_TOOLS = new Set([
  'get_current_date',
  'get_available_services',
  'get_available_staff',
  'check_availability',
  'create_hold',
  'confirm_booking',
  'search_knowledge_base',
  'request_data_deletion',
])

/**
 * Execute a tool call
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const handler = toolHandlers[toolName as keyof typeof toolHandlers]

  if (!handler) {
    throw new Error(`Unknown tool: ${toolName}`)
  }

  // Defense-in-depth: block admin/staff tools for customer actors
  const accessContext = args._accessContext as InternalAccessContext | undefined
  const actorType = accessContext?.actorType || 'customer'
  if (!CUSTOMER_TOOLS.has(toolName) && actorType === 'customer') {
    log.warn(`Blocked ${toolName} for customer actor`)
    throw new Error(`Tool "${toolName}" is not available`)
  }

  // Defense-in-depth: if staff has custom capabilities, enforce them
  const capabilities = args._memberCapabilities as { allowedTools?: string[] } | undefined
  if (capabilities?.allowedTools && actorType === 'staff') {
    const allowed = new Set([...CUSTOMER_TOOLS, ...capabilities.allowedTools])
    if (!allowed.has(toolName)) {
      log.warn(`Blocked ${toolName} for staff — not in capabilities`)
      throw new Error(`Tool "${toolName}" is not available`)
    }
  }

  return (handler as (args: Record<string, unknown>) => Promise<unknown>)(args)
}
