CREATE TABLE "knockout_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"championship_id" uuid NOT NULL,
	"round_number" integer NOT NULL,
	"position" integer NOT NULL,
	"home_entry_id" uuid,
	"away_entry_id" uuid,
	"match_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knockout_nodes_round_position_unique" UNIQUE("championship_id","round_number","position"),
	CONSTRAINT "knockout_nodes_match_unique" UNIQUE("match_id"),
	CONSTRAINT "knockout_node_round_positive" CHECK ("knockout_nodes"."round_number" > 0),
	CONSTRAINT "knockout_node_position_positive" CHECK ("knockout_nodes"."position" > 0)
);
--> statement-breakpoint
ALTER TABLE "knockout_nodes" ADD CONSTRAINT "knockout_nodes_championship_id_championships_id_fk" FOREIGN KEY ("championship_id") REFERENCES "public"."championships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knockout_nodes" ADD CONSTRAINT "knockout_nodes_home_entry_id_championship_entries_id_fk" FOREIGN KEY ("home_entry_id") REFERENCES "public"."championship_entries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knockout_nodes" ADD CONSTRAINT "knockout_nodes_away_entry_id_championship_entries_id_fk" FOREIGN KEY ("away_entry_id") REFERENCES "public"."championship_entries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knockout_nodes" ADD CONSTRAINT "knockout_nodes_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;