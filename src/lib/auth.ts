import { auth } from '@clerk/nextjs/server'
import { db } from './db'
import { businesses } from './db/schema'
import { eq } from 'drizzle-orm'

export type AuthResult =
  | { success: true; userId: string; business: typeof businesses.$inferSelect }
  | { success: false; error: string; status: 401 | 404 }

/**
 * Centralized authorization helper for admin routes.
 * Gets the current user from Clerk and fetches their business.
 * Returns standardized error responses if unauthorized or no business exists.
 */
export async function requireBusinessAuth(): Promise<AuthResult> {
  const { userId } = await auth()

  if (!userId) {
    return { success: false, error: 'Unauthorized', status: 401 }
  }

  const results = await db
    .select()
    .from(businesses)
    .where(eq(businesses.clerkUserId, userId))
    .limit(1)

  const business = results[0]

  if (!business) {
    return { success: false, error: 'No business found. Please complete onboarding.', status: 404 }
  }

  return { success: true, userId, business }
}

/**
 * Get business for a specific user (for server components)
 */
export async function getBusinessForUser(clerkUserId: string) {
  const results = await db
    .select()
    .from(businesses)
    .where(eq(businesses.clerkUserId, clerkUserId))
    .limit(1)

  return results[0] || null
}

/**
 * Check if a slug is available for a new business
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  const results = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(eq(businesses.slug, slug))
    .limit(1)

  return results.length === 0
}
