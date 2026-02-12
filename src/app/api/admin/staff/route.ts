import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { getAllStaff, createStaff } from '@/lib/db/queries'
import { staffSchema } from '@/lib/validations/schemas'
import { parseBody } from '@/lib/api-response'

export async function GET() {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const staff = await getAllStaff(authResult.business.id)

  return NextResponse.json({ staff })
}

export async function POST(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { data: body, error: parseError } = await parseBody(request)
  if (parseError) return parseError

  const parsed = staffSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { email, avatarUrl, ...rest } = parsed.data
  const staffMember = await createStaff({
    businessId: authResult.business.id,
    email: email || null,
    avatarUrl: avatarUrl || null,
    ...rest,
  })

  return NextResponse.json({ staff: staffMember }, { status: 201 })
}
