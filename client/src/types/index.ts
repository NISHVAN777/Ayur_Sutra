export type UserRole = "ADMIN" | "THERAPIST" | "PATIENT";
export type SessionStatus = "SCHEDULED" | "COMPLETED" | "MISSED" | "CANCELLED";
export type CourseStatus = "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
export type RoomStatus = "ACTIVE" | "INACTIVE";
export type PanchakarmaPhase = "PURVAKARMA" | "PRADHANA_KARMA" | "PASCHAT_KARMA";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  patientId?: string;
  therapistId?: string;
  patientProfile?: Patient;
  therapistProfile?: Therapist;
}

export interface Patient {
  id: string;
  userId: string;
  name?: string;
  email?: string;
  phone: string;
  dateOfBirth: string;
  gender: "Male" | "Female" | "Other";
  address?: string | null;
  emergencyContact?: string | null;
  medicalNotes?: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  activeCourse?: {
    id: string;
    therapyName: string;
    durationDays: number;
    startDate: string;
    progress: number;
    completedSessions: number;
    totalSessions: number;
  } | null;
  totalCourses?: number;
  createdAt?: string;
}

export interface TherapistAvailability {
  id: string;
  therapistId: string;
  workingDays: number[];
  workingHoursStart: string;
  workingHoursEnd: string;
  weeklyOff?: number | null;
}

export interface TherapistLeave {
  id: string;
  therapistId: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
  createdAt?: string;
}

export interface ProcedureRoomCompatibility {
  id: string;
  procedureName: string;
  roomId: string;
  room?: TreatmentRoom;
  createdAt?: string;
}

export interface Therapist {
  id: string;
  userId: string;
  name?: string;
  email?: string;
  phone: string;
  specialization: string;
  experience: string;
  avatarUrl?: string | null;
  bio?: string | null;
  availability?: TherapistAvailability | null;
  leaves?: TherapistLeave[];
  upcomingSessionsCount?: number;
  completedSessionsCount?: number;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  createdAt?: string;
}

export interface TreatmentRoom {
  id: string;
  roomName: string;
  roomNumber: string;
  description?: string | null;
  status: RoomStatus;
  todaySessionsCount?: number;
  todaySessions?: TherapySession[];
  createdAt?: string;
}

export interface TherapyCourse {
  id: string;
  patientId: string;
  patientName?: string;
  patientEmail?: string;
  therapyName: string;
  description?: string | null;
  durationDays: number;
  startDate: string;
  defaultSessionTime: string;
  status: CourseStatus;
  pausedAt?: string | null;
  progressPercentage?: number;
  completedSessions?: number;
  remainingSessions?: number;
  stats?: {
    totalSessions: number;
    completedSessions: number;
    missedSessions: number;
    scheduledSessions: number;
    progressPercentage: number;
  };
  primaryTherapist?: string;
  primaryRoom?: string;
  patient?: {
    id: string;
    phone: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
  sessions?: TherapySession[];
  nextSession?: TherapySession | null;
  createdAt?: string;
}

export interface TherapySession {
  id: string;
  courseId: string;
  patientId: string;
  therapistId: string;
  roomId: string;
  dayNumber: number;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: SessionStatus;
  phase?: PanchakarmaPhase | null;
  procedure?: string | null;
  bloodPressure?: string | null;
  pulseRate?: number | null;
  temperature?: number | null;
  weight?: number | null;
  symptomScore?: number | null;
  pathya?: string | null;
  apathya?: string | null;
  lifestyleInstructions?: string | null;
  treatmentNotes?: string | null;
  rescheduleReason?: string | null;
  cancelReason?: string | null;
  missedReason?: string | null;
  replacementForSessionId?: string | null;
  completedAt?: string | null;
  patient?: {
    id: string;
    phone?: string;
    medicalNotes?: string | null;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
  therapist?: {
    id: string;
    specialization?: string;
    phone?: string;
    avatarUrl?: string | null;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
  room?: {
    id: string;
    roomName: string;
    roomNumber: string;
  };
  course?: {
    id: string;
    therapyName: string;
    durationDays: number;
  };
  createdAt?: string;
}

export interface SessionRequest {
  id: string;
  sessionId: string;
  courseId: string;
  patientId: string;
  therapistId?: string | null;
  requestedByUserId: string;
  requestedByRole: "PATIENT" | "THERAPIST";
  requestType: "RESCHEDULE" | "CANCEL" | "REPLACEMENT";
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
  reason: string;
  preferredDate?: string | null;
  preferredTime?: string | null;
  adminNotes?: string | null;
  resolvedByUserId?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  session?: TherapySession;
  course?: TherapyCourse;
  patient?: Patient;
  therapist?: Therapist;
  requestedByUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  resolvedByUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface AuditLog {
  id: string;
  entityType: "SESSION" | "COURSE";
  entityId: string;
  action: string;
  performedByUserId: string;
  performedByUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  originalValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  sessionId?: string | null;
  title: string;
  message: string;
  type: "REMINDER" | "STATUS" | "ALERT" | "SYSTEM";
  isRead: boolean;
  scheduledFor?: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: "USER" | "ASSISTANT";
  message: string;
  createdAt: string;
}

export interface PreviewSession {
  dayNumber: number;
  sessionDate: string;
  startTime: string;
  endTime: string;
  therapistId: string;
  therapistName: string;
  roomId: string;
  roomName: string;
  roomNumber: string;
  hasConflict: boolean;
  conflictReason?: string;
}

export interface AvailabilityResult {
  isAvailable: boolean;
  sessions: PreviewSession[];
  conflictCount: number;
  firstConflict?: {
    dayNumber: number;
    sessionDate: string;
    resourceType: "THERAPIST" | "ROOM";
    message: string;
  };
}

export interface DashboardStats {
  totalPatients: number;
  activeCourses: number;
  todaySessionsCount: number;
  availableTherapistsCount: number;
  availableRoomsCount: number;
  totalCompletedSessions: number;
}
