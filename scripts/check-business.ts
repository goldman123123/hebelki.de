import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') })

import { db } from '../src/lib/db'
import { businesses, businessMembers } from '../src/lib/db/schema'
import { eq, and } from 'drizzle-orm'

const userId = 'user_39EBBERjCUDWQm3khO1RU1yvUUr'
const businessId = '5690327e-1c21-441f-896b-8933a41fc382'

async function checkBusiness() {
  console.log(`\n🔍 Checking business setup...\n`)

  // Check if business exists
  const business = await db
    .select()
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1)

  console.log(`Business exists: ${business.length > 0}`)
  if (business.length > 0) {
    console.log(`  - Name: ${business[0].name}`)
    console.log(`  - Slug: ${business[0].slug}`)
    console.log(`  - Type: ${business[0].type}`)
  } else {
    console.log('❌ Business not found! This is the problem.')
    console.log('\nLet me check all businesses:')

    const allBusinesses = await db.select().from(businesses)
    console.log(`\nTotal businesses in database: ${allBusinesses.length}`)
    if (allBusinesses.length > 0) {
      allBusinesses.forEach(b => {
        console.log(`  - ${b.name} (${b.slug}) - ID: ${b.id}`)
      })
    }

    process.exit(1)
  }

  // Test the exact query from the error
  console.log('\n🔍 Testing the query from getBusinessForUser()...\n')

  const results = await db
    .select({
      business: businesses,
      role: businessMembers.role,
      status: businessMembers.status,
    })
    .from(businessMembers)
    .innerJoin(businesses, eq(businesses.id, businessMembers.businessId))
    .where(and(
      eq(businessMembers.clerkUserId, userId),
      eq(businessMembers.status, 'active')
    ))
    .limit(1)

  console.log(`Query result: ${results.length > 0 ? 'SUCCESS ✅' : 'FAILED ❌'}`)

  if (results.length > 0) {
    const biz = results[0].business
    console.log(`\nReturned business:`)
    console.log(`  - Name: ${biz.name}`)
    console.log(`  - Slug: ${biz.slug}`)
    console.log(`  - Role: ${results[0].role}`)
    console.log(`  - Status: ${results[0].status}`)
    console.log('\n✅ Everything looks good! The app should work now.')
  } else {
    console.log('❌ Query failed - this is the issue.')
  }

  process.exit(0)
}

checkBusiness().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
