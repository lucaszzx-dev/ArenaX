ALTER TYPE "public"."tournament_format" ADD VALUE IF NOT EXISTS 'GROUP_KNOCKOUT';
ALTER TABLE "championships" ADD COLUMN IF NOT EXISTS "group_count" integer;
ALTER TABLE "championships" ADD COLUMN IF NOT EXISTS "group_legs" integer;
ALTER TABLE "championships" ADD COLUMN IF NOT EXISTS "qualifiers_per_group" integer;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "phase" text DEFAULT 'MAIN' NOT NULL;
ALTER TABLE "matches" ADD COLUMN IF NOT EXISTS "group_number" integer;
CREATE TABLE IF NOT EXISTS "group_stage_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "championship_id" uuid NOT NULL REFERENCES "championships"("id") ON DELETE cascade,
  "entry_id" uuid NOT NULL REFERENCES "championship_entries"("id") ON DELETE cascade,
  "group_number" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "group_stage_entries_championship_entry_unique" UNIQUE("championship_id", "entry_id"),
  CONSTRAINT "group_stage_entries_championship_group_entry_unique" UNIQUE("championship_id", "group_number", "entry_id"),
  CONSTRAINT "group_stage_entries_group_positive" CHECK ("group_number" > 0)
);
