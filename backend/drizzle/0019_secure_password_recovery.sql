CREATE TABLE IF NOT EXISTS "password_reset_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "code_hash" text NOT NULL,
  "verification_token_hash" text,
  "expires_at" timestamp with time zone NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "verified_at" timestamp with time zone,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "password_reset_requests_user_unique" UNIQUE("user_id")
);
CREATE INDEX IF NOT EXISTS "password_reset_requests_expires_idx" ON "password_reset_requests" ("expires_at");
