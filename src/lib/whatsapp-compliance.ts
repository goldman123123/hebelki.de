/**
 * WhatsApp Compliance Module
 *
 * Handles Twilio + Meta/WhatsApp compliance requirements:
 * - STOP/START keyword detection
 * - Opt-in/opt-out state tracking
 * - Consent management
 *
 * CRITICAL: These functions must be called BEFORE AI processing
 * to ensure compliance with Twilio and Meta policies.
 */

import { db } from '@/lib/db'
import { customers } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { createLogger } from '@/lib/logger'

const log = createLogger('lib:whatsapp-compliance')

// Twilio-compliant keywords for opt-out
export const STOP_KEYWORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT']

// Twilio-compliant keywords for opt-in
export const START_KEYWORDS = ['START', 'YES', 'UNSTOP']

/**
 * Detects if a message contains an opt-out keyword
 *
 * @param message - The message text to check
 * @returns true if message contains a STOP keyword
 */
export function detectOptOutKeyword(message: string): boolean {
  const normalizedMessage = message.trim().toUpperCase()

  return STOP_KEYWORDS.some(keyword => {
    // Match exact word boundaries to avoid false positives
    const regex = new RegExp(`\\b${keyword}\\b`)
    return regex.test(normalizedMessage)
  })
}

/**
 * Detects if a message contains an opt-in keyword
 *
 * @param message - The message text to check
 * @returns true if message contains a START keyword
 */
export function detectOptInKeyword(message: string): boolean {
  const normalizedMessage = message.trim().toUpperCase()

  return START_KEYWORDS.some(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`)
    return regex.test(normalizedMessage)
  })
}

/**
 * Handles customer opt-out request
 * Updates customer record with opt-out status and timestamp
 *
 * @param customerId - The customer UUID
 * @param message - The opt-out message (for evidence)
 */
export async function handleOptOut(
  customerId: string,
  message: string
): Promise<void> {
  await db.update(customers)
    .set({
      whatsappOptInStatus: 'OPTED_OUT',
      whatsappOptOutAt: new Date(),
      whatsappOptOutReason: message.trim(),
    })
    .where(eq(customers.id, customerId))

  // Log for audit trail
  log.info(`Customer ${customerId} opted out via keyword`)
}

/**
 * Handles customer opt-in request
 * Updates customer record with opt-in status and timestamp
 *
 * @param customerId - The customer UUID
 * @param message - The opt-in message (for evidence)
 */
export async function handleOptIn(
  customerId: string,
  message: string
): Promise<void> {
  await db.update(customers)
    .set({
      whatsappOptInStatus: 'OPTED_IN',
      whatsappOptInAt: new Date(),
      whatsappOptInSource: 'keyword_start',
      whatsappOptInEvidence: message.trim(),
    })
    .where(eq(customers.id, customerId))

  log.info(`Customer ${customerId} opted in via keyword`)
}

/**
 * Handles implicit opt-in from first message
 * Used when a customer sends their first WhatsApp message
 *
 * @param customerId - The customer UUID
 * @param message - The first message (for evidence)
 */
export async function handleImplicitOptIn(
  customerId: string,
  message: string
): Promise<void> {
  // Check if customer already has opt-in status
  const customer = await db.select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1)

  if (customer[0]?.whatsappOptInStatus === 'UNSET') {
    await db.update(customers)
      .set({
        whatsappOptInStatus: 'OPTED_IN',
        whatsappOptInAt: new Date(),
        whatsappOptInSource: 'first_message',
        whatsappOptInEvidence: message.trim(),
      })
      .where(eq(customers.id, customerId))

    log.info(`Customer ${customerId} implicitly opted in via first message`)
  }
}

/**
 * Verifies if a customer has valid opt-in status
 *
 * @param customerId - The customer UUID
 * @returns true if customer is opted in
 */
export async function verifyOptInStatus(customerId: string): Promise<boolean> {
  const customer = await db.select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1)

  return customer[0]?.whatsappOptInStatus === 'OPTED_IN'
}

/**
 * Gets standardized opt-out confirmation message
 *
 * @returns Confirmation message text
 */
export function getOptOutConfirmation(): string {
  return "You have been unsubscribed from WhatsApp messages. Reply START to opt back in."
}

/**
 * Gets standardized opt-in confirmation message
 *
 * @returns Confirmation message text
 */
export function getOptInConfirmation(): string {
  return "You have been subscribed to WhatsApp messages. Reply STOP to unsubscribe at any time."
}
