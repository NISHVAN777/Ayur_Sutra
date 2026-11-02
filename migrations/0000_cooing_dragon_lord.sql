CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chat_user_id_idx` ON `chat_messages` (`user_id`);--> statement-breakpoint
CREATE INDEX `chat_created_at_idx` ON `chat_messages` (`created_at`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`session_id` text,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`type` text DEFAULT 'REMINDER' NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`scheduled_for` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `therapy_sessions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `notifications_user_id_idx` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `notifications_is_read_idx` ON `notifications` (`is_read`);--> statement-breakpoint
CREATE TABLE `patients` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`phone` text NOT NULL,
	`date_of_birth` text NOT NULL,
	`gender` text NOT NULL,
	`address` text,
	`emergency_contact` text,
	`medical_notes` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `patients_user_id_idx` ON `patients` (`user_id`);--> statement-breakpoint
CREATE TABLE `therapists` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`specialization` text NOT NULL,
	`phone` text NOT NULL,
	`experience` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `therapists_user_id_idx` ON `therapists` (`user_id`);--> statement-breakpoint
CREATE TABLE `therapy_courses` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`therapy_name` text NOT NULL,
	`description` text,
	`duration_days` integer NOT NULL,
	`start_date` text NOT NULL,
	`default_session_time` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `courses_patient_id_idx` ON `therapy_courses` (`patient_id`);--> statement-breakpoint
CREATE INDEX `courses_status_idx` ON `therapy_courses` (`status`);--> statement-breakpoint
CREATE TABLE `therapy_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`course_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`therapist_id` text NOT NULL,
	`room_id` text NOT NULL,
	`day_number` integer NOT NULL,
	`session_date` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text NOT NULL,
	`status` text DEFAULT 'SCHEDULED' NOT NULL,
	`treatment_notes` text,
	`completed_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`course_id`) REFERENCES `therapy_courses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`therapist_id`) REFERENCES `therapists`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`room_id`) REFERENCES `treatment_rooms`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `sessions_course_id_idx` ON `therapy_sessions` (`course_id`);--> statement-breakpoint
CREATE INDEX `sessions_patient_id_idx` ON `therapy_sessions` (`patient_id`);--> statement-breakpoint
CREATE INDEX `sessions_therapist_id_idx` ON `therapy_sessions` (`therapist_id`);--> statement-breakpoint
CREATE INDEX `sessions_room_id_idx` ON `therapy_sessions` (`room_id`);--> statement-breakpoint
CREATE INDEX `sessions_date_time_idx` ON `therapy_sessions` (`session_date`,`start_time`,`end_time`);--> statement-breakpoint
CREATE INDEX `sessions_status_idx` ON `therapy_sessions` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_course_day_idx` ON `therapy_sessions` (`course_id`,`day_number`);--> statement-breakpoint
CREATE TABLE `treatment_rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`room_name` text NOT NULL,
	`room_number` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `treatment_rooms_room_number_unique` ON `treatment_rooms` (`room_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `rooms_room_number_idx` ON `treatment_rooms` (`room_number`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`role` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);