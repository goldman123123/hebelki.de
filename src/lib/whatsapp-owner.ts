/**
 * WhatsApp Owner Phone Resolution
 *
 * Resolves the business owner's WhatsApp number for handoff routing.
 * Checks settings.ownerWhatsappNumber first, falls back to businesses.phone.
 */

import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { formatE164Phone } from '@/lib/whatsapp-phone-formatter'

/**
 * Get the owner's WhatsApp phone number for a business.
 * Returns E.164 format (e.g., "+4915123456789") or null if not configured.
 */
export async function getOwnerWhatsAppNumber(businessId: string): Promise<string | null> {
  const business = await db
    .select({ settings: businesses.settings, phone: businesses.phone })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1)
    .then(rows => rows[0])

  if (!business) return null

  const settings = (business.settings as Record<string, unknown>) || {}

  // Priority 1: Explicit owner WhatsApp number from settings
  if (settings.ownerWhatsappNumber && typeof settings.ownerWhatsappNumber === 'string') {
    return formatE164Phone(settings.ownerWhatsappNumber)
  }

  // Priority 2: Business phone number
  if (business.phone) {
    return formatE164Phone(business.phone)
  }

  return null
}
