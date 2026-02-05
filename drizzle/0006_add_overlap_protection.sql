-- Migration: Add Overlap Protection and Schema Hardening
-- Date: 2026-02-05
-- Purpose: Prevent race conditions and double-bookings at database level

-- ============================================
-- STEP 1: Enable btree_gist extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================
-- STEP 2: Add new fields to booking_holds
-- ============================================

-- Add customerTimezone field (for showing correct local time to customer)
ALTER TABLE booking_holds
ADD COLUMN IF NOT EXISTS customer_timezone TEXT;

-- Add idempotencyKey field (prevents duplicate holds from WhatsApp retries, etc.)
ALTER TABLE booking_holds
ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create unique index for idempotency (businessId + idempotencyKey)
CREATE UNIQUE INDEX IF NOT EXISTS booking_holds_idempotency_key_idx
ON booking_holds(business_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- ============================================
-- STEP 3: Fix bookings.holdId FK constraint
-- ============================================

-- Add FK constraint to bookings.hold_id (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'bookings_hold_id_booking_holds_id_fk'
  ) THEN
    ALTER TABLE bookings
    ADD CONSTRAINT bookings_hold_id_booking_holds_id_fk
    FOREIGN KEY (hold_id) REFERENCES booking_holds(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create unique index for holdId (one hold → max one booking)
CREATE UNIQUE INDEX IF NOT EXISTS bookings_hold_id_idx
ON bookings(hold_id)
WHERE hold_id IS NOT NULL;

-- ============================================
-- STEP 4: Make businesses.timezone NOT NULL
-- ============================================

-- Set default timezone for any NULL values
UPDATE businesses
SET timezone = 'Europe/Berlin'
WHERE timezone IS NULL;

-- Add NOT NULL constraint
ALTER TABLE businesses
ALTER COLUMN timezone SET NOT NULL;

-- ============================================
-- STEP 5: Add exclusion constraints (CRITICAL - Prevents race conditions)
-- ============================================

-- Prevent overlapping bookings for same staff member
-- This is the GOLD STANDARD for preventing double-bookings
-- Uses tsrange to check if [starts_at, ends_at) overlaps with existing bookings
CREATE INDEX IF NOT EXISTS bookings_staff_overlap_idx ON bookings
USING GIST (
  business_id,
  staff_id,
  tsrange(starts_at, ends_at)
);

DO $$
BEGIN
  -- Check if the exclusion constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'no_overlapping_staff_bookings'
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT no_overlapping_staff_bookings
      EXCLUDE USING GIST (
        business_id WITH =,
        staff_id WITH =,
        tsrange(starts_at, ends_at) WITH &&
      )
      WHERE (staff_id IS NOT NULL AND status NOT IN ('cancelled'));
  END IF;
END $$;

-- Prevent overlapping holds for same staff member
CREATE INDEX IF NOT EXISTS booking_holds_staff_overlap_idx ON booking_holds
USING GIST (
  business_id,
  staff_id,
  tsrange(starts_at, ends_at)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'no_overlapping_holds_staff'
  ) THEN
    ALTER TABLE booking_holds ADD CONSTRAINT no_overlapping_holds_staff
      EXCLUDE USING GIST (
        business_id WITH =,
        staff_id WITH =,
        tsrange(starts_at, ends_at) WITH &&
      )
      WHERE (staff_id IS NOT NULL AND expires_at > NOW());
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE 'Migration 0006_add_overlap_protection completed successfully';
  RAISE NOTICE '- btree_gist extension enabled';
  RAISE NOTICE '- booking_holds: Added customer_timezone, idempotency_key fields';
  RAISE NOTICE '- bookings.hold_id: Added FK constraint and unique index';
  RAISE NOTICE '- businesses.timezone: Now NOT NULL';
  RAISE NOTICE '- Exclusion constraints added for bookings and holds (prevents race conditions)';
END $$;
