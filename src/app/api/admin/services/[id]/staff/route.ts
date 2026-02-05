import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { verifyServiceOwnership } from '@/lib/db/queries'
import { db } from '@/lib/db'
import { staffServices, staff } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'

/**
 * GET /api/admin/services/[id]/staff
 * Get staff priority list for a service
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id: serviceId } = await params

  // Verify service ownership
  const isOwner = await verifyServiceOwnership(serviceId, authResult.business.id)
  if (!isOwner) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }

  // Get staff for this service (ordered by priority)
  const staffList = await db
    .select({
      staffId: staffServices.staffId,
      name: staff.name,
      email: staff.email,
      sortOrder: staffServices.sortOrder,
      isActive: staffServices.isActive,
    })
    .from(staffServices)
    .innerJoin(staff, eq(staff.id, staffServices.staffId))
    .where(and(
      eq(staffServices.serviceId, serviceId),
      eq(staff.businessId, authResult.business.id),
      eq(staff.isActive, true) // Only show active staff
    ))
    .orderBy(asc(staffServices.sortOrder), asc(staff.name))

  return NextResponse.json({ staff: staffList })
}

/**
 * PUT /api/admin/services/[id]/staff
 * Update staff priority order for a service
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id: serviceId } = await params

  // Verify service ownership
  const isOwner = await verifyServiceOwnership(serviceId, authResult.business.id)
  if (!isOwner) {
    return NextResponse.json({ error: 'Service not found' }, { status: 404 })
  }

  const body = await req.json()
  const { staffPriority } = body

  if (!Array.isArray(staffPriority)) {
    return NextResponse.json(
      { error: 'Invalid request: staffPriority must be an array' },
      { status: 400 }
    )
  }

  // Validate each item
  for (const item of staffPriority) {
    if (!item.staffId || typeof item.sortOrder !== 'number' || typeof item.isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request: each item must have staffId, sortOrder, and isActive' },
        { status: 400 }
      )
    }
  }

  // Update staff priority in transaction
  try {
    await db.transaction(async (tx) => {
      for (const { staffId, sortOrder, isActive } of staffPriority) {
        await tx
          .update(staffServices)
          .set({
            sortOrder,
            isActive,
            updatedAt: new Date()
          })
          .where(and(
            eq(staffServices.serviceId, serviceId),
            eq(staffServices.staffId, staffId)
          ))
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating staff priority:', error)
    return NextResponse.json(
      { error: 'Failed to update staff priority' },
      { status: 500 }
    )
  }
}
