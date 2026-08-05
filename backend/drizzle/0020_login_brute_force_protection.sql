CREATE TABLE IF NOT EXISTS "login_security" (
  "email" text PRIMARY KEY NOT NULL,
  "failure_count" integer DEFAULT 0 NOT NULL,
  "window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "lock_until" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
