/**
 * Dev Seed Users API
 *
 * POST /api/dev/seed-users
 *
 * Seeds the database with test business members including the current user.
 * Only works in development mode.
 */

import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { businesses, businessMembers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

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

    // Clear existing business members
    await db.delete(businessMembers).where(eq(businessMembers.businessId, business.id))

    // Create test business members
    const testMembers = [
      {
        businessId: business.id,
        clerkUserId: userId, // Current user as owner
        role: 'owner',
        status: 'active',
        joinedAt: new Date(),
      },
      {
        businessId: business.id,
        clerkUserId: 'user_test_admin_sarah', // Placeholder ID
        role: 'admin',
        status: 'active',
        joinedAt: new Date('2024-01-15'),
      },
      {
        businessId: business.id,
        clerkUserId: 'user_test_staff_thomas', // Placeholder ID
        role: 'staff',
        status: 'active',
        joinedAt: new Date('2024-02-01'),
      },
      {
        businessId: business.id,
        clerkUserId: 'user_test_staff_lina', // Placeholder ID
        role: 'staff',
        status: 'active',
        joinedAt: new Date('2024-03-10'),
      },
      {
        businessId: business.id,
        clerkUserId: 'user_test_staff_disabled', // Placeholder ID
        role: 'staff',
        status: 'disabled',
        joinedAt: new Date('2023-11-20'),
      },
    ]

    await db.insert(businessMembers).values(testMembers)

    return NextResponse.json({
      success: true,
      message: `Seeded ${testMembers.length} business members`,
      members: testMembers.map(m => ({
        role: m.role,
        status: m.status,
        isCurrentUser: m.clerkUserId === userId,
      })),
      businessName: business.name,
      note: 'Placeholder users will show "Unknown User" in the DevUserSwitcher since they don\'t exist in Clerk',
    })
  } catch (error) {
    console.error('[Dev API] Error seeding users:', error)

    return NextResponse.json(
      {
        error: 'Failed to seed users',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
