CREATE TABLE "bug" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cause" text NOT NULL,
	"history" json,
	"config" json,
	"status" "status" DEFAULT 'open',
	"solution" text,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "medical_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"embeddings" vector(1024) NOT NULL,
	"content" text NOT NULL,
	"origin" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "medical-file" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"file" text NOT NULL,
	"mimetype" text DEFAULT 'application/pdf',
	"size" numeric NOT NULL,
	"create_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "medical_data" ADD CONSTRAINT "medical_data_file_id_medical-file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."medical-file"("id") ON DELETE no action ON UPDATE no action;