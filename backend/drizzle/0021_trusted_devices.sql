CREATE TABLE IF NOT EXISTS "trusted_devices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "revoked_at" timestamp with time zone
);
CREATE INDEX IF NOT EXISTS "trusted_devices_user_idx" ON "trusted_devices" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "trusted_devices_expires_idx" ON "trusted_devices" USING btree ("expires_at");
