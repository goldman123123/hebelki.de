import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { updateBusiness } from '@/lib/db/queries'
import { z } from 'zod'

async function getFirstBusiness() {
  const results = await db.select().from(businesses).limit(1)
  return results[0] || null
}

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
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const business = await getFirstBusiness()
  if (!business) {
    return NextResponse.json({ error: 'No business configured' }, { status: 404 })
  }

  return NextResponse.json({ business })
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const business = await getFirstBusiness()
  if (!business) {
    return NextResponse.json({ error: 'No business configured' }, { status: 404 })
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

  const updated = await updateBusiness(business.id, cleanedData)

  return NextResponse.json({ business: updated })
}
