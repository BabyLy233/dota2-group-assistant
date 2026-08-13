ALTER TABLE `matches` ADD `analysis_json` text;--> statement-breakpoint
ALTER TABLE `players` ADD `favorite` integer DEFAULT false NOT NULL;