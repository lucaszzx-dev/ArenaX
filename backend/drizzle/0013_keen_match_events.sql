ALTER TABLE "championships" ADD COLUMN IF NOT EXISTS "max_yellow_cards" integer DEFAULT 0 NOT NULL;
ALTER TABLE "match_events" ADD COLUMN IF NOT EXISTS "related_event_id" uuid;
