CREATE TABLE `procedure_room_compatibility` (
	`id` text PRIMARY KEY NOT NULL,
	`procedure_name` text NOT NULL,
	`room_id` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`room_id`) REFERENCES `treatment_rooms`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `proc_room_idx` ON `procedure_room_compatibility` (`procedure_name`,`room_id`);--> statement-breakpoint
CREATE TABLE `reminder_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`dedupe_key` text NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text,
	`reminder_type` text NOT NULL,
	`scheduled_occurrence` text NOT NULL,
	`sent_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reminder_logs_dedupe_key_unique` ON `reminder_logs` (`dedupe_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `reminder_dedupe_idx` ON `reminder_logs` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `reminder_user_idx` ON `reminder_logs` (`user_id`);--> statement-breakpoint
CREATE TABLE `session_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`course_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`therapist_id` text,
	`requested_by_user_id` text NOT NULL,
	`requested_by_role` text NOT NULL,
	`request_type` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`reason` text NOT NULL,
	`preferred_date` text,
	`preferred_time` text,
	`admin_notes` text,
	`resolved_by_user_id` text,
	`resolved_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `therapy_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`course_id`) REFERENCES `therapy_courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`therapist_id`) REFERENCES `therapists`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`requested_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resolved_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `requests_session_id_idx` ON `session_requests` (`session_id`);--> statement-breakpoint
CREATE INDEX `requests_patient_id_idx` ON `session_requests` (`patient_id`);--> statement-breakpoint
CREATE INDEX `requests_status_idx` ON `session_requests` (`status`);--> statement-breakpoint
CREATE INDEX `requests_type_idx` ON `session_requests` (`request_type`);--> statement-breakpoint
CREATE TABLE `therapist_availability` (
	`id` text PRIMARY KEY NOT NULL,
	`therapist_id` text NOT NULL,
	`working_days` text NOT NULL,
	`working_hours_start` text NOT NULL,
	`working_hours_end` text NOT NULL,
	`weekly_off` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`therapist_id`) REFERENCES `therapists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `availability_therapist_idx` ON `therapist_availability` (`therapist_id`);--> statement-breakpoint
CREATE TABLE `therapist_leaves` (
	`id` text PRIMARY KEY NOT NULL,
	`therapist_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`reason` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`therapist_id`) REFERENCES `therapists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `leaves_therapist_idx` ON `therapist_leaves` (`therapist_id`);--> statement-breakpoint
CREATE INDEX `leaves_dates_idx` ON `therapist_leaves` (`start_date`,`end_date`);--> statement-breakpoint
ALTER TABLE `therapy_courses` ADD `paused_at` text;--> statement-breakpoint
ALTER TABLE `therapy_sessions` ADD `phase` text;--> statement-breakpoint
ALTER TABLE `therapy_sessions` ADD `procedure` text;--> statement-breakpoint
ALTER TABLE `therapy_sessions` ADD `blood_pressure` text;--> statement-breakpoint
ALTER TABLE `therapy_sessions` ADD `pulse_rate` integer;--> statement-breakpoint
ALTER TABLE `therapy_sessions` ADD `temperature` real;--> statement-breakpoint
ALTER TABLE `therapy_sessions` ADD `weight` real;--> statement-breakpoint
ALTER TABLE `therapy_sessions` ADD `symptom_score` integer;--> statement-breakpoint
ALTER TABLE `therapy_sessions` ADD `pathya` text;--> statement-breakpoint
ALTER TABLE `therapy_sessions` ADD `apathya` text;--> statement-breakpoint
ALTER TABLE `therapy_sessions` ADD `lifestyle_instructions` text;--> statement-breakpoint
ALTER TABLE `therapy_sessions` ADD `replacement_for_session_id` text;