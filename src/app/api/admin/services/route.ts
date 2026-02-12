import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { getAllServices, createService } from '@/lib/db/queries'
import { serviceSchema } from '@/lib/validations/schemas'
import { parseBody } from '@/lib/api-response'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const services = await getAllServices(authResult.business.id)

  return NextResponse.json({ services }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}

export async function POST(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { data: body, error: parseError } = await parseBody(request)
  if (parseError) return parseError

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
