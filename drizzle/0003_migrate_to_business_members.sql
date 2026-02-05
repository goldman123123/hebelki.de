-- Migration: Populate business_members from existing businesses with clerkUserId
-- This fixes the multi-tenant architecture to use proper many-to-many relationships

-- Step 1: Migrate existing business owners to business_members table
-- Only migrate if clerkUserId is not NULL
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

-- Step 2: (Optional) Remove clerkUserId column from businesses table
-- Uncomment the line below AFTER verifying migration worked:
-- ALTER TABLE businesses DROP COLUMN IF EXISTS clerk_user_id;

-- Verification queries (run these to check):
-- 1. Count businesses with clerkUserId:
--    SELECT COUNT(*) FROM businesses WHERE clerk_user_id IS NOT NULL;
--
-- 2. Count business_members with role='owner':
--    SELECT COUNT(*) FROM business_members WHERE role = 'owner';
--
-- 3. Check for any businesses without owner:
--    SELECT b.id, b.name, b.slug
--    FROM businesses b
--    LEFT JOIN business_members bm ON b.id = bm.business_id AND bm.role = 'owner'
--    WHERE bm.id IS NULL;
