CREATE TABLE `plan_groups` (
	`plan_id` text NOT NULL,
	`group_id` text NOT NULL,
	PRIMARY KEY(`plan_id`, `group_id`),
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `plan_prices` (
	`stripe_price_id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `plan_prices_plan_idx` ON `plan_prices` (`plan_id`);--> statement-breakpoint
CREATE TABLE `plans` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`type` text NOT NULL,
	`listed` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
