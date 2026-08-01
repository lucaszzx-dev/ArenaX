ALTER TABLE "championships" ADD COLUMN "best_of_sets" integer DEFAULT 5 NOT NULL;
ALTER TABLE "matches" ADD COLUMN "mvp_id" uuid;