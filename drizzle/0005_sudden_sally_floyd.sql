CREATE TABLE "booking_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid,
	"action" text NOT NULL,
	"actor_type" text,
	"actor_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "booking_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"staff_id" uuid,
	"customer_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_by" text DEFAULT 'web' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "customer_timezone" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "hold_id" uuid;--> statement-breakpoint
ALTER TABLE "chatbot_knowledge" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "booking_actions" ADD CONSTRAINT "booking_actions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_holds" ADD CONSTRAINT "booking_holds_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_actions_booking_id_idx" ON "booking_actions" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "booking_actions_action_idx" ON "booking_actions" USING btree ("action");--> statement-breakpoint
CREATE INDEX "booking_holds_business_id_idx" ON "booking_holds" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "booking_holds_expires_at_idx" ON "booking_holds" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "booking_holds_starts_at_idx" ON "booking_holds" USING btree ("starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_idempotency_key_idx" ON "bookings" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "chatbot_knowledge_embedding_idx" ON "chatbot_knowledge" USING hnsw ("embedding" vector_cosine_ops);