import { config } from 'dotenv'
config({ path: '.env.local' })
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// Get Clerk user ID to assign to existing business
const CLERK_USER_ID = process.env.SEED_CLERK_USER_ID || 'user_test_migration'

async function migrate() {
  console.log('🔄 Running migration: Add clerk_user_id to businesses...\n')

  try {
    // Check if column already exists
    const columnExists = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'businesses' AND column_name = 'clerk_user_id'
    `

    if (columnExists.length > 0) {
      console.log('✓ Column clerk_user_id already exists')

      // Check for NULL values
      const nullValues = await sql`
        SELECT id FROM businesses WHERE clerk_user_id IS NULL LIMIT 1
      `

      if (nullValues.length > 0) {
        console.log(`\n📝 Updating existing businesses with clerk_user_id: ${CLERK_USER_ID}`)
        await sql`
          UPDATE businesses
          SET clerk_user_id = ${CLERK_USER_ID}
          WHERE clerk_user_id IS NULL
        `
        console.log('✓ Updated existing businesses')
      }
    } else {
      // Add column as nullable first
      console.log('Adding clerk_user_id column...')
      await sql`
        ALTER TABLE businesses
        ADD COLUMN clerk_user_id TEXT
      `
      console.log('✓ Added clerk_user_id column')

      // Update existing rows
      console.log(`\nUpdating existing businesses with clerk_user_id: ${CLERK_USER_ID}`)
      await sql`
        UPDATE businesses
        SET clerk_user_id = ${CLERK_USER_ID}
        WHERE clerk_user_id IS NULL
      `
      console.log('✓ Updated existing businesses')

      // Make column NOT NULL
      console.log('\nMaking clerk_user_id NOT NULL...')
      await sql`
        ALTER TABLE businesses
        ALTER COLUMN clerk_user_id SET NOT NULL
      `
      console.log('✓ Column is now NOT NULL')

      // Add unique constraint
      console.log('\nAdding unique constraint...')
      await sql`
        ALTER TABLE businesses
        ADD CONSTRAINT businesses_clerk_user_id_unique UNIQUE (clerk_user_id)
      `
      console.log('✓ Added unique constraint')
    }

    console.log('\n═══════════════════════════════════════')
    console.log('✅ Migration completed successfully!')
    console.log('═══════════════════════════════════════\n')

    // Show current businesses
    const businesses = await sql`SELECT id, name, slug, clerk_user_id FROM businesses`
    console.log('Current businesses:')
    for (const b of businesses) {
      console.log(`  • ${b.name} (${b.slug}) - User: ${b.clerk_user_id}`)
    }
    console.log('')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Migration error:', err)
    process.exit(1)
  })
