import { db } from './index'
import { bookingHolds, bookings, bookingActions, businesses, staff } from './schema'
import { eq, and, gte, lte, lt } from 'drizzle-orm'

/**
 * Create a hold on a time slot (5-minute expiration by default)
 */
export async function createHold(params: {
  businessId: string
  serviceId: string
  staffId?: string | null
  customerId?: string | null
  startsAt: Date
  endsAt: Date
  holdDurationMinutes?: number // Default: 5
  createdBy: 'web' | 'chatbot' | 'admin' | 'whatsapp'
  customerTimezone?: string
  idempotencyKey?: string
  metadata?: Record<string, unknown>
}) {
  const {
    businessId,
    serviceId,
    staffId,
    customerId,
    startsAt,
    endsAt,
    holdDurationMinutes = 5,
    createdBy,
    customerTimezone,
    idempotencyKey,
    metadata = {},
  } = params

  const expiresAt = new Date(Date.now() + holdDurationMinutes * 60 * 1000)

  // Check idempotency - if a hold with this key already exists and hasn't expired, return it
  if (idempotencyKey) {
    const existingHold = await db
      .select()
      .from(bookingHolds)
      .where(and(
        eq(bookingHolds.businessId, businessId),
        eq(bookingHolds.idempotencyKey, idempotencyKey),
        gte(bookingHolds.expiresAt, new Date())
      ))
      .limit(1)
      .then(rows => rows[0])

    if (existingHold) {
      return {
        holdId: existingHold.id,
        expiresAt: existingHold.expiresAt,
        startsAt: existingHold.startsAt,
        endsAt: existingHold.endsAt,
        alreadyExists: true,
      }
    }
  }

  const [hold] = await db
    .insert(bookingHolds)
    .values({
      businessId,
      serviceId,
      staffId: staffId || null,
      customerId: customerId || null,
      startsAt,
      endsAt,
      expiresAt,
      customerTimezone: customerTimezone || null,
      idempotencyKey: idempotencyKey || null,
      createdBy,
      metadata,
    })
    .returning()

  return {
    holdId: hold.id,
    expiresAt: hold.expiresAt,
    startsAt: hold.startsAt,
    endsAt: hold.endsAt,
    alreadyExists: false,
  }
}

/**
 * Confirm a hold and create the booking (idempotent)
 */
export async function confirmHold(params: {
  holdId: string
  businessId: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  customerTimezone?: string
  notes?: string
  idempotencyKey?: string
}) {
  const {
    holdId,
    businessId,
    customerName,
    customerEmail,
    customerPhone,
    customerTimezone,
    notes,
    idempotencyKey,
  } = params

  return db.transaction(async (tx) => {
    // 1. Get hold
    const hold = await tx
      .select()
      .from(bookingHolds)
      .where(and(eq(bookingHolds.id, holdId), eq(bookingHolds.businessId, businessId)))
      .limit(1)
      .then(rows => rows[0])

    if (!hold) throw new Error('Hold not found')

    // 2. Check expiration
    if (new Date() > hold.expiresAt) {
      await tx.delete(bookingHolds).where(eq(bookingHolds.id, holdId))
      throw new Error('Hold expired. Please select a new time slot.')
    }

    // 3. Idempotency check
    if (idempotencyKey) {
      const existing = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.idempotencyKey, idempotencyKey))
        .limit(1)
        .then(rows => rows[0])

      if (existing) {
        return { bookingId: existing.id, confirmationToken: existing.confirmationToken, alreadyExists: true }
      }
    }

    // 4. Get/create customer and service info
    const { getOrCreateCustomer, getServiceById } = await import('./queries')
    const customer = await getOrCreateCustomer(businessId, customerEmail, customerName, customerPhone)
    const service = await getServiceById(hold.serviceId, businessId)

    // 4b. Get business and staff info for email
    const business = await tx
      .select()
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1)
      .then(rows => rows[0])

    let staffName: string | undefined
    if (hold.staffId) {
      const staffMember = await tx
        .select()
        .from(staff)
        .where(eq(staff.id, hold.staffId))
        .limit(1)
        .then(rows => rows[0])
      staffName = staffMember?.name
    }

    // 5. Create booking
    const [booking] = await tx
      .insert(bookings)
      .values({
        businessId,
        serviceId: hold.serviceId,
        staffId: hold.staffId,
        customerId: customer.id,
        startsAt: hold.startsAt,
        endsAt: hold.endsAt,
        customerTimezone: customerTimezone || null,
        price: service?.price,
        notes,
        status: 'pending',
        source: hold.createdBy,
        holdId: hold.id,
        idempotencyKey: idempotencyKey || null,
      })
      .returning()

    // 6. Delete hold (consumed)
    await tx.delete(bookingHolds).where(eq(bookingHolds.id, holdId))

    // 7. Log action
    await tx.insert(bookingActions).values({
      bookingId: booking.id,
      action: 'created',
      actorType: hold.createdBy === 'admin' ? 'staff' : 'customer',
      metadata: { holdId: hold.id, source: hold.createdBy },
    })

    // 8. Emit event
    const { emitEvent } = await import('@/modules/core/events')
    await emitEvent(tx, businessId, 'booking.created', {
      bookingId: booking.id,
      customerEmail,
      customerName,
      customerPhone,
      serviceName: service?.name || 'Unknown Service',
      businessName: business?.name || 'Unknown Business',
      businessEmail: business?.email || undefined,
      staffName,
      startsAt: booking.startsAt.toISOString(),
      endsAt: booking.endsAt.toISOString(),
      confirmationToken: booking.confirmationToken ?? undefined,
      notes,
      price: service?.price ? parseFloat(service.price) : undefined,
      currency: business?.currency || 'EUR',
    })

    return { bookingId: booking.id, confirmationToken: booking.confirmationToken, alreadyExists: false }
  })
}

/**
 * Cancel/release a hold
 */
export async function cancelHold(holdId: string, businessId: string) {
  await db.delete(bookingHolds).where(and(eq(bookingHolds.id, holdId), eq(bookingHolds.businessId, businessId)))
  return { success: true }
}

/**
 * Cleanup expired holds (cron job)
 */
export async function cleanupExpiredHolds() {
  const deleted = await db.delete(bookingHolds).where(lt(bookingHolds.expiresAt, new Date())).returning()
  console.log(`[Holds] Cleaned up ${deleted.length} expired holds`)
  return deleted.length
}

/**
 * Get active holds for availability checking
 */
export async function getActiveHolds(params: {
  businessId: string
  serviceId?: string
  staffId?: string | null
  startDate: Date
  endDate: Date
}) {
  const conditions = [
    eq(bookingHolds.businessId, params.businessId),
    gte(bookingHolds.expiresAt, new Date()),
    gte(bookingHolds.startsAt, params.startDate),
    lte(bookingHolds.startsAt, params.endDate),
  ]

  if (params.serviceId) conditions.push(eq(bookingHolds.serviceId, params.serviceId))
  if (params.staffId) conditions.push(eq(bookingHolds.staffId, params.staffId))

  return db.select().from(bookingHolds).where(and(...conditions))
}
