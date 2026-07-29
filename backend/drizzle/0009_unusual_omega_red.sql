CREATE TYPE "public"."tournament_format" AS ENUM('LEAGUE', 'KNOCKOUT');--> statement-breakpoint
ALTER TABLE "championships" ADD COLUMN "format" "tournament_format" DEFAULT 'LEAGUE' NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "round_number" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "generated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "match_round_number_positive" CHECK ("matches"."round_number" is null or "matches"."round_number" > 0);