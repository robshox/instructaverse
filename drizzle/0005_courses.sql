CREATE TABLE `course_groups` (
	`course_id` text NOT NULL,
	`group_id` text NOT NULL,
	PRIMARY KEY(`course_id`, `group_id`),
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `courses` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`cover_image` text,
	`position` integer DEFAULT 0 NOT NULL,
	`external_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `courses_external_id_unique` ON `courses` (`external_id`);--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`module_id` text NOT NULL,
	`title` text NOT NULL,
	`position` integer NOT NULL,
	`body_md` text DEFAULT '' NOT NULL,
	`transcript` text,
	`mux_asset_id` text,
	`mux_playback_id` text,
	`mux_status` text,
	`external_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lessons_external_id_unique` ON `lessons` (`external_id`);--> statement-breakpoint
CREATE INDEX `lessons_module_idx` ON `lessons` (`module_id`);--> statement-breakpoint
CREATE TABLE `modules` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`title` text NOT NULL,
	`position` integer NOT NULL,
	`external_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `modules_external_id_unique` ON `modules` (`external_id`);--> statement-breakpoint
CREATE INDEX `modules_course_idx` ON `modules` (`course_id`);