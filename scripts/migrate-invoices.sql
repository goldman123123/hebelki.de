-- Invoice Generator Migration
-- Adds customer address fields, invoice sequences, and updates invoices table

-- 1. Add address fields to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Deutschland';

-- 2. Create invoice_sequences table
CREATE TABLE IF NOT EXISTS invoice_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index on business_id and year
CREATE UNIQUE INDEX IF NOT EXISTS invoice_sequences_business_year_idx
ON invoice_sequences(business_id, year);

-- 3. Update invoices table with new columns
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 19.00;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS service_date DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_r2_key TEXT;

-- 4. Create index on booking_id for invoices
CREATE INDEX IF NOT EXISTS invoices_booking_idx ON invoices(booking_id);

-- Done!
SELECT 'Migration completed successfully' as status;
