/**
 * Migration Script: Populate business_members from existing businesses
 *
 * This script migrates existing businesses that have clerkUserId to the
 * business_members table with role='owner' and status='active'.
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(__dirname, '../.env.local') })

import { db } from '../src/lib/db'
import { businesses, businessMembers } from '../src/lib/db/schema'
import { sql } from 'drizzle-orm'

async function migrateToBusinessMembers() {
  console.log('🔄 Starting migration: business_members population...\n')

  try {
    // Step 1: Check how many businesses have clerkUserId
    const businessesWithClerkUserId = await db
      .select({ count: sql<number>`count(*)` })
      .from(businesses)
      .where(sql`clerk_user_id IS NOT NULL`)

    console.log(`Found ${businessesWithClerkUserId[0]?.count || 0} businesses with clerkUserId`)

    // Step 2: Check existing business_members
    const existingMembers = await db
      .select({ count: sql<number>`count(*)` })
      .from(businessMembers)
      .where(sql`role = 'owner'`)

    console.log(`Found ${existingMembers[0]?.count || 0} existing owner members\n`)

    // Step 3: Run migration
    console.log('Running migration...')

    const result = await db.execute(sql`
      INSERT INTO business_members (business_id, clerk_user_id, role, status, joined_at, created_at, updated_at)
      SELECT
        id as business_id,
        clerk_user_id,
        'owner' as role,
        'active' as status,
        created_at as joined_at,
        created_at,
        updated_at
      FROM businesses
      WHERE clerk_user_id IS NOT NULL
      ON CONFLICT (business_id, clerk_user_id) DO NOTHING;
    `)

    console.log('✅ Migration completed!')

    // Step 4: Verify results
    const newMemberCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(businessMembers)
      .where(sql`role = 'owner'`)

    console.log(`\nVerification:`)
    console.log(`- Total owner members now: ${newMemberCount[0]?.count || 0}`)

    // Check for businesses without owners
    const businessesWithoutOwner = await db.execute(sql`
      SELECT b.id, b.name, b.slug
      FROM businesses b
      LEFT JOIN business_members bm ON b.id = bm.business_id AND bm.role = 'owner'
      WHERE bm.id IS NULL
      LIMIT 5;
    `)

    const orphanedBusinesses = businessesWithoutOwner.rows || []
    if (orphanedBusinesses.length > 0) {
      console.log(`\n⚠️  Warning: ${orphanedBusinesses.length} businesses found without owner:`)
      orphanedBusinesses.forEach((biz: any) => {
        console.log(`   - ${biz.name} (${biz.slug})`)
      })
    } else {
      console.log('✅ All businesses have owners!')
    }

    console.log('\n✅ Migration successful!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }

  process.exit(0)
}

// Run migration
migrateToBusinessMembers()
