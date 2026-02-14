/**
 * Customer API
 *
 * PATCH /api/customers/[id] - Update customer (including address)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:customers:id')

const updateCustomerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  street: z.string().max(100).optional().nullable(),
  city: z.string().max(50).optional().nullable(),
  postalCode: z.string().max(10).optional().nullable(),
  country: z.string().max(50).optional().nullable(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const parsed = updateCustomerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Update customer (with business ownership check)
    const [updated] = await db
      .update(customers)
      .set(parsed.data)
      .where(and(
        eq(customers.id, id),
        eq(customers.businessId, authResult.business.id)
      ))
      .returning()

    if (!updated) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({ customer: updated })
  } catch (error) {
    log.error('Error updating customer:', error)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params

  try {
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(
        eq(customers.id, id),
        eq(customers.businessId, authResult.business.id)
      ))
      .limit(1)

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({ customer })
  } catch (error) {
    log.error('Error getting customer:', error)
    return NextResponse.json({ error: 'Failed to get customer' }, { status: 500 })
  }
}
