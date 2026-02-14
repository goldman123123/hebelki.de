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
  bookingRescheduledEmail,
  bookingReminderEmail,
  invoiceSentEmail,
  liveChatRequestEmail,
  chatEscalatedEmail,
  memberInvitedEmail,
} from '@/lib/email-templates'
import { getDownloadUrl } from '@/lib/r2/client'
import type {
  EventType,
  BookingCreatedPayload,
  BookingConfirmedPayload,
  BookingCancelledPayload,
  BookingRescheduledPayload,
  BookingRemindedPayload,
  MemberInvitedPayload,
  InvoiceSentPayload,
  ChatLiveRequestedPayload,
  ChatEscalatedPayload,
} from './index'
import { createLogger } from '@/lib/logger'

const log = createLogger('core:events:processor')

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
  log.info('Starting event processing, limit:', limit)

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

  log.info(`Found ${events.length} events to process`)

  let processedCount = 0

  for (const event of events) {
    try {
      await processEvent(event)
      processedCount++
    } catch (error) {
      log.error(`Error processing event ${event.id}:`, error)
      // Continue processing other events
    }
  }

  log.info(`Successfully processed ${processedCount}/${events.length} events`)

  return processedCount
}

/**
 * Process a single event.
 */
async function processEvent(event: typeof eventOutbox.$inferSelect): Promise<void> {
  log.info(`Processing event ${event.id} (${event.eventType}), attempt ${event.attempts + 1}`)

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

    log.info(`Event ${event.id} processed successfully`)
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

    log.error(
      `[EventProcessor] Event ${event.id} failed (attempt ${newAttempts}/${event.maxAttempts}):`,
      errorMessage
    )

    if (newAttempts >= event.maxAttempts) {
      log.error(`Event ${event.id} exceeded max attempts, will not retry`)
    } else {
      log.info(`Event ${event.id} will retry at ${nextRetryAt.toISOString()}`)
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

    case 'booking.rescheduled':
      await handleBookingRescheduled(payload as unknown as BookingRescheduledPayload)
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
      log.warn(`Unknown event type: ${eventType}`)
      // Don't throw - mark as processed to avoid infinite retries
  }
}

/**
 * Handle booking.created event: Send confirmation email to customer + notification to business.
 */
async function handleBookingCreated(payload: BookingCreatedPayload): Promise<void> {
  log.info('Handling booking.created event')

  // Build confirmation URL for email confirmation flow
  const confirmationUrl = payload.requireEmailConfirmation && payload.confirmationToken
    ? `https://www.hebelki.de/confirm/${payload.confirmationToken}`
    : undefined

  // Build manage URL for self-service link
  const manageUrl = payload.confirmationToken
    ? `https://www.hebelki.de/manage/${payload.confirmationToken}`
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
    manageUrl,
  })

  await sendEmail({
    to: payload.customerEmail,
    subject: customerEmail.subject,
    html: customerEmail.html,
    text: customerEmail.text,
  })

  log.info('Customer confirmation email sent')

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

    log.info('Business notification email sent')
  }
}

/**
 * Handle booking.confirmed event: Send confirmation email to customer.
 */
async function handleBookingConfirmed(payload: BookingConfirmedPayload): Promise<void> {
  log.info('Handling booking.confirmed event')

  const manageUrl = payload.confirmationToken
    ? `https://www.hebelki.de/manage/${payload.confirmationToken}`
    : undefined

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
    manageUrl,
  })

  await sendEmail({
    to: payload.customerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })

  log.info('Booking confirmed email sent')
}

/**
 * Handle booking.cancelled event: Send cancellation email to customer.
 */
async function handleBookingCancelled(payload: BookingCancelledPayload): Promise<void> {
  log.info('Handling booking.cancelled event')

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

  log.info('Booking cancellation email sent')
}

/**
 * Handle booking.rescheduled event: Send reschedule confirmation email to customer.
 */
async function handleBookingRescheduled(payload: BookingRescheduledPayload): Promise<void> {
  log.info('Handling booking.rescheduled event')

  const manageUrl = payload.confirmationToken
    ? `https://www.hebelki.de/manage/${payload.confirmationToken}`
    : undefined

  const email = bookingRescheduledEmail({
    customerName: payload.customerName,
    customerEmail: payload.customerEmail,
    serviceName: payload.serviceName,
    staffName: payload.staffName,
    businessName: payload.businessName,
    oldStartsAt: new Date(payload.oldStartsAt),
    oldEndsAt: new Date(payload.oldEndsAt),
    newStartsAt: new Date(payload.newStartsAt),
    newEndsAt: new Date(payload.newEndsAt),
    confirmationToken: payload.confirmationToken || '',
    manageUrl,
  })

  await sendEmail({
    to: payload.customerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })

  log.info('Booking rescheduled email sent')
}

/**
 * Handle booking.reminded event: Send reminder email to customer.
 */
async function handleBookingReminded(payload: BookingRemindedPayload): Promise<void> {
  log.info('Handling booking.reminded event')

  const manageUrl = payload.confirmationToken
    ? `https://www.hebelki.de/manage/${payload.confirmationToken}`
    : undefined

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
    manageUrl,
  })

  await sendEmail({
    to: payload.customerEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })

  log.info('Booking reminder email sent')
}

/**
 * Handle member.invited event: Send invitation email.
 */
async function handleMemberInvited(payload: MemberInvitedPayload): Promise<void> {
  log.info('Handling member.invited event')

  const email = memberInvitedEmail({
    inviterName: payload.inviterName,
    businessName: payload.businessName,
    role: payload.role,
    inviteeName: payload.inviteeName,
    acceptUrl: payload.invitationUrl,
  })

  await sendEmail({
    to: payload.inviteeEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  })

  log.info('Member invitation email sent')
}

/**
 * Handle invoice.sent event: Send invoice PDF to customer via email.
 */
async function handleInvoiceSent(payload: InvoiceSentPayload): Promise<void> {
  log.info('Handling invoice.sent event')

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
    log.warn('No customer email for invoice', payload.invoiceId)
    return
  }

  // Generate 7-day presigned download URL
  const pdfDownloadUrl = payload.pdfR2Key
    ? await getDownloadUrl(payload.pdfR2Key, 604800) // 7 days
    : ''

  if (!pdfDownloadUrl) {
    log.warn('No PDF available for invoice', payload.invoiceId)
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

  log.info('Invoice sent email delivered to', invoiceData.customer.email)
}

/**
 * Handle chat.live_requested event: Notify business owner of new live chat request.
 */
async function handleChatLiveRequested(payload: ChatLiveRequestedPayload): Promise<void> {
  log.info('Handling chat.live_requested event')

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

  log.info('Live chat request email sent to', payload.ownerEmail)
}

/**
 * Handle chat.escalated event: Notify business owner of unanswered chat.
 */
async function handleChatEscalated(payload: ChatEscalatedPayload): Promise<void> {
  log.info('Handling chat.escalated event')

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

  log.info('Chat escalated email sent to', payload.ownerEmail)
}
