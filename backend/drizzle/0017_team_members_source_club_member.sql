ALTER TABLE "team_members" ADD COLUMN "source_club_member_id" uuid;
--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_source_club_member_id_club_members_id_fk" FOREIGN KEY ("source_club_member_id") REFERENCES "public"."club_members"("id") ON DELETE set null ON UPDATE no action;

-- ============================================================================
-- DOWN (rollback) is applicable manually when needed
-- ============================================================================
-- ALTER TABLE "team_members" DROP CONSTRAINT "team_members_source_club_member_id_club_members_id_fk";
-- ALTER TABLE "team_members" DROP COLUMN IF EXISTS "source_club_member_id";
