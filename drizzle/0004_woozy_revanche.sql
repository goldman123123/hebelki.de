CREATE TABLE "scraped_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"scrape_job_id" text NOT NULL,
	"scraped_at" timestamp with time zone DEFAULT now() NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"markdown" text NOT NULL,
	"word_count" integer,
	"content_hash" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scraped_pages" ADD CONSTRAINT "scraped_pages_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scraped_pages_business_idx" ON "scraped_pages" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "scraped_pages_scrape_job_idx" ON "scraped_pages" USING btree ("scrape_job_id");--> statement-breakpoint
CREATE INDEX "scraped_pages_url_idx" ON "scraped_pages" USING btree ("url");