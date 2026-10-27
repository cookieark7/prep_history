ALTER TABLE "turns" ADD COLUMN "sources" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "turns" ADD COLUMN "citations" jsonb;