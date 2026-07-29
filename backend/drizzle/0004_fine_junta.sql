ALTER TABLE "match_events" DROP CONSTRAINT "match_events_entry_id_championship_entries_id_fk";
--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_entry_id_championship_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."championship_entries"("id") ON DELETE cascade ON UPDATE no action;