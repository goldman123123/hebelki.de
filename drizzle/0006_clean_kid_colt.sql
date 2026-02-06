ALTER TABLE "businesses" ALTER COLUMN "timezone" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_holds" ADD COLUMN "customer_timezone" text;--> statement-breakpoint
ALTER TABLE "booking_holds" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "chatbot_conversations" ADD COLUMN "retention_days" integer DEFAULT 90;--> statement-breakpoint
ALTER TABLE "chatbot_conversations" ADD COLUMN "marked_for_deletion_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chatbot_messages" ADD COLUMN "decision_metadata" jsonb;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "whatsapp_opt_in_status" text DEFAULT 'UNSET';--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "whatsapp_opt_in_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "whatsapp_opt_in_source" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "whatsapp_opt_in_evidence" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "whatsapp_opt_out_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "whatsapp_opt_out_reason" text;--> statement-breakpoint
ALTER TABLE "staff_services" ADD COLUMN "sort_order" integer DEFAULT 999 NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_services" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_services" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "staff_services" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_hold_id_booking_holds_id_fk" FOREIGN KEY ("hold_id") REFERENCES "public"."booking_holds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "booking_holds_idempotency_key_idx" ON "booking_holds" USING btree ("business_id","idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_hold_id_idx" ON "bookings" USING btree ("hold_id");--> statement-breakpoint
CREATE INDEX "idx_staff_services_priority" ON "staff_services" USING btree ("service_id","is_active","sort_order");