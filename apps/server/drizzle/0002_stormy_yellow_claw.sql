ALTER TABLE `match_players` ADD `imp` integer;--> statement-breakpoint
ALTER TABLE `match_players` ADD `position` text;--> statement-breakpoint
ALTER TABLE `match_players` ADD `level` integer;--> statement-breakpoint
ALTER TABLE `match_players` ADD `gold` integer;--> statement-breakpoint
ALTER TABLE `match_players` ADD `gold_spent` integer;--> statement-breakpoint
ALTER TABLE `match_players` ADD `items_json` text;--> statement-breakpoint
ALTER TABLE `match_players` ADD `abilities_json` text;--> statement-breakpoint
ALTER TABLE `match_players` ADD `kill_events_json` text;--> statement-breakpoint
ALTER TABLE `matches` ADD `timeline_json` text;--> statement-breakpoint
ALTER TABLE `matches` ADD `pick_bans_json` text;--> statement-breakpoint
ALTER TABLE `matches` ADD `lane_report_json` text;--> statement-breakpoint
ALTER TABLE `matches` ADD `facts_json` text;