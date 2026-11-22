CREATE TABLE `purchases` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`plan_id` text NOT NULL,
	`kind` text NOT NULL,
	`stripe_customer_id` text,
	`stripe_subscription_id` text,
	`stripe_payment_intent_id` text,
	`stripe_checkout_session_id` text,
	`status` text NOT NULL,
	`current_period_end` integer,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchases_stripe_subscription_id_unique` ON `purchases` (`stripe_subscription_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `purchases_stripe_payment_intent_id_unique` ON `purchases` (`stripe_payment_intent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `purchases_stripe_checkout_session_id_unique` ON `purchases` (`stripe_checkout_session_id`);--> statement-breakpoint
CREATE INDEX `purchases_user_idx` ON `purchases` (`user_id`);--> statement-breakpoint
CREATE INDEX `purchases_plan_idx` ON `purchases` (`plan_id`);--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`processed_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `user` ADD `stripe_customer_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `user_stripe_customer_id_unique` ON `user` (`stripe_customer_id`);