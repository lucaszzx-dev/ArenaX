CREATE TABLE "match_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"period_number" integer NOT NULL,
	"home_score" integer NOT NULL,
	"away_score" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "match_periods_match_number_unique" UNIQUE("match_id","period_number"),
	CONSTRAINT "match_period_number_positive" CHECK ("match_periods"."period_number" > 0),
	CONSTRAINT "match_period_scores_non_negative" CHECK ("match_periods"."home_score" >= 0 and "match_periods"."away_score" >= 0)
);
--> statement-breakpoint
ALTER TABLE "match_periods" ADD CONSTRAINT "match_periods_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;