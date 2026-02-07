import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL_UNPOOLED)

async function migrate() {
  console.log('Adding business info fields...')

  // Legal/Registration fields
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS legal_name TEXT`
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS legal_form TEXT`
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS registration_number TEXT`
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS registration_court TEXT`
  console.log('✓ Legal/Registration fields added')

  // Branding/Description fields
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS tagline TEXT`
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS description TEXT`
  console.log('✓ Tagline and description fields added')

  // Social Media fields
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS social_instagram TEXT`
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS social_facebook TEXT`
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS social_linkedin TEXT`
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS social_twitter TEXT`
  console.log('✓ Social media fields added')

  // Additional info
  await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS founded_year INTEGER`
  console.log('✓ Founded year field added')

  console.log('Migration completed successfully!')
}

migrate().catch(console.error)
