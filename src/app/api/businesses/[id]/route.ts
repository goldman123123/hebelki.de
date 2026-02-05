import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { businesses, businessMembers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    // Verify user has access to this business
    const member = await db
      .select()
      .from(businessMembers)
      .where(
        and(
          eq(businessMembers.businessId, id),
          eq(businessMembers.clerkUserId, userId),
          eq(businessMembers.status, 'active')
        )
      )
      .limit(1)
      .then((rows) => rows[0])

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get business
    const business = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, id))
      .limit(1)
      .then((rows) => rows[0])

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    return NextResponse.json(business)
  } catch (error) {
    console.error('Error fetching business:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()

    // Verify user has access to this business
    const member = await db
      .select()
      .from(businessMembers)
      .where(
        and(
          eq(businessMembers.businessId, id),
          eq(businessMembers.clerkUserId, userId),
          eq(businessMembers.status, 'active')
        )
      )
      .limit(1)
      .then((rows) => rows[0])

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update business
    const updated = await db
      .update(businesses)
      .set({
        ...body,
        updatedAt: new Date()
      })
      .where(eq(businesses.id, id))
      .returning()

    return NextResponse.json({ business: updated[0] })
  } catch (error) {
    console.error('Error updating business:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
