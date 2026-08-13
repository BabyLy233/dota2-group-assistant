ALTER TABLE `matches` ADD `analysis_full_status` text DEFAULT 'NONE' NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` ADD `analysis_brief_status` text DEFAULT 'NONE' NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` ADD `analysis_full_started_at` integer;--> statement-breakpoint
ALTER TABLE `matches` ADD `analysis_brief_started_at` integer;--> statement-breakpoint
UPDATE `matches` SET `analysis_full_status` = 'COMPLETED' WHERE `analysis_json` IS NOT NULL;--> statement-breakpoint
UPDATE `matches` SET `analysis_brief_status` = 'COMPLETED' WHERE `analysis_brief_json` IS NOT NULL;--> statement-breakpoint
UPDATE `matches` SET `analysis_full_status` = 'NONE' WHERE `analysis_status` = 'PROCESSING' AND `analysis_full_status` = 'NONE';--> statement-breakpoint
UPDATE `matches` SET `analysis_brief_status` = 'NONE' WHERE `analysis_status` = 'PROCESSING' AND `analysis_brief_status` = 'NONE';
