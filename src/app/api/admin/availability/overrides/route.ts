import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { getAllAvailabilityOverrides, createAvailabilityOverride } from '@/lib/db/queries'
import { availabilityOverrideSchema } from '@/lib/validations/schemas'

export async function GET() {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const overrides = await getAllAvailabilityOverrides(authResult.business.id)

  return NextResponse.json({ overrides })
}

export async function POST(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const body = await request.json()

  const parsed = availabilityOverrideSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const override = await createAvailabilityOverride({
    businessId: authResult.business.id,
    ...parsed.data,
  })

  return NextResponse.json({ override }, { status: 201 })
}
