-- Add custom domain support to businesses table
-- Stores the verified custom domain for booking pages (Pro+ feature)
ALTER TABLE "businesses" ADD COLUMN "custom_domain" text;
