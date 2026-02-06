import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth-helpers'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    await requireAuth()

    const { id } = await params
    const body = await request.json()

    // Update business onboarding state in settings
    const [updated] = await db
      .update(businesses)
      .set({
        settings: {
          onboarding: {
            step: body.step,
            chatbotSetup: body.chatbotSetup,
            bookingSetup: body.bookingSetup,
            staffConfigured: body.staffConfigured,
            setupChoice: body.setupChoice,
            completedAt: body.completed ? new Date().toISOString() : undefined,
          },
        },
      })
      .where(eq(businesses.id, id))
      .returning()

    if (!updated) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      business: updated,
    })
  } catch (error) {
    console.error('Error updating onboarding state:', error)
    return NextResponse.json(
      {
        error: 'Failed to update onboarding state',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    await requireAuth()

    const { id } = await params

    const business = await db
      .select()
      .from(businesses)
      .where(eq(businesses.id, id))
      .limit(1)

    if (!business.length) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      onboarding: (business[0].settings as any)?.onboarding || {},
    })
  } catch (error) {
    console.error('Error fetching onboarding state:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch onboarding state',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
