CREATE TABLE IF NOT EXISTS "cards" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"type" text NOT NULL,
	"config_json" jsonb NOT NULL,
	"theme" text DEFAULT 'github_dark' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "impression_buckets" (
	"card_id" text NOT NULL,
	"hour_bucket" integer NOT NULL,
	"total_impressions" integer DEFAULT 0 NOT NULL,
	"unique_visits" integer DEFAULT 0 NOT NULL,
	"direct_impressions" integer DEFAULT 0 NOT NULL,
	"camo_impressions" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oauth_state" (
	"state" text PRIMARY KEY NOT NULL,
	"code_verifier" text,
	"redirect_to" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"github_id" bigint NOT NULL,
	"login" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_github_id_unique" UNIQUE("github_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users_followers_history" (
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	"followers" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "visits" (
	"id" text PRIMARY KEY NOT NULL,
	"card_id" text NOT NULL,
	"fingerprint_hash" text NOT NULL,
	"country" text,
	"referrer_host" text,
	"user_agent_family" text,
	"via_camo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cards" ADD CONSTRAINT "cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "impression_buckets" ADD CONSTRAINT "impression_buckets_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users_followers_history" ADD CONSTRAINT "users_followers_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visits" ADD CONSTRAINT "visits_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "cards_user_slug_uq" ON "cards" USING btree ("user_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "impression_buckets_pk" ON "impression_buckets" USING btree ("card_id","hour_bucket");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oauth_state_expires_idx" ON "oauth_state" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_followers_history_pk" ON "users_followers_history" USING btree ("user_id","day");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "visits_card_fp_created_idx" ON "visits" USING btree ("card_id","fingerprint_hash","created_at");