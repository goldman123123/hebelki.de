/**
 * Migration: Add booking confirmation + Lieferschein columns
 *
 * Adds:
 * 1. require_email_confirmation (boolean) to businesses
 * 2. items (jsonb) to bookings
 * 3. lieferschein_r2_key (text) to bookings
 *
 * Run: npx tsx scripts/add-booking-confirmation-columns.ts
 */

import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const sql = neon(DATABASE_URL)

async function migrate() {
  console.log('Starting migration...')

  // 1. Add require_email_confirmation to businesses
  try {
    await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS require_email_confirmation boolean DEFAULT false`
    console.log('✓ Added require_email_confirmation to businesses')
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      console.log('⏭ require_email_confirmation already exists')
    } else {
      throw e
    }
  }

  // 2. Add items (jsonb) to bookings
  try {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS items jsonb`
    console.log('✓ Added items to bookings')
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      console.log('⏭ items already exists')
    } else {
      throw e
    }
  }

  // 3. Add lieferschein_r2_key (text) to bookings
  try {
    await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS lieferschein_r2_key text`
    console.log('✓ Added lieferschein_r2_key to bookings')
  } catch (e: any) {
    if (e.message?.includes('already exists')) {
      console.log('⏭ lieferschein_r2_key already exists')
    } else {
      throw e
    }
  }

  console.log('\nMigration complete!')
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
