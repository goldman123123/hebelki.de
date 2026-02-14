import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/platform-auth'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'

export async function GET() {
  try {
    await requirePlatformAdmin()
    const allBusinesses = await db.select({
      id: businesses.id,
      name: businesses.name,
      slug: businesses.slug,
      type: businesses.type,
      planId: businesses.planId,
      email: businesses.email,
      phone: businesses.phone,
      createdAt: businesses.createdAt,
    }).from(businesses).orderBy(businesses.createdAt)
    return NextResponse.json(allBusinesses)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}
