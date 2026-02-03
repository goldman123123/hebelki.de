import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { getAllServices, createService } from '@/lib/db/queries'
import { serviceSchema } from '@/lib/validations/schemas'

async function getFirstBusiness() {
  const results = await db.select().from(businesses).limit(1)
  return results[0] || null
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const business = await getFirstBusiness()
  if (!business) {
    return NextResponse.json({ error: 'No business configured' }, { status: 404 })
  }

  const services = await getAllServices(business.id)

  return NextResponse.json({ services })
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

  const parsed = serviceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const service = await createService({
    businessId: business.id,
    ...parsed.data,
  })

  return NextResponse.json({ service }, { status: 201 })
}
