/**
 * Dev Switch User API
 *
 * POST /api/dev/switch-user
 * Body: { userId: string }
 *
 * Creates a sign-in token for the specified user and returns it.
 * Only works in development mode.
 */

import { NextResponse } from 'next/server'

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY!

export async function POST(request: Request) {
  // Development only
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 })
  }

  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Create sign-in token via Clerk API
    const response = await fetch(
      `https://api.clerk.com/v1/sign_in_tokens`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          expires_in_seconds: 300, // 5 minutes
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Clerk API error: ${error}`)
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      token: data.token,
      url: data.url,
    })
  } catch (error) {
    console.error('[Dev API] Error switching user:', error)

    return NextResponse.json(
      {
        error: 'Failed to switch user',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
