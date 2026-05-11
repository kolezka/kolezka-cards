CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`slug` text NOT NULL,
	`type` text NOT NULL,
	`config_json` text NOT NULL,
	`theme` text DEFAULT 'github_dark' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cards_user_slug_uq` ON `cards` (`user_id`,`slug`);--> statement-breakpoint
CREATE TABLE `impression_buckets` (
	`card_id` text NOT NULL,
	`hour_bucket` integer NOT NULL,
	`total_impressions` integer DEFAULT 0 NOT NULL,
	`unique_visits` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `impression_buckets_pk` ON `impression_buckets` (`card_id`,`hour_bucket`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`github_id` integer NOT NULL,
	`login` text NOT NULL,
	`avatar_url` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_github_id_unique` ON `users` (`github_id`);--> statement-breakpoint
CREATE TABLE `visits` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`fingerprint_hash` text NOT NULL,
	`country` text,
	`referrer_host` text,
	`user_agent_family` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `visits_card_fp_created_idx` ON `visits` (`card_id`,`fingerprint_hash`,`created_at`);