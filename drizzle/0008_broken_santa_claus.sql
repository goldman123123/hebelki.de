ALTER TABLE "ingestion_jobs" ALTER COLUMN "document_version_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chatbot_knowledge" ADD COLUMN "source_document_id" uuid;--> statement-breakpoint
ALTER TABLE "ingestion_jobs" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "ingestion_jobs" ADD COLUMN "discovered_urls" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "ingestion_jobs" ADD COLUMN "scrape_config" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "ingestion_jobs" ADD COLUMN "extract_services" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "chatbot_knowledge" ADD CONSTRAINT "chatbot_knowledge_source_document_id_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chatbot_knowledge_source_document_idx" ON "chatbot_knowledge" USING btree ("source_document_id");--> statement-breakpoint
CREATE INDEX "ingestion_jobs_source_url_idx" ON "ingestion_jobs" USING btree ("source_url");