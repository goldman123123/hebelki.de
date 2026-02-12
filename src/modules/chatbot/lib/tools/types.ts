/**
 * Internal access context passed by conversation handler (Phase 1)
 * This is injected server-side and cannot be overridden by AI
 */
export interface InternalAccessContext {
  actorType: 'customer' | 'staff' | 'owner'
  actorId?: string
  customerScopeId?: string
}
