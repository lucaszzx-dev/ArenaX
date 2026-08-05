CREATE TABLE IF NOT EXISTS "login_verification_challenges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "challenge_token_hash" text NOT NULL UNIQUE,
  "code_hash" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "resend_count" integer DEFAULT 0 NOT NULL,
  "last_sent_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "login_verification_challenges_user_idx" ON "login_verification_challenges" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "login_verification_challenges_expires_idx" ON "login_verification_challenges" USING btree ("expires_at");
