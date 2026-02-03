import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { getAllServices, createService } from '@/lib/db/queries'
import { serviceSchema } from '@/lib/validations/schemas'

export async function GET() {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const services = await getAllServices(authResult.business.id)

  return NextResponse.json({ services })
}

export async function POST(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const body = await request.json()

  const parsed = serviceSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const service = await createService({
    businessId: authResult.business.id,
    ...parsed.data,
  })

  return NextResponse.json({ service }, { status: 201 })
}
