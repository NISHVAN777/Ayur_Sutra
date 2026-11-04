import { z } from "zod";

// Auth validation schemas
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["ADMIN", "THERAPIST", "PATIENT"]).default("PATIENT"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  medicalNotes: z.string().optional(),
  specialization: z.string().optional(),
  experience: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Patient validation schemas
export const createPatientSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters").default("Patient@123"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  gender: z.enum(["Male", "Female", "Other"]),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  medicalNotes: z.string().optional(),
  role: z.string().optional(),
});

export const registerPatientSchema = createPatientSchema;
export const updatePatientSchema = createPatientSchema.partial();

// Therapist validation schemas
export const createTherapistSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters").default("Therapist@123"),
  specialization: z.string().min(2, "Specialization is required"),
  phone: z.string().min(10, "Phone is required"),
  experience: z.string().min(1, "Experience is required"),
  avatarUrl: z.string().url().optional(),
  bio: z.string().optional(),
});

export const updateTherapistSchema = createTherapistSchema.partial();

// Treatment Room validation schemas
export const createRoomSchema = z.object({
  roomName: z.string().min(2, "Room name is required").refine(val => val.endsWith("Suite"), {
    message: "Room name must end with 'Suite' (e.g., 'Basti Suite')"
  }),
  roomNumber: z.string().min(1, "Room number is required"),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const updateRoomSchema = z.object({
  roomName: z.string().min(2, "Room name is required").refine(val => val.endsWith("Suite"), {
    message: "Room name must end with 'Suite' (e.g., 'Basti Suite')"
  }).optional(),
  roomNumber: z.string().min(1, "Room number is required").optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

// Therapy Course creation schemas
export const checkAvailabilitySchema = z.object({
  durationDays: z.number().int().min(1).max(30),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
  therapistId: z.string().min(1, "Therapist ID is required"),
  roomId: z.string().min(1, "Room ID is required"),
  sessionTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM"),
  excludeSessionId: z.string().optional(),
});

export const createCourseSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  therapyName: z.string().min(2, "Therapy name is required"),
  description: z.string().optional(),
  durationDays: z.number().int().min(1).max(30),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
  therapistId: z.string().min(1, "Therapist ID is required"),
  roomId: z.string().min(1, "Room ID is required"),
  defaultSessionTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM"),
  plan: z.array(z.object({
    dayNumber: z.number().int().min(1),
    procedure: z.string().optional(),
    phase: z.enum(["PURVAKARMA", "PRADHANA_KARMA", "PASCHAT_KARMA"]).optional(),
    therapistId: z.string().optional(),
    roomId: z.string().optional(),
    sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    pathya: z.string().optional(),
    apathya: z.string().optional(),
    lifestyleInstructions: z.string().optional(),
  })).optional(),
});

// Session Actions schemas
export const completeSessionSchema = z.object({
  treatmentNotes: z.string().min(5, "Treatment notes must be at least 5 characters"),
  bloodPressure: z.string().optional().nullable(),
  pulseRate: z.number().int().optional().nullable(),
  temperature: z.number().optional().nullable(),
  weight: z.number().optional().nullable(),
  symptomScore: z.number().int().min(1).max(10).optional().nullable(),
  pathya: z.string().optional().nullable(),
  apathya: z.string().optional().nullable(),
  lifestyleInstructions: z.string().optional().nullable(),
  phase: z.string().optional().nullable(),
  procedure: z.string().optional().nullable(),
});

export const markMissedSessionSchema = z.object({
  reason: z.string().optional(),
});

export const rescheduleSessionSchema = z.object({
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Start time must be HH:MM"),
  therapistId: z.string().optional(),
  roomId: z.string().optional(),
  reason: z.string().min(3, "Rescheduling reason is required"),
});

export const cancelSessionSchema = z.object({
  reason: z.string().min(3, "Cancellation reason is required"),
});

export const requestRescheduleSchema = z.object({
  reason: z.string().min(3, "Reason is required (at least 3 characters)"),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
  preferredTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM").optional(),
});

export const requestCancelSchema = z.object({
  reason: z.string().min(3, "Cancellation reason is required (at least 3 characters)"),
});

export const requestReplacementSchema = z.object({
  reason: z.string().min(3, "Reason is required (at least 3 characters)"),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
  preferredTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM").optional(),
});

export const approveRequestSchema = z.object({
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be HH:MM").optional(),
  therapistId: z.string().optional(),
  roomId: z.string().optional(),
  notes: z.string().optional(),
});

export const rejectRequestSchema = z.object({
  reason: z.string().min(3, "Rejection reason is required (at least 3 characters)"),
});

export const changeTherapistSchema = z.object({
  therapistId: z.string().min(1, "Therapist ID is required"),
  reason: z.string().optional(),
});

export const changeRoomSchema = z.object({
  roomId: z.string().min(1, "Room ID is required"),
  reason: z.string().optional(),
});

export const pauseCourseSchema = z.object({
  reason: z.string().optional(),
});

export const resumeCourseSchema = z.object({
  resumeStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Resume start date must be YYYY-MM-DD").optional(),
  reason: z.string().optional(),
});

// Chat message schema
export const chatMessageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
});

// Hackathon Task 1: daily wellness log
export const wellnessLogSchema = z.object({
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
  breakfast: z.string().max(300).optional(),
  lunch: z.string().max(300).optional(),
  dinner: z.string().max(300).optional(),
  agniStatus: z.enum(["SAMA", "VISHAMA", "TIKSHNA", "MANDA"]),
  bowelStatus: z.enum(["NORMAL", "CONSTIPATED", "LOOSE"]),
  reactions: z.array(z.string().max(60)).max(12).default([]),
  energyLevel: z.number().int().min(1).max(5),
  discomfortLevel: z.number().int().min(0).max(10),
  notes: z.string().max(1000).optional(),
});

// Hackathon Task 2: disruption rescheduling
export const disruptionSchema = z.object({
  therapistId: z.string().min(1, "Therapist ID is required"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD"),
  reason: z.string().min(3, "A reason is required"),
});
