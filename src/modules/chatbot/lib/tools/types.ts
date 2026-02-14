/**
 * Internal access context passed by conversation handler (Phase 1)
 * This is injected server-side and cannot be overridden by AI
 */
export interface InternalAccessContext {
  actorType: 'customer' | 'staff' | 'owner'
  actorId?: string
  customerScopeId?: string
}

/**
 * Per-member AI tool capabilities.
 * When null/undefined, role defaults are used.
 * When set, allowedTools is an explicit whitelist.
 */
export interface MemberCapabilities {
  allowedTools?: string[]
}
