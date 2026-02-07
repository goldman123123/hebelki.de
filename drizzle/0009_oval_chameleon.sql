ALTER TABLE "chatbot_conversations" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "chatbot_conversations" ADD COLUMN "summary_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chatbot_conversations" ADD COLUMN "messages_since_summary" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "chatbot_conversations" ADD COLUMN "current_intent" jsonb DEFAULT '{"state":"idle","lastUpdated":"2026-02-06T21:44:13.937Z"}'::jsonb;