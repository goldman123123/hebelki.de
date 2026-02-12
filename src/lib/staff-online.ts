/**
 * Staff Online Detection
 *
 * Checks if any business member has a recent heartbeat (staffLastSeenAt).
 * The heartbeat is updated by the support conversations polling endpoint.
 */

import { db } from '@/lib/db'
import { businessMembers } from '@/lib/db/schema'
import { eq, and, gte, sql } from 'drizzle-orm'

/** Staff is considered online if seen within this many seconds */
const ONLINE_THRESHOLD_SECONDS = 30

/**
 * Check if any staff member for a business is currently online.
 */
export async function isAnyStaffOnline(businessId: string): Promise<boolean> {
  const threshold = new Date(Date.now() - ONLINE_THRESHOLD_SECONDS * 1000)

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(businessMembers)
    .where(and(
      eq(businessMembers.businessId, businessId),
      eq(businessMembers.status, 'active'),
      gte(businessMembers.staffLastSeenAt, threshold),
    ))

  return Number(result?.count || 0) > 0
}

/**
 * Get the number of currently online staff members for a business.
 */
export async function getOnlineStaffCount(businessId: string): Promise<number> {
  const threshold = new Date(Date.now() - ONLINE_THRESHOLD_SECONDS * 1000)

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(businessMembers)
    .where(and(
      eq(businessMembers.businessId, businessId),
      eq(businessMembers.status, 'active'),
      gte(businessMembers.staffLastSeenAt, threshold),
    ))

  return Number(result?.count || 0)
}
