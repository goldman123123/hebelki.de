/**
 * Auth Helper Functions
 *
 * Utilities for verifying user access to business resources
 */

import { auth } from '@clerk/nextjs/server'
import { db } from './db'
import { businessMembers, businesses } from './db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * Get the current user's ID from Clerk
 * Throws if not authenticated
 */
export async function requireAuth() {
  const { userId } = await auth()

  if (!userId) {
    throw new Error('Unauthorized - Please sign in')
  }

  return userId
}

/**
 * Verify that the current user has access to a specific business
 * Returns the business member record if access is granted
 * Throws an error if access is denied
 */
export async function requireBusinessAccess(businessId: string) {
  const userId = await requireAuth()

  console.log(`[requireBusinessAccess] Checking access for user ${userId} to business ${businessId}`)

  try {
    // Check if user is a member of this business
    const member = await db
      .select()
      .from(businessMembers)
      .where(and(
        eq(businessMembers.businessId, businessId),
        eq(businessMembers.clerkUserId, userId),
        eq(businessMembers.status, 'active')
      ))
      .limit(1)
      .then(rows => rows[0])

    console.log(`[requireBusinessAccess] Query result:`, member ? 'Member found' : 'No member found')

    if (!member) {
      console.error(`[requireBusinessAccess] Access denied for user ${userId} to business ${businessId}`)
      throw new Error('Access denied - You do not have access to this business')
    }

    return member
  } catch (error) {
    console.error(`[requireBusinessAccess] Database query failed:`, error)
    throw error
  }
}

/**
 * Get the first business that the current user has access to
 * Useful for auto-selecting a business in the UI
 */
export async function getUserFirstBusiness() {
  const userId = await requireAuth()

  const member = await db
    .select({
      businessId: businessMembers.businessId,
      role: businessMembers.role,
      business: businesses,
    })
    .from(businessMembers)
    .innerJoin(businesses, eq(businesses.id, businessMembers.businessId))
    .where(and(
      eq(businessMembers.clerkUserId, userId),
      eq(businessMembers.status, 'active')
    ))
    .limit(1)
    .then(rows => rows[0])

  return member
}

/**
 * Get all businesses that the current user has access to
 */
export async function getUserBusinesses() {
  const userId = await requireAuth()

  const members = await db
    .select({
      businessId: businessMembers.businessId,
      role: businessMembers.role,
      business: businesses,
    })
    .from(businessMembers)
    .innerJoin(businesses, eq(businesses.id, businessMembers.businessId))
    .where(and(
      eq(businessMembers.clerkUserId, userId),
      eq(businessMembers.status, 'active')
    ))

  return members
}

/**
 * Get the current user's role for a specific business
 * Returns null if user is not authenticated or not a member
 * Returns role info with isAdmin flag if user is a member
 */
export async function getBusinessMemberRole(businessId: string): Promise<{
  userId: string
  role: 'owner' | 'admin' | 'staff'
  isAdmin: boolean
} | null> {
  try {
    const { userId } = await auth()
    if (!userId) return null

    const member = await db
      .select({ role: businessMembers.role })
      .from(businessMembers)
      .where(and(
        eq(businessMembers.businessId, businessId),
        eq(businessMembers.clerkUserId, userId),
        eq(businessMembers.status, 'active')
      ))
      .limit(1)
      .then(rows => rows[0])

    if (!member) return null

    return {
      userId,
      role: member.role as 'owner' | 'admin' | 'staff',
      isAdmin: member.role === 'owner' || member.role === 'admin',
    }
  } catch (error) {
    console.error('[getBusinessMemberRole] Error:', error)
    return null
  }
}
