-- ============================================
-- Add Staff Priority to staff_services
-- ============================================
-- This migration adds priority ordering functionality to the staff_services junction table.
-- Allows business owners to set staff priority per service for automatic assignment.

-- Add columns to staff_services
ALTER TABLE staff_services
  ADD COLUMN sort_order INTEGER DEFAULT 999,
  ADD COLUMN is_active BOOLEAN DEFAULT true,
  ADD COLUMN created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

-- Create index for performance (CRITICAL - ensures fast priority-based queries)
-- Index order: service_id, is_active, sort_order
-- This allows efficient lookups like: "Get active staff for service X, ordered by priority"
CREATE INDEX idx_staff_services_priority
  ON staff_services(service_id, is_active, sort_order);

-- Set initial sort order based on staff creation date
-- This ensures existing assignments get sequential priorities
WITH ranked AS (
  SELECT
    ss.staff_id,
    ss.service_id,
    ROW_NUMBER() OVER (PARTITION BY ss.service_id ORDER BY s.created_at) as rn
  FROM staff_services ss
  JOIN staff s ON s.id = ss.staff_id
)
UPDATE staff_services ss
SET sort_order = r.rn
FROM ranked r
WHERE ss.staff_id = r.staff_id
  AND ss.service_id = r.service_id;

-- Verification query (uncomment to check):
-- SELECT
--   s.name as service_name,
--   st.name as staff_name,
--   ss.sort_order,
--   ss.is_active
-- FROM staff_services ss
-- JOIN services s ON s.id = ss.service_id
-- JOIN staff st ON st.id = ss.staff_id
-- ORDER BY s.name, ss.sort_order;
