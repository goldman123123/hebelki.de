import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { updateAvailabilityTemplateSlots, getAvailabilitySlots, verifyTemplateOwnership } from '@/lib/db/queries'
import { z } from 'zod'

const slotsSchema = z.object({
  slots: z.array(z.object({
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  }))
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params

  // Verify ownership
  const isOwner = await verifyTemplateOwnership(id, authResult.business.id)
  if (!isOwner) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  const slots = await getAvailabilitySlots(id)

  return NextResponse.json({ slots })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params

  // Verify ownership
  const isOwner = await verifyTemplateOwnership(id, authResult.business.id)
  if (!isOwner) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  const body = await request.json()

  const parsed = slotsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  await updateAvailabilityTemplateSlots(id, parsed.data.slots)

  const slots = await getAvailabilitySlots(id)

  return NextResponse.json({ slots })
}
