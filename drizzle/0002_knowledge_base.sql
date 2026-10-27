CREATE TABLE "chunks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"doc_id" text NOT NULL,
	"ord" integer NOT NULL,
	"heading_path" text NOT NULL,
	"text" text NOT NULL,
	"tokens" integer NOT NULL,
	"period_from" integer,
	"period_to" integer,
	"content_hash" text NOT NULL,
	"embedding" vector(1024),
	"embedding_model" text,
	"tsv" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', heading_path || ' ' || text)) STORED,
	CONSTRAINT "chunks_doc_ord" UNIQUE("doc_id","ord")
);
--> statement-breakpoint
CREATE TABLE "source_docs" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"license" text NOT NULL,
	"attribution" text NOT NULL,
	"revision" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_doc_id_source_docs_id_fk" FOREIGN KEY ("doc_id") REFERENCES "public"."source_docs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chunks_embedding_idx" ON "chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "chunks_tsv_idx" ON "chunks" USING gin ("tsv");--> statement-breakpoint
CREATE INDEX "chunks_period_idx" ON "chunks" USING btree ("period_from","period_to");