import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL_UNPOOLED)

async function migrate() {
  console.log('Starting migration...')

  // 1. Add address fields to customers table
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS street TEXT`
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS city TEXT`
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code TEXT`
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Deutschland'`
  console.log('✓ Customer address fields added')

  // 2. Create invoice_sequences table
  await sql`
    CREATE TABLE IF NOT EXISTS invoice_sequences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      last_number INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `
  console.log('✓ Invoice sequences table created')

  // Create unique index
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS invoice_sequences_business_year_idx
    ON invoice_sequences(business_id, year)
  `
  console.log('✓ Invoice sequences index created')

  // 3. Update invoices table with new columns
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 19.00`
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) DEFAULT 0`
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS service_date DATE`
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_r2_key TEXT`
  console.log('✓ Invoice columns added')

  // 4. Create index on booking_id for invoices
  await sql`CREATE INDEX IF NOT EXISTS invoices_booking_idx ON invoices(booking_id)`
  console.log('✓ Invoice booking index created')

  console.log('Migration completed successfully!')
}

migrate().catch(console.error)
