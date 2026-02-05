import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') })

import { db } from '../src/lib/db'
import { businesses, businessMembers } from '../src/lib/db/schema'
import { eq } from 'drizzle-orm'

const userId = 'user_39EBBERjCUDWQm3khO1RU1yvUUr'

async function checkUser() {
  console.log(`\n🔍 Checking user: ${userId}\n`)

  // Check for businesses owned by this user (legacy field)
  const ownedBusinesses = await db
    .select()
    .from(businesses)
    .where(eq(businesses.clerkUserId, userId))

  console.log(`Businesses owned (legacy clerk_user_id): ${ownedBusinesses.length}`)
  if (ownedBusinesses.length > 0) {
    console.log('Found businesses:')
    ownedBusinesses.forEach(b => {
      console.log(`  - ${b.name} (${b.slug}) - ID: ${b.id}`)
    })
  }

  // Check for business_members records
  const memberRecords = await db
    .select()
    .from(businessMembers)
    .where(eq(businessMembers.clerkUserId, userId))

  console.log(`\nBusiness member records: ${memberRecords.length}`)
  if (memberRecords.length > 0) {
    console.log('Found memberships:')
    memberRecords.forEach(m => {
      console.log(`  - Business ID: ${m.businessId}, Role: ${m.role}, Status: ${m.status}`)
    })
  }

  // If user has businesses but no business_members record, create it
  if (ownedBusinesses.length > 0 && memberRecords.length === 0) {
    console.log('\n⚠️  User has businesses but no business_members records!')
    console.log('Creating business_members records...\n')

    for (const business of ownedBusinesses) {
      await db.insert(businessMembers).values({
        businessId: business.id,
        clerkUserId: userId,
        role: 'owner',
        status: 'active',
        joinedAt: new Date(),
      })
      console.log(`✅ Created business_member record for: ${business.name}`)
    }
  } else if (ownedBusinesses.length === 0 && memberRecords.length === 0) {
    console.log('\n⚠️  No businesses or memberships found for this user.')
    console.log('User needs to complete onboarding to create a business.')
  } else {
    console.log('\n✅ User setup looks good!')
  }

  process.exit(0)
}

checkUser().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
