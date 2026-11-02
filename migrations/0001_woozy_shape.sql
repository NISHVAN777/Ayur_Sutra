CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`action` text NOT NULL,
	`performed_by_user_id` text NOT NULL,
	`original_value` text,
	`new_value` text,
	`reason` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`performed_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_action_idx` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `audit_performed_by_idx` ON `audit_logs` (`performed_by_user_id`);--> statement-breakpoint
ALTER TABLE `therapists` ADD `avatar_url` text;--> statement-breakpoint
ALTER TABLE `therapists` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `therapy_sessions` ADD `reschedule_reason` text;--> statement-breakpoint
ALTER TABLE `therapy_sessions` ADD `cancel_reason` text;