ALTER TABLE "championship_entries" DROP CONSTRAINT "championship_entry_exactly_one_subject";--> statement-breakpoint
ALTER TABLE "championship_entries" ADD COLUMN "kind" "championship_entry_type";--> statement-breakpoint
UPDATE "championship_entries" SET "kind" = CASE WHEN "team_id" IS NOT NULL THEN 'TEAM'::"championship_entry_type" ELSE 'INDIVIDUAL'::"championship_entry_type" END;--> statement-breakpoint
ALTER TABLE "championship_entries" ALTER COLUMN "kind" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "championship_entries" ADD CONSTRAINT "championship_entries_name_unique" UNIQUE("championship_id","display_name");--> statement-breakpoint
ALTER TABLE "championship_entries" ADD CONSTRAINT "championship_entry_subject_matches_kind" CHECK (("championship_entries"."kind" = 'TEAM' and "championship_entries"."team_id" is not null and "championship_entries"."user_id" is null) or ("championship_entries"."kind" = 'INDIVIDUAL' and "championship_entries"."team_id" is null));
