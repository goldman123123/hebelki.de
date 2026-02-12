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
    console.warn(`[TOOL AUTH] Blocked ${toolName} for customer actor`)
    throw new Error(`Tool "${toolName}" is not available`)
  }

  // @ts-expect-error - Dynamic tool execution
  return handler(args)
}
