CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link" text NOT NULL,
	"read_at" timestamp with time zone,
	"dedup_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_user_dedup_unique" UNIQUE("user_id","dedup_key")
);
--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

-- ============================================================================
-- DOWN (reversão) — aplicável manualmente quando necessário
-- ============================================================================
-- ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_users_id_fk";
-- DROP INDEX IF EXISTS "notifications_user_created_idx";
-- DROP TABLE "notifications";
