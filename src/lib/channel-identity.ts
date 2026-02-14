/**
 * Channel Identity Resolution
 *
 * Determines if a phone number (WhatsApp/Voice) belongs to a team member.
 * Uses settings.teamPhoneNumbers map configured in the dashboard.
 *
 * Flow:
 * 1. Check owner phone via getOwnerWhatsAppNumber()
 * 2. Check settings.teamPhoneNumbers for admin/staff mapping
 * 3. If matched, verify 4-digit PIN before granting access
 */

import { db } from '@/lib/db'
import { businesses } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { formatE164Phone } from '@/lib/whatsapp-phone-formatter'
import { getOwnerWhatsAppNumber } from '@/lib/whatsapp-owner'
import bcrypt from 'bcryptjs'

// ============================================
// TYPES
// ============================================

export interface TeamPhoneEntry {
  phone: string        // E.164 format
  name: string         // Display name
  role: 'owner' | 'admin' | 'staff'
  clerkUserId?: string // Optional Clerk user ID
  pinHash: string      // bcrypt hash of 4-digit PIN
  email?: string       // For PIN reset emails
}

export interface ChannelIdentity {
  isTeamMember: boolean
  role: 'owner' | 'admin' | 'staff' | 'customer'
  name?: string
  clerkUserId?: string
  email?: string
  /** True if this phone requires PIN but hasn't been verified yet */
  requiresPin: boolean
}

// ============================================
// IDENTITY RESOLUTION
// ============================================

/**
 * Resolve if a phone number belongs to a team member for a business.
 *
 * Checks:
 * 1. Owner phone (from settings.ownerWhatsappNumber or businesses.phone)
 * 2. Team phone numbers (from settings.teamPhoneNumbers)
 */
export async function resolveChannelIdentity(
  phoneNumber: string,
  businessId: string,
): Promise<ChannelIdentity> {
  const normalized = formatE164Phone(phoneNumber)

  // 1. Check if caller is the owner
  const ownerPhone = await getOwnerWhatsAppNumber(businessId)
  if (ownerPhone && normalized === ownerPhone) {
    // Check if owner has a PIN configured in teamPhoneNumbers
    const teamPhones = await getTeamPhoneNumbers(businessId)
    const ownerEntry = teamPhones.find(
      (t) => formatE164Phone(t.phone) === normalized,
    )

    return {
      isTeamMember: true,
      role: 'owner',
      name: ownerEntry?.name,
      clerkUserId: ownerEntry?.clerkUserId,
      email: ownerEntry?.email,
      requiresPin: !!ownerEntry?.pinHash,
    }
  }

  // 2. Check team phone numbers
  const teamPhones = await getTeamPhoneNumbers(businessId)
  const match = teamPhones.find(
    (t) => formatE164Phone(t.phone) === normalized,
  )

  if (match) {
    return {
      isTeamMember: true,
      role: match.role,
      name: match.name,
      clerkUserId: match.clerkUserId,
      email: match.email,
      requiresPin: !!match.pinHash,
    }
  }

  // 3. Not a team member
  return {
    isTeamMember: false,
    role: 'customer',
    requiresPin: false,
  }
}

// ============================================
// PIN VERIFICATION
// ============================================

/**
 * Verify a 4-digit PIN against the stored hash for a team member.
 */
export async function verifyTeamPin(
  phoneNumber: string,
  businessId: string,
  pin: string,
): Promise<boolean> {
  const normalized = formatE164Phone(phoneNumber)
  const teamPhones = await getTeamPhoneNumbers(businessId)

  const match = teamPhones.find(
    (t) => formatE164Phone(t.phone) === normalized,
  )

  if (!match?.pinHash) return false

  return bcrypt.compare(pin, match.pinHash)
}

/**
 * Generate a random 4-digit PIN and return { pin, pinHash }.
 */
export async function generatePin(): Promise<{ pin: string; pinHash: string }> {
  const pin = String(Math.floor(1000 + Math.random() * 9000))
  const pinHash = await bcrypt.hash(pin, 10)
  return { pin, pinHash }
}

// ============================================
// HELPERS
// ============================================

/**
 * Get team phone numbers from business settings.
 */
async function getTeamPhoneNumbers(businessId: string): Promise<TeamPhoneEntry[]> {
  const business = await db
    .select({ settings: businesses.settings })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1)
    .then((rows) => rows[0])

  if (!business) return []

  const settings = (business.settings as Record<string, unknown>) || {}
  const teamPhones = settings.teamPhoneNumbers as TeamPhoneEntry[] | undefined

  return Array.isArray(teamPhones) ? teamPhones : []
}

/**
 * Check if a message looks like a PIN (4 digits).
 */
export function isPinAttempt(message: string): boolean {
  return /^\d{4}$/.test(message.trim())
}
