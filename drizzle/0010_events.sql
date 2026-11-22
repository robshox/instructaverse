CREATE TABLE `event_groups` (
	`event_id` text NOT NULL,
	`group_id` text NOT NULL,
	PRIMARY KEY(`event_id`, `group_id`),
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer,
	`timezone` text NOT NULL,
	`zoom_url` text NOT NULL,
	`external_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_external_id_unique` ON `events` (`external_id`);--> statement-breakpoint
CREATE INDEX `events_starts_idx` ON `events` (`starts_at`);