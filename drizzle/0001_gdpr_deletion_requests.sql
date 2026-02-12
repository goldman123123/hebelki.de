-- GDPR Self-Service Deletion Requests
CREATE TABLE IF NOT EXISTS "deletion_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
  "customer_id" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
  "customer_email" text NOT NULL,
  "token" text NOT NULL UNIQUE,
  "status" text NOT NULL DEFAULT 'pending',
  "requested_at" timestamp with time zone DEFAULT now() NOT NULL,
  "confirmed_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "expires_at" timestamp with time zone NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "deletion_requests_token_idx" ON "deletion_requests" ("token");
CREATE INDEX IF NOT EXISTS "deletion_requests_business_idx" ON "deletion_requests" ("business_id");
CREATE INDEX IF NOT EXISTS "deletion_requests_customer_idx" ON "deletion_requests" ("customer_id");
CREATE INDEX IF NOT EXISTS "deletion_requests_status_idx" ON "deletion_requests" ("status");
