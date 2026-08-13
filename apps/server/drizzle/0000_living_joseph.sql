CREATE TABLE `match_players` (
	`match_id` integer NOT NULL,
	`steam_account_id` integer NOT NULL,
	`player_slot` integer,
	`hero_id` integer,
	`kills` integer,
	`deaths` integer,
	`assists` integer,
	`last_hits` integer,
	`denies` integer,
	`gpm` integer,
	`xpm` integer,
	`net_worth` integer,
	`hero_damage` integer,
	`tower_damage` integer,
	`healing` integer,
	PRIMARY KEY(`match_id`, `steam_account_id`),
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`match_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `match_players_steam_idx` ON `match_players` (`steam_account_id`);--> statement-breakpoint
CREATE TABLE `matches` (
	`match_id` integer PRIMARY KEY NOT NULL,
	`start_time` integer,
	`duration` integer,
	`game_mode` integer,
	`lobby_type` integer,
	`winning_team` integer,
	`radiant_score` integer,
	`dire_score` integer,
	`parsed` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`last_fetch_at` integer,
	`fetch_attempts` integer DEFAULT 0 NOT NULL,
	`error_message` text,
	`raw_data` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `players` (
	`steam_account_id` integer PRIMARY KEY NOT NULL,
	`steam_id` text NOT NULL,
	`name` text NOT NULL,
	`avatar` text,
	`profile_url` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `players_steam_id_unique` ON `players` (`steam_id`);