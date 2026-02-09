-- Migration: Split Brain Prevention
-- Date: 2026-02-07
-- Description: Add embedding metadata columns for provenance tracking and conflict prevention

-- ============================================
-- CHATBOT KNOWLEDGE TABLE
-- ============================================

-- Add embedding provenance columns
ALTER TABLE chatbot_knowledge ADD COLUMN IF NOT EXISTS embedding_provider TEXT;
ALTER TABLE chatbot_knowledge ADD COLUMN IF NOT EXISTS embedding_model TEXT;
ALTER TABLE chatbot_knowledge ADD COLUMN IF NOT EXISTS embedding_dim INTEGER;
ALTER TABLE chatbot_knowledge ADD COLUMN IF NOT EXISTS preprocess_version TEXT;
ALTER TABLE chatbot_knowledge ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE chatbot_knowledge ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMP WITH TIME ZONE;

-- Add authority level for weighting
ALTER TABLE chatbot_knowledge ADD COLUMN IF NOT EXISTS authority_level TEXT DEFAULT 'normal';

-- Add index for embedding compatibility filtering
CREATE INDEX IF NOT EXISTS chatbot_knowledge_preprocess_version_idx
  ON chatbot_knowledge (preprocess_version);

-- ============================================
-- CHUNK EMBEDDINGS TABLE
-- ============================================

-- Add embedding provenance columns
ALTER TABLE chunk_embeddings ADD COLUMN IF NOT EXISTS embedding_provider TEXT;
ALTER TABLE chunk_embeddings ADD COLUMN IF NOT EXISTS embedding_model TEXT;
ALTER TABLE chunk_embeddings ADD COLUMN IF NOT EXISTS embedding_dim INTEGER;
ALTER TABLE chunk_embeddings ADD COLUMN IF NOT EXISTS preprocess_version TEXT;
ALTER TABLE chunk_embeddings ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE chunk_embeddings ADD COLUMN IF NOT EXISTS embedded_at TIMESTAMP WITH TIME ZONE;

-- Add index for embedding compatibility filtering
CREATE INDEX IF NOT EXISTS chunk_embeddings_preprocess_version_idx
  ON chunk_embeddings (preprocess_version);

-- ============================================
-- DOCUMENTS TABLE
-- ============================================

-- Add authority level for weighting
ALTER TABLE documents ADD COLUMN IF NOT EXISTS authority_level TEXT DEFAULT 'normal';

-- ============================================
-- BACKFILL LEGACY EMBEDDINGS
-- ============================================

-- Mark existing KB embeddings as legacy
UPDATE chatbot_knowledge SET
  embedding_provider = 'openrouter',
  embedding_model = 'openai/text-embedding-3-small',
  embedding_dim = 1536,
  preprocess_version = 'legacy',
  embedded_at = created_at
WHERE embedding_provider IS NULL AND embedding IS NOT NULL;

-- Mark existing chunk embeddings as legacy
UPDATE chunk_embeddings SET
  embedding_provider = 'openrouter',
  embedding_model = 'openai/text-embedding-3-small',
  embedding_dim = 1536,
  preprocess_version = 'legacy',
  embedded_at = created_at
WHERE embedding_provider IS NULL;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN chatbot_knowledge.embedding_provider IS 'Embedding API provider (openrouter, openai)';
COMMENT ON COLUMN chatbot_knowledge.embedding_model IS 'Model used for embedding (e.g., openai/text-embedding-3-small)';
COMMENT ON COLUMN chatbot_knowledge.embedding_dim IS 'Embedding vector dimensions (e.g., 1536)';
COMMENT ON COLUMN chatbot_knowledge.preprocess_version IS 'Preprocessing version (p1, p2, legacy). Increment when normalizeText changes.';
COMMENT ON COLUMN chatbot_knowledge.content_hash IS 'SHA-256 hash of normalized content for change detection';
COMMENT ON COLUMN chatbot_knowledge.embedded_at IS 'Timestamp when embedding was generated';
COMMENT ON COLUMN chatbot_knowledge.authority_level IS 'Authority weight: canonical, high, normal, low, unverified';

COMMENT ON COLUMN chunk_embeddings.embedding_provider IS 'Embedding API provider (openrouter, openai)';
COMMENT ON COLUMN chunk_embeddings.embedding_model IS 'Model used for embedding (e.g., openai/text-embedding-3-small)';
COMMENT ON COLUMN chunk_embeddings.embedding_dim IS 'Embedding vector dimensions (e.g., 1536)';
COMMENT ON COLUMN chunk_embeddings.preprocess_version IS 'Preprocessing version (p1, p2, legacy). Increment when normalizeText changes.';
COMMENT ON COLUMN chunk_embeddings.content_hash IS 'SHA-256 hash of normalized content for change detection';
COMMENT ON COLUMN chunk_embeddings.embedded_at IS 'Timestamp when embedding was generated';

COMMENT ON COLUMN documents.authority_level IS 'Authority weight: canonical, high, normal, low, unverified';
