CREATE TABLE `users_followers_history` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`followers` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_followers_history_pk` ON `users_followers_history` (`user_id`,`day`);