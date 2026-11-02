import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// 1. Users Table
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["ADMIN", "THERAPIST", "PATIENT"] }).notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull()
}, (table) => [
  uniqueIndex("users_email_idx").on(table.email)
]);

// 2. Patients Table
export const patients = sqliteTable("patients", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  phone: text("phone").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  gender: text("gender").notNull(),
  address: text("address"),
  emergencyContact: text("emergency_contact"),
  medicalNotes: text("medical_notes"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull()
}, (table) => [
  index("patients_user_id_idx").on(table.userId)
]);

// 3. Therapists Table
export const therapists = sqliteTable("therapists", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  specialization: text("specialization").notNull(),
  phone: text("phone").notNull(),
  experience: text("experience").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull()
}, (table) => [
  index("therapists_user_id_idx").on(table.userId)
]);

// 4. Treatment Rooms Table (All Room Names must end with 'Suite')
export const treatmentRooms = sqliteTable("treatment_rooms", {
  id: text("id").primaryKey(),
  roomName: text("room_name").notNull(),
  roomNumber: text("room_number").notNull().unique(),
  description: text("description"),
  status: text("status", { enum: ["ACTIVE", "INACTIVE"] }).default("ACTIVE").notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull()
}, (table) => [
  uniqueIndex("rooms_room_number_idx").on(table.roomNumber)
]);

// 5. Therapy Courses Table
export const therapyCourses = sqliteTable("therapy_courses", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  therapyName: text("therapy_name").notNull(),
  description: text("description"),
  durationDays: integer("duration_days").notNull(), // 5, 7, 14, 21
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  defaultSessionTime: text("default_session_time").notNull(), // HH:MM
  status: text("status", { enum: ["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"] }).default("ACTIVE").notNull(),
  pausedAt: text("paused_at"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull()
}, (table) => [
  index("courses_patient_id_idx").on(table.patientId),
  index("courses_status_idx").on(table.status)
]);

// 6. Therapy Sessions Table
export const therapySessions = sqliteTable("therapy_sessions", {
  id: text("id").primaryKey(),
  courseId: text("course_id").notNull().references(() => therapyCourses.id, { onDelete: "cascade" }),
  patientId: text("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  therapistId: text("therapist_id").notNull().references(() => therapists.id, { onDelete: "restrict" }),
  roomId: text("room_id").notNull().references(() => treatmentRooms.id, { onDelete: "restrict" }),
  dayNumber: integer("day_number").notNull(), // Day 1..N
  sessionDate: text("session_date").notNull(), // YYYY-MM-DD
  startTime: text("start_time").notNull(), // HH:MM
  endTime: text("end_time").notNull(), // HH:MM
  status: text("status", { enum: ["SCHEDULED", "COMPLETED", "MISSED", "CANCELLED"] }).default("SCHEDULED").notNull(),
  phase: text("phase", { enum: ["PURVAKARMA", "PRADHANA_KARMA", "PASCHAT_KARMA"] }),
  procedure: text("procedure"),
  bloodPressure: text("blood_pressure"),
  pulseRate: integer("pulse_rate"),
  temperature: real("temperature"),
  weight: real("weight"),
  symptomScore: integer("symptom_score"),
  pathya: text("pathya"),
  apathya: text("apathya"),
  lifestyleInstructions: text("lifestyle_instructions"),
  treatmentNotes: text("treatment_notes"),
  rescheduleReason: text("reschedule_reason"),
  cancelReason: text("cancel_reason"),
  replacementForSessionId: text("replacement_for_session_id"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull()
}, (table) => [
  index("sessions_course_id_idx").on(table.courseId),
  index("sessions_patient_id_idx").on(table.patientId),
  index("sessions_therapist_id_idx").on(table.therapistId),
  index("sessions_room_id_idx").on(table.roomId),
  index("sessions_date_time_idx").on(table.sessionDate, table.startTime, table.endTime),
  index("sessions_status_idx").on(table.status),
  uniqueIndex("sessions_course_day_idx").on(table.courseId, table.dayNumber)
]);

// 7. Notifications Table
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: text("session_id").references(() => therapySessions.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type", { enum: ["REMINDER", "STATUS", "ALERT", "SYSTEM"] }).default("REMINDER").notNull(),
  isRead: integer("is_read", { mode: "boolean" }).default(false).notNull(),
  scheduledFor: text("scheduled_for"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull()
}, (table) => [
  index("notifications_user_id_idx").on(table.userId),
  index("notifications_is_read_idx").on(table.isRead)
]);

// 8. Chat Messages Table
export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["USER", "ASSISTANT"] }).notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull()
}, (table) => [
  index("chat_user_id_idx").on(table.userId),
  index("chat_created_at_idx").on(table.createdAt)
]);

// 9. Session Requests Table (Patient/Practitioner reschedule, cancel, and replacement requests)
export const sessionRequests = sqliteTable("session_requests", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => therapySessions.id, { onDelete: "cascade" }),
  courseId: text("course_id").notNull().references(() => therapyCourses.id, { onDelete: "cascade" }),
  patientId: text("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  therapistId: text("therapist_id").references(() => therapists.id, { onDelete: "set null" }),
  requestedByUserId: text("requested_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requestedByRole: text("requested_by_role", { enum: ["PATIENT", "THERAPIST"] }).notNull(),
  requestType: text("request_type", { enum: ["RESCHEDULE", "CANCEL", "REPLACEMENT"] }).notNull(),
  status: text("status", { enum: ["PENDING", "APPROVED", "REJECTED", "COMPLETED"] }).default("PENDING").notNull(),
  reason: text("reason").notNull(),
  preferredDate: text("preferred_date"),
  preferredTime: text("preferred_time"),
  adminNotes: text("admin_notes"),
  resolvedByUserId: text("resolved_by_user_id").references(() => users.id, { onDelete: "set null" }),
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull()
}, (table) => [
  index("requests_session_id_idx").on(table.sessionId),
  index("requests_patient_id_idx").on(table.patientId),
  index("requests_status_idx").on(table.status),
  index("requests_type_idx").on(table.requestType)
]);

// 10. Audit Logs Table
export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  entityType: text("entity_type", { enum: ["SESSION", "COURSE"] }).notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action", {
    enum: [
      "SESSION_CREATED",
      "SESSION_RESCHEDULED",
      "SESSION_RESCHEDULE_REQUESTED",
      "SESSION_CANCELLED",
      "SESSION_CANCEL_REQUESTED",
      "SESSION_REPLACEMENT_REQUESTED",
      "SESSION_REPLACEMENT_CREATED",
      "REQUEST_APPROVED",
      "REQUEST_REJECTED",
      "THERAPIST_CHANGED",
      "ROOM_CHANGED",
      "COURSE_PAUSED",
      "COURSE_RESUMED",
      "COURSE_COMPLETED"
    ]
  }).notNull(),
  performedByUserId: text("performed_by_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  originalValue: text("original_value"),
  newValue: text("new_value"),
  reason: text("reason"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull()
}, (table) => [
  index("audit_entity_idx").on(table.entityType, table.entityId),
  index("audit_action_idx").on(table.action),
  index("audit_performed_by_idx").on(table.performedByUserId)
]);

// 11. Therapist Availability Table
export const therapistAvailability = sqliteTable("therapist_availability", {
  id: text("id").primaryKey(),
  therapistId: text("therapist_id").notNull().references(() => therapists.id, { onDelete: "cascade" }),
  workingDays: text("working_days").notNull(), // JSON array string e.g. "[1,2,3,4,5]" (1=Mon..7=Sun or 0=Sun)
  workingHoursStart: text("working_hours_start").notNull(), // e.g. "08:00"
  workingHoursEnd: text("working_hours_end").notNull(), // e.g. "18:00"
  weeklyOff: integer("weekly_off"), // 0=Sun, null=no weekly off
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  updatedAt: text("updated_at").default(sql`(CURRENT_TIMESTAMP)`).notNull()
}, (table) => [
  uniqueIndex("availability_therapist_idx").on(table.therapistId)
]);

// 12. Therapist Leaves Table
export const therapistLeaves = sqliteTable("therapist_leaves", {
  id: text("id").primaryKey(),
  therapistId: text("therapist_id").notNull().references(() => therapists.id, { onDelete: "cascade" }),
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date").notNull(), // YYYY-MM-DD
  reason: text("reason"),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull()
}, (table) => [
  index("leaves_therapist_idx").on(table.therapistId),
  index("leaves_dates_idx").on(table.startDate, table.endDate)
]);

// 13. Procedure Room Compatibility Table
export const procedureRoomCompatibility = sqliteTable("procedure_room_compatibility", {
  id: text("id").primaryKey(),
  procedureName: text("procedure_name").notNull(),
  roomId: text("room_id").notNull().references(() => treatmentRooms.id, { onDelete: "cascade" }),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`).notNull()
}, (table) => [
  index("proc_room_idx").on(table.procedureName, table.roomId)
]);

// 14. Reminder Logs Table
export const reminderLogs = sqliteTable("reminder_logs", {
  id: text("id").primaryKey(),
  dedupeKey: text("dedupe_key").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: text("session_id"),
  reminderType: text("reminder_type").notNull(),
  scheduledOccurrence: text("scheduled_occurrence").notNull(),
  sentAt: text("sent_at").default(sql`(CURRENT_TIMESTAMP)`).notNull()
}, (table) => [
  uniqueIndex("reminder_dedupe_idx").on(table.dedupeKey),
  index("reminder_user_idx").on(table.userId)
]);

// Drizzle Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  patientProfile: one(patients, {
    fields: [users.id],
    references: [patients.userId]
  }),
  therapistProfile: one(therapists, {
    fields: [users.id],
    references: [therapists.userId]
  }),
  notifications: many(notifications),
  chatMessages: many(chatMessages),
  auditLogs: many(auditLogs),
  sessionRequests: many(sessionRequests, { relationName: "requestedByUser" })
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, {
    fields: [patients.userId],
    references: [users.id]
  }),
  therapyCourses: many(therapyCourses),
  therapySessions: many(therapySessions),
  sessionRequests: many(sessionRequests)
}));

export const therapistsRelations = relations(therapists, ({ one, many }) => ({
  user: one(users, {
    fields: [therapists.userId],
    references: [users.id]
  }),
  therapySessions: many(therapySessions),
  sessionRequests: many(sessionRequests)
}));

export const treatmentRoomsRelations = relations(treatmentRooms, ({ many }) => ({
  therapySessions: many(therapySessions)
}));

export const therapyCoursesRelations = relations(therapyCourses, ({ one, many }) => ({
  patient: one(patients, {
    fields: [therapyCourses.patientId],
    references: [patients.id]
  }),
  sessions: many(therapySessions),
  sessionRequests: many(sessionRequests)
}));

export const therapySessionsRelations = relations(therapySessions, ({ one, many }) => ({
  course: one(therapyCourses, {
    fields: [therapySessions.courseId],
    references: [therapyCourses.id]
  }),
  patient: one(patients, {
    fields: [therapySessions.patientId],
    references: [patients.id]
  }),
  therapist: one(therapists, {
    fields: [therapySessions.therapistId],
    references: [therapists.id]
  }),
  room: one(treatmentRooms, {
    fields: [therapySessions.roomId],
    references: [treatmentRooms.id]
  }),
  notifications: many(notifications),
  requests: many(sessionRequests)
}));

export const sessionRequestsRelations = relations(sessionRequests, ({ one }) => ({
  session: one(therapySessions, {
    fields: [sessionRequests.sessionId],
    references: [therapySessions.id]
  }),
  course: one(therapyCourses, {
    fields: [sessionRequests.courseId],
    references: [therapyCourses.id]
  }),
  patient: one(patients, {
    fields: [sessionRequests.patientId],
    references: [patients.id]
  }),
  therapist: one(therapists, {
    fields: [sessionRequests.therapistId],
    references: [therapists.id]
  }),
  requestedByUser: one(users, {
    fields: [sessionRequests.requestedByUserId],
    references: [users.id],
    relationName: "requestedByUser"
  }),
  resolvedByUser: one(users, {
    fields: [sessionRequests.resolvedByUserId],
    references: [users.id]
  })
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  }),
  session: one(therapySessions, {
    fields: [notifications.sessionId],
    references: [therapySessions.id]
  })
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id]
  })
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  performedByUser: one(users, {
    fields: [auditLogs.performedByUserId],
    references: [users.id]
  })
}));

export const therapistAvailabilityRelations = relations(therapistAvailability, ({ one }) => ({
  therapist: one(therapists, {
    fields: [therapistAvailability.therapistId],
    references: [therapists.id]
  })
}));

export const therapistLeavesRelations = relations(therapistLeaves, ({ one }) => ({
  therapist: one(therapists, {
    fields: [therapistLeaves.therapistId],
    references: [therapists.id]
  })
}));

export const procedureRoomCompatibilityRelations = relations(procedureRoomCompatibility, ({ one }) => ({
  room: one(treatmentRooms, {
    fields: [procedureRoomCompatibility.roomId],
    references: [treatmentRooms.id]
  })
}));

export const reminderLogsRelations = relations(reminderLogs, ({ one }) => ({
  user: one(users, {
    fields: [reminderLogs.userId],
    references: [users.id]
  }),
  session: one(therapySessions, {
    fields: [reminderLogs.sessionId],
    references: [therapySessions.id]
  })
}));

