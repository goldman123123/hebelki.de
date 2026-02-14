/**
 * Dev Add Me API
 *
 * POST /api/dev/add-me
 *
 * Adds the current logged-in user as an owner of the first business.
 * Only works in development mode.
 * Quick helper for testing DevUserSwitcher without seed script.
 */

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { businesses, businessMembers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:dev:add-me')

export async function POST() {
  // Development only
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 })
  }

  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    }

    // Get first business
    const [business] = await db.select().from(businesses).limit(1)
    if (!business) {
      return NextResponse.json(
        { error: 'No business found. Run seed script first: npm run db:seed' },
        { status: 404 }
      )
    }

    // Check if already exists
    const existing = await db
      .select()
      .from(businessMembers)
      .where(eq(businessMembers.clerkUserId, userId))
      .limit(1)

    if (existing[0]) {
      return NextResponse.json({
        success: true,
        message: 'Already a member',
        role: existing[0].role,
        businessName: business.name,
      })
    }

    // Add current user as owner
    const [member] = await db
      .insert(businessMembers)
      .values({
        businessId: business.id,
        clerkUserId: userId,
        role: 'owner',
        status: 'active',
        joinedAt: new Date(),
      })
      .returning()

    return NextResponse.json({
      success: true,
      message: `Added as business owner of "${business.name}"`,
      member: {
        role: member.role,
        businessId: member.businessId,
        businessName: business.name,
      },
    })
  } catch (error) {
    log.error('Error adding user:', error)

    return NextResponse.json(
      {
        error: 'Failed to add user',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
