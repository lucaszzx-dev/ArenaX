CREATE TABLE "club_seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_seasons_club_name_unique" UNIQUE("club_id","name"),
	CONSTRAINT "club_season_dates_order" CHECK ("ends_at" IS NULL OR "starts_at" IS NULL OR "ends_at" >= "starts_at")
);
--> statement-breakpoint
CREATE TABLE "club_squads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"sport" text,
	"season_id" uuid,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_squads_club_name_unique" UNIQUE("club_id","name")
);
--> statement-breakpoint
CREATE TABLE "club_squad_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"squad_id" uuid NOT NULL,
	"club_member_id" uuid NOT NULL,
	"role" text DEFAULT 'PLAYER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_squad_members_squad_member_unique" UNIQUE("squad_id","club_member_id")
);
--> statement-breakpoint
CREATE TABLE "club_staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_staff_club_name_unique" UNIQUE("club_id","display_name")
);
--> statement-breakpoint
CREATE TABLE "club_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"details" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "primary_color" text;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "secondary_color" text;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "home_kit" text;--> statement-breakpoint
ALTER TABLE "clubs" ADD COLUMN "away_kit" text;--> statement-breakpoint
ALTER TABLE "club_seasons" ADD CONSTRAINT "club_seasons_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_squads" ADD CONSTRAINT "club_squads_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_squads" ADD CONSTRAINT "club_squads_season_id_club_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."club_seasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_squad_members" ADD CONSTRAINT "club_squad_members_squad_id_club_squads_id_fk" FOREIGN KEY ("squad_id") REFERENCES "public"."club_squads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_squad_members" ADD CONSTRAINT "club_squad_members_club_member_id_club_members_id_fk" FOREIGN KEY ("club_member_id") REFERENCES "public"."club_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_staff" ADD CONSTRAINT "club_staff_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_audit_logs" ADD CONSTRAINT "club_audit_logs_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_audit_logs" ADD CONSTRAINT "club_audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;

-- ============================================================================
-- DOWN (reversão) — aplicável manualmente quando necessário
-- ============================================================================
-- ALTER TABLE "club_audit_logs" DROP CONSTRAINT "club_audit_logs_actor_id_users_id_fk";
-- ALTER TABLE "club_audit_logs" DROP CONSTRAINT "club_audit_logs_club_id_clubs_id_fk";
-- ALTER TABLE "club_staff" DROP CONSTRAINT "club_staff_club_id_clubs_id_fk";
-- ALTER TABLE "club_squad_members" DROP CONSTRAINT "club_squad_members_club_member_id_club_members_id_fk";
-- ALTER TABLE "club_squad_members" DROP CONSTRAINT "club_squad_members_squad_id_club_squads_id_fk";
-- ALTER TABLE "club_squads" DROP CONSTRAINT "club_squads_season_id_club_seasons_id_fk";
-- ALTER TABLE "club_squads" DROP CONSTRAINT "club_squads_club_id_clubs_id_fk";
-- ALTER TABLE "club_seasons" DROP CONSTRAINT "club_seasons_club_id_clubs_id_fk";
-- ALTER TABLE "clubs" DROP COLUMN "away_kit";
-- ALTER TABLE "clubs" DROP COLUMN "home_kit";
-- ALTER TABLE "clubs" DROP COLUMN "secondary_color";
-- ALTER TABLE "clubs" DROP COLUMN "primary_color";
-- DROP TABLE "club_audit_logs";
-- DROP TABLE "club_staff";
-- DROP TABLE "club_squad_members";
-- DROP TABLE "club_squads";
-- DROP TABLE "club_seasons";
