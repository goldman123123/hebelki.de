ALTER TABLE "businesses" ADD COLUMN "onboarding_state" jsonb DEFAULT '{"completed":false,"step":1}'::jsonb;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "capacity" integer DEFAULT 1;