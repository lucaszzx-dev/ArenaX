ALTER TABLE "team_members" ADD COLUMN "is_captain" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "logo_url" text;