CREATE TABLE `player_bindings` (
	`platform` text NOT NULL,
	`user_id` text NOT NULL,
	`steam_account_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`platform`, `user_id`),
	FOREIGN KEY (`steam_account_id`) REFERENCES `players`(`steam_account_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `player_bindings_steam_unique` ON `player_bindings` (`steam_account_id`);--> statement-breakpoint
CREATE INDEX `player_bindings_user_idx` ON `player_bindings` (`user_id`);