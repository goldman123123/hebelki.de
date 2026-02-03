import { NextRequest, NextResponse } from 'next/server'
import { requireBusinessAuth } from '@/lib/auth'
import { getBookingById, updateBookingStatus, verifyBookingOwnership } from '@/lib/db/queries'
import { bookingStatusSchema } from '@/lib/validations/schemas'
import { sendEmail } from '@/lib/email'
import { bookingConfirmedEmail, bookingCancellationEmail } from '@/lib/email-templates'

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
  const isOwner = await verifyBookingOwnership(id, authResult.business.id)
  if (!isOwner) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const booking = await getBookingById(id)

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  return NextResponse.json({ booking })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireBusinessAuth()
  if (!authResult.success) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params

  // Verify ownership
  const isOwner = await verifyBookingOwnership(id, authResult.business.id)
  if (!isOwner) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Get current booking details before update (for email data)
  const currentBooking = await getBookingById(id)
  if (!currentBooking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const body = await request.json()

  const parsed = bookingStatusSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { status, cancellationReason, cancelledBy, internalNotes } = parsed.data
  const previousStatus = currentBooking.booking.status

  const booking = await updateBookingStatus(id, status, {
    cancellationReason: cancellationReason || undefined,
    cancelledBy: cancelledBy || undefined,
    internalNotes: internalNotes || undefined,
  })

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Send status change emails
  if (status !== previousStatus && currentBooking.customer?.email) {
    const emailData = {
      customerName: currentBooking.customer.name || 'Kunde',
      customerEmail: currentBooking.customer.email,
      serviceName: currentBooking.service?.name || 'Service',
      staffName: currentBooking.staffMember?.name,
      businessName: authResult.business.name,
      startsAt: currentBooking.booking.startsAt,
      endsAt: currentBooking.booking.endsAt,
      confirmationToken: currentBooking.booking.confirmationToken || currentBooking.booking.id,
      price: currentBooking.service?.price ? parseFloat(currentBooking.service.price) : undefined,
      currency: authResult.business.currency || 'EUR',
    }

    try {
      if (status === 'confirmed' && previousStatus !== 'confirmed') {
        // Send confirmation email
        const email = bookingConfirmedEmail(emailData)
        await sendEmail({
          to: currentBooking.customer.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
        })
      } else if (status === 'cancelled' && previousStatus !== 'cancelled') {
        // Send cancellation email
        const email = bookingCancellationEmail({
          ...emailData,
          reason: cancellationReason || undefined,
        })
        await sendEmail({
          to: currentBooking.customer.email,
          subject: email.subject,
          html: email.html,
          text: email.text,
        })
      }
    } catch (emailError) {
      console.error('Error sending status change email:', emailError)
      // Don't fail the status update if email fails
    }
  }

  return NextResponse.json({ booking })
}
