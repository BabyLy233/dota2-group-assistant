ALTER TABLE `matches` ADD `analysis_status` text DEFAULT 'NONE' NOT NULL;--> statement-breakpoint
ALTER TABLE `matches` ADD `analysis_brief_json` text;