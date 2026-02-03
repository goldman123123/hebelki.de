import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { getAvailabilityTemplatesWithSlots, createAvailabilityTemplate } from '@/lib/db/queries'

async function getFirstBusiness() {
  const results = await db.select().from(businesses).limit(1)
  return results[0] || null
}

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const business = await getFirstBusiness()
  if (!business) {
    return NextResponse.json({ error: 'No business configured' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const staffId = searchParams.get('staffId')

  const templates = await getAvailabilityTemplatesWithSlots(business.id, staffId)

  return NextResponse.json({ templates })
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const business = await getFirstBusiness()
  if (!business) {
    return NextResponse.json({ error: 'No business configured' }, { status: 404 })
  }

  const body = await request.json()

  const template = await createAvailabilityTemplate({
    businessId: business.id,
    staffId: body.staffId || null,
    name: body.name || 'Default',
    isDefault: body.isDefault ?? true,
  })

  return NextResponse.json({ template }, { status: 201 })
}
