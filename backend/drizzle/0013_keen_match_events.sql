ALTER TABLE "championships" ADD COLUMN "max_yellow_cards" integer DEFAULT 0 NOT NULL;
ALTER TABLE "match_events" ADD COLUMN "related_event_id" uuid;