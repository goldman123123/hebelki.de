/**
 * Get all businesses for chatbot testing
 *
 * GET /api/chatbot/businesses
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'

export async function GET() {
  try {
    const allBusinesses = await db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        type: businesses.type,
      })
      .from(businesses)
      .orderBy(desc(businesses.createdAt))

    return NextResponse.json({
      success: true,
      businesses: allBusinesses,
    })
  } catch (error) {
    console.error('[Chatbot API] Error fetching businesses:', error)

    return NextResponse.json(
      {
        error: 'Fehler beim Abrufen der Unternehmen',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    )
  }
}
