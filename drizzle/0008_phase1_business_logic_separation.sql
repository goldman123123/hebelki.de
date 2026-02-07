-- Phase 1: Business Logic Separation
-- Adds audience, scope, and data_class fields for access control

-- ============================================
-- chatbot_knowledge table
-- ============================================

-- Add audience column (public = customer-safe, internal = staff/owner only)
ALTER TABLE "chatbot_knowledge" ADD COLUMN IF NOT EXISTS "audience" text DEFAULT 'public' NOT NULL;

-- Add scope_type column (global = everyone, customer = specific customer, staff = specific staff)
ALTER TABLE "chatbot_knowledge" ADD COLUMN IF NOT EXISTS "scope_type" text DEFAULT 'global' NOT NULL;

-- Add scope_id column (required when scope_type != 'global')
ALTER TABLE "chatbot_knowledge" ADD COLUMN IF NOT EXISTS "scope_id" uuid;

-- Add index for efficient access control filtering
CREATE INDEX IF NOT EXISTS "chatbot_knowledge_audience_scope_idx"
  ON "chatbot_knowledge" ("business_id", "audience", "scope_type", "scope_id");

-- ============================================
-- documents table
-- ============================================

-- Add audience column
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "audience" text DEFAULT 'public' NOT NULL;

-- Add scope_type column
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "scope_type" text DEFAULT 'global' NOT NULL;

-- Add scope_id column
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "scope_id" uuid;

-- Add data_class column (knowledge = index for RAG, stored_only = store but don't embed)
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "data_class" text DEFAULT 'knowledge' NOT NULL;

-- Add contains_pii column (auto-set TRUE for CSV/XLSX imports)
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "contains_pii" boolean DEFAULT false;

-- Add index for efficient access control filtering
CREATE INDEX IF NOT EXISTS "documents_audience_scope_idx"
  ON "documents" ("business_id", "audience", "scope_type", "scope_id");

-- ============================================
-- Verification
-- ============================================
-- After running this migration:
-- 1. All existing chatbot_knowledge entries: audience='public', scope_type='global', scope_id=NULL
-- 2. All existing documents: audience='public', scope_type='global', scope_id=NULL, data_class='knowledge', contains_pii=false
-- These safe defaults ensure backward compatibility
