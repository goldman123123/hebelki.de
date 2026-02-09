/**
 * Event Processor
 *
 * Processes events from the outbox asynchronously.
 * Handles event types by sending emails, triggering webhooks, etc.
 * Implements retry logic with exponential backoff.
 */

import { db } from '@/lib/db'
import { eventOutbox } from '@/lib/db/schema'
import { isNull, lt, lte, and, or, eq } from 'drizzle-orm'
import { sendEmail } from '@/lib/email'
import {
  bookingConfirmationEmail,
  bookingNotificationEmail,
  bookingConfirmedEmail,
  bookingCancellationEmail,
  bookingReminderEmail,
  invoiceSentEmail,
  liveChatRequestEmail,
  chatEscalatedEmail,
} from '@/lib/email-templates'
import { getDownloadUrl } from '@/lib/r2/client'
import type {
  EventType,
  BookingCreatedPayload,
  BookingConfirmedPayload,
  BookingCancelledPayload,
  BookingRemindedPayload,
  MemberInvitedPayload,
  InvoiceSentPayload,
  ChatLiveRequestedPayload,
  ChatEscalatedPayload,
} from './index'

// ============================================
// EVENT PROCESSOR
// ============================================

/**
 * Process unprocessed events from the outbox.
 * Should be called periodically (e.g., via cron job).
 *
 * @param limit - Maximum number of events to process in this batch
 * @returns Number of events successfully processed
 */
export async function processEvents(limit = 100): Promise<number> {
  console.log('[EventProcessor] Starting event processing, limit:', limit)

  // Fetch unprocessed events that haven't exceeded max attempts
  // Include events that are ready for retry (nextRetryAt is null or in the past)
  const events = await db
    .select()
    .from(eventOutbox)
    .where(and(
      isNull(eventOutbox.processedAt),
      lt(eventOutbox.attempts, eventOutbox.maxAttempts),
      or(
        isNull(eventOutbox.nextRetryAt),
        lte(eventOutbox.nextRetryAt, new Date())
      )
    ))
    .orderBy(eventOutbox.createdAt)
    .limit(limit)

  console.log(`[EventProcessor] Found ${events.length} events to process`)

  let processedCount = 0

  for (const event of events) {
    try {
      await processEvent(event)
      processedCount++
    } catch (error) {
      console.error(`[EventProcessor] Error processing event ${event.id}:`, error)
      // Continue processing other events
    }
  }

  console.log(`[EventProcessor] Successfully processed ${processedCount}/${events.length} events`)

  return processedCount
}

/**
 * Process a single event.
 */
async function processEvent(event: typeof eventOutbox.$inferSelect): Promise<void> {
  console.log(`[EventProcessor] Processing event ${event.id} (${event.eventType}), attempt ${event.attempts + 1}`)

  try {
    // Handle event based on type
    await handleEvent(event.eventType as EventType, event.payload as Record<string, unknown>)

    // Mark as processed
    await db
      .update(eventOutbox)
      .set({
        processedAt: new Date(),
        attempts: event.attempts + 1,
        lastError: null,
      })
      .where(eq(eventOutbox.id, event.id))

    console.log(`[EventProcessor] Event ${event.id} processed successfully`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const newAttempts = event.attempts + 1

    // Calculate next retry time with exponential backoff
    // 1st retry: 1 minute, 2nd: 5 minutes, 3rd: 15 minutes
    const backoffMinutes = [1, 5, 15][newAttempts - 1] || 30
    const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000)

    // Update event with error info
    await db
      .update(eventOutbox)
      .set({
        attempts: newAttempts,
        lastError: errorMessage.substring(0, 1000), // Limit error length
        nextRetryAt: newAttempts < event.maxAttempts ? nextRetryAt : null,
      })
      .where(eq(eventOutbox.id, event.id))

    console.error(
      `[EventProcessor] Event ${event.id} failed (attempt ${newAttempts}/${event.maxAttempts}):`,
      errorMessage
    )

    if (newAttempts >= event.maxAttempts) {
      console.error(`[EventProcessor] Event ${event.id} exceeded max attempts, will not retry`)
    } else {
      console.log(`[EventProcessor] Event ${event.id} will retry at ${nextRetryAt.toISOString()}`)
    }

    throw error
  }
}

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * Handle an event based on its type.
 */
async function handleEvent(eventType: EventType, payload: Record<string, unknown>): Promise<void> {
  switch (eventType) {
    case 'booking.created':
      await handleBookingCreated(payload as unknown as BookingCreatedPayload)
      break

    case 'booking.confirmed':
      await handleBookingConfirmed(payload as unknown as BookingConfirmedPayload)
      break

    case 'booking.cancelled':
      await handleBookingCancelled(payload as unknown as BookingCancelledPayload)
      break

    case 'booking.reminded':
      await handleBookingReminded(payload as unknown as BookingRemindedPayload)
      break

    case 'member.invited':
      await handleMemberInvited(payload as unknown as MemberInvitedPayload)
      break

    case 'invoice.sent':
      await handleInvoiceSent(payload as unknown as InvoiceSentPayload)
      break

    case 'chat.live_requested':
      await handleChatLiveRequested(payload as unknown as ChatLiveRequestedPayload)
      break

    case 'chat.escalated':
      await handleChatEscalated(payload as unknown as ChatEscalatedPayload)
      break

    default:
      console.warn(`[EventProcessor] Unknown event type: ${eventType}`)
      // Don't throw - mark as processed to avoid infinite retries
  }
}

/**
 * Handle booking.created event: Send confirmation email to customer + notification to business.
 */
async function handleBookingCreated(payload: BookingCreatedPayload): Promise<void> {
  console.log('[EventProcessor] Handling booking.created event')

  // Build confirmation URL for email confirmation flow
  const confirmationUrl = payload.requireEmailConfirmation && payload.confirmationToken
    ? `https://www.hebelki.de/confirm/${payload.confirmationToken}`
    : undefined

  // Send confirmation email to customer
  const customerEmail = bookingConfirmationEmail({
    customerName: payload.customerName,
    customerEmail: payload.customerEmail,
    serviceName: payload.serviceName,
    staffName: payload.staffName,
    businessName: payload.businessName,
    startsAt: new Date(payload.startsAt),
    endsAt: new Date(payload.endsAt),
    confirmationToken: payload.confirmationToken || '',
    notes: payload.notes,
    price: payload.price,
    currency: payload.currency,
    bookingStatus: payload.bookingStatus,
    confirmationUrl,
  })

  await sendEmail({
    to: payload.customerEmail,
    subject: customerEmail.subject,
    html: customerEmail.html,
    text: customerEmail.text,
  })

  console.log('[EventProcessor] Customer confirmation email sent')

  // Send notification email to business (if email configured)
  if (payload.businessEmail) {
    const notificationEmail = bookingNotificationEmail({
      customerName: payload.customerName,
      customerEmail: payload.customerEmail,
      customerPhone: payload.customerPhone,
      serviceName: payload.serviceName,
      staffName: payload.staffName,
      businessName: payload.businessName,
      startsAt: new Date(payload.startsAt),
      endsAt: new Date(payload.endsAt),
      confirmationToken: payload.confirmationToken || '',
      notes: payload.notes,
      price: payload.price,
      currency: payload.currency,
      bookingStatus: payload.bookingStatus,
    })

    await sendEmail({
      to: payload.businessEmail,
      subject: notificationEmail.subject,
      html: notificationEmail.html,
      text: notificationEmail.text,
    })

    console.log('[EventProcessor] Business notification email sent')
  }
}

/**
 * Handle booking.confirmed event: Send confirmation email to customer.
 */
async function handleBookingConfirmed(payload: BookingConfirmedPayload): Promise<void> {
  console.log('[EventProcessor] Handling booking.confirmed event')

  const email = bookingConfirmedEmail({
    customerName: payload.customerName,
    customerEmail: payload.customerEmail,
    serviceName: payload.serviceName,
    staffName: payload.staffName,
    businessName: payload.businessName,
    startsAt: new Date(payload.startsAt),
    endsAt: new Date(payload.endsAt),
    confirmationToken: payload.confirmationToken || '',
    price: payload.price,
    currency: payload.currency,
  })

  await sendEmail({
    to: payload.customerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })

  console.log('[EventProcessor] Booking confirmed email sent')
}

/**
 * Handle booking.cancelled event: Send cancellation email to customer.
 */
async function handleBookingCancelled(payload: BookingCancelledPayload): Promise<void> {
  console.log('[EventProcessor] Handling booking.cancelled event')

  const email = bookingCancellationEmail({
    customerName: payload.customerName,
    customerEmail: payload.customerEmail,
    serviceName: payload.serviceName,
    staffName: payload.staffName,
    businessName: payload.businessName,
    startsAt: new Date(payload.startsAt),
    endsAt: new Date(payload.endsAt),
    reason: payload.reason,
    confirmationToken: '',
    price: 0,
    currency: 'EUR',
  })

  await sendEmail({
    to: payload.customerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })

  console.log('[EventProcessor] Booking cancellation email sent')
}

/**
 * Handle booking.reminded event: Send reminder email to customer.
 */
async function handleBookingReminded(payload: BookingRemindedPayload): Promise<void> {
  console.log('[EventProcessor] Handling booking.reminded event')

  const email = bookingReminderEmail({
    customerName: payload.customerName,
    customerEmail: payload.customerEmail,
    serviceName: payload.serviceName,
    staffName: payload.staffName,
    businessName: payload.businessName,
    startsAt: new Date(payload.startsAt),
    endsAt: new Date(payload.endsAt),
    confirmationToken: payload.confirmationToken || '',
    price: 0,
    currency: 'EUR',
  })

  await sendEmail({
    to: payload.customerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })

  console.log('[EventProcessor] Booking reminder email sent')
}

/**
 * Handle member.invited event: Send invitation email.
 */
async function handleMemberInvited(payload: MemberInvitedPayload): Promise<void> {
  console.log('[EventProcessor] Handling member.invited event')

  // TODO: Create invitation email template
  // For now, send a simple email
  const subject = `Einladung zu ${payload.businessName} auf Hebelki`
  const html = `
    <h2>Sie wurden zu ${payload.businessName} eingeladen</h2>
    <p>Hallo ${payload.inviteeName || ''},</p>
    <p>${payload.inviterName} hat Sie eingeladen, ${payload.businessName} als ${payload.role} beizutreten.</p>
    <p><a href="${payload.invitationUrl}">Einladung annehmen</a></p>
    <p>Mit freundlichen Grüßen,<br>Das Hebelki-Team</p>
  `

  await sendEmail({
    to: payload.inviteeEmail,
    subject,
    html,
    text: `Sie wurden zu ${payload.businessName} eingeladen. ${payload.invitationUrl}`,
  })

  console.log('[EventProcessor] Member invitation email sent')
}

/**
 * Handle invoice.sent event: Send invoice PDF to customer via email.
 */
async function handleInvoiceSent(payload: InvoiceSentPayload): Promise<void> {
  console.log('[EventProcessor] Handling invoice.sent event')

  // Load invoice + customer from DB to get email and details
  const { db } = await import('@/lib/db')
  const { invoices, customers } = await import('@/lib/db/schema')
  const { eq } = await import('drizzle-orm')

  const [invoiceData] = await db
    .select({ invoice: invoices, customer: customers })
    .from(invoices)
    .leftJoin(customers, eq(invoices.customerId, customers.id))
    .where(eq(invoices.id, payload.invoiceId))
    .limit(1)

  if (!invoiceData?.customer?.email) {
    console.warn('[EventProcessor] No customer email for invoice', payload.invoiceId)
    return
  }

  // Generate 7-day presigned download URL
  const pdfDownloadUrl = payload.pdfR2Key
    ? await getDownloadUrl(payload.pdfR2Key, 604800) // 7 days
    : ''

  if (!pdfDownloadUrl) {
    console.warn('[EventProcessor] No PDF available for invoice', payload.invoiceId)
    return
  }

  // Format total for email
  const total = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(parseFloat(payload.total))

  // Format due date
  const dueDate = invoiceData.invoice.dueDate
    ? new Date(invoiceData.invoice.dueDate).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : undefined

  const email = invoiceSentEmail({
    customerName: invoiceData.customer.name || '',
    invoiceNumber: payload.invoiceNumber,
    businessName: payload.businessName,
    total,
    pdfDownloadUrl,
    dueDate,
  })

  await sendEmail({
    to: invoiceData.customer.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })

  console.log('[EventProcessor] Invoice sent email delivered to', invoiceData.customer.email)
}

/**
 * Handle chat.live_requested event: Notify business owner of new live chat request.
 */
async function handleChatLiveRequested(payload: ChatLiveRequestedPayload): Promise<void> {
  console.log('[EventProcessor] Handling chat.live_requested event')

  const email = liveChatRequestEmail({
    businessName: payload.businessName,
    customerName: payload.customerName,
    firstMessage: payload.firstMessage,
    dashboardUrl: payload.dashboardUrl,
  })

  await sendEmail({
    to: payload.ownerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })

  console.log('[EventProcessor] Live chat request email sent to', payload.ownerEmail)
}

/**
 * Handle chat.escalated event: Notify business owner of unanswered chat.
 */
async function handleChatEscalated(payload: ChatEscalatedPayload): Promise<void> {
  console.log('[EventProcessor] Handling chat.escalated event')

  const email = chatEscalatedEmail({
    businessName: payload.businessName,
    customerName: payload.customerName,
    customerEmail: payload.customerEmail,
    customerPhone: payload.customerPhone,
    conversationSummary: payload.conversationSummary,
    dashboardUrl: payload.dashboardUrl,
  })

  await sendEmail({
    to: payload.ownerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })

  console.log('[EventProcessor] Chat escalated email sent to', payload.ownerEmail)
}
