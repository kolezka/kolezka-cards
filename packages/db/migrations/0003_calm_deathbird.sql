ALTER TABLE `impression_buckets` ADD `direct_impressions` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `impression_buckets` ADD `camo_impressions` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `visits` ADD `via_camo` integer DEFAULT false NOT NULL;