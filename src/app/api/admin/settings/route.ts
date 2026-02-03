import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { updateBusiness } from '@/lib/db/queries'
import { z } from 'zod'

const businessInfoSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens').optional(),
  type: z.enum(['clinic', 'salon', 'consultant', 'gym', 'other']).optional(),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color').optional(),
})

const contactInfoSchema = z.object({
  email: z.string().email().nullable().optional().or(z.literal('')),
  phone: z.string().max(20).nullable().optional(),
  address: z.string().max(200).nullable().optional(),
  website: z.string().url().nullable().optional().or(z.literal('')),
})

const bookingPoliciesSchema = z.object({
  minBookingNoticeHours: z.number().min(0).max(168).optional(),
  maxAdvanceBookingDays: z.number().min(1).max(365).optional(),
  cancellationPolicyHours: z.number().min(0).max(168).optional(),
  requireApproval: z.boolean().optional(),
  allowWaitlist: z.boolean().optional(),
})

const regionalSettingsSchema = z.object({
  timezone: z.string().optional(),
  currency: z.string().length(3).optional(),
})

export async function GET() {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  return NextResponse.json({ business: authResult.business })
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const body = await request.json()
  const { section } = body

  let parsed
  switch (section) {
    case 'business':
      parsed = businessInfoSchema.safeParse(body.data)
      break
    case 'contact':
      parsed = contactInfoSchema.safeParse(body.data)
      break
    case 'policies':
      parsed = bookingPoliciesSchema.safeParse(body.data)
      break
    case 'regional':
      parsed = regionalSettingsSchema.safeParse(body.data)
      break
    default:
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
  }

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Handle empty strings as null for nullable fields
  const cleanedData = Object.fromEntries(
    Object.entries(parsed.data).map(([key, value]) => [
      key,
      value === '' ? null : value,
    ])
  )

  const updated = await updateBusiness(authResult.business.id, cleanedData)

  return NextResponse.json({ business: updated })
}
