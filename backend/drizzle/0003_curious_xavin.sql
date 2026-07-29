CREATE TABLE "match_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"team_member_id" uuid,
	"actor_name" text,
	"type" text NOT NULL,
	"value" integer DEFAULT 1 NOT NULL,
	"period_number" integer,
	"clock_seconds" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_event_value_positive" CHECK ("match_events"."value" > 0),
	CONSTRAINT "match_event_period_positive" CHECK ("match_events"."period_number" is null or "match_events"."period_number" > 0),
	CONSTRAINT "match_event_clock_non_negative" CHECK ("match_events"."clock_seconds" is null or "match_events"."clock_seconds" >= 0)
);
--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "jersey_number" integer;--> statement-breakpoint
ALTER TABLE "team_members" ADD COLUMN "position" text;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_entry_id_championship_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."championship_entries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_team_member_id_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_members"("id") ON DELETE set null ON UPDATE no action;