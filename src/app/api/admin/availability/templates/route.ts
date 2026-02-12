import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { getAvailabilityTemplatesWithSlots, createAvailabilityTemplate } from '@/lib/db/queries'
import { parseBody } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { searchParams } = new URL(request.url)
  const staffId = searchParams.get('staffId')

  const templates = await getAvailabilityTemplatesWithSlots(authResult.business.id, staffId)

  return NextResponse.json({ templates })
}

export async function POST(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { data: body, error: parseError } = await parseBody<{ staffId?: string; name?: string; isDefault?: boolean }>(request)
  if (parseError) return parseError

  const template = await createAvailabilityTemplate({
    businessId: authResult.business.id,
    staffId: body.staffId || null,
    name: body.name || 'Default',
    isDefault: body.isDefault ?? true,
  })

  return NextResponse.json({ template }, { status: 201 })
}
