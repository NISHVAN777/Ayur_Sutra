import { db, sqlite, schema } from "../db/index.js";
import { 
  therapyCourses, therapySessions, treatmentRooms, therapists, 
  patients, users, notifications, auditLogs, sessionRequests 
} from "../db/schema.js";
import { eq, and, ne, sql, desc } from "drizzle-orm";
import { addDays, format, parseISO, differenceInCalendarDays } from "date-fns";
import { calculateEndTime, formatToDisplayTime } from "../utils/dateUtils.js";
import { AppError, SchedulingConflictError } from "../middleware/errorHandler.js";

export { SchedulingConflictError };

export interface AvailabilityRequest {
  durationDays: number;
  startDate: string; // YYYY-MM-DD
  therapistId: string;
  roomId: string;
  sessionTime: string; // HH:MM
  procedure?: string;
  excludeSessionId?: string;
}

export interface DaySlotCheck {
  dayNumber: number;
  sessionDate: string;
  startTime: string;
  endTime: string;
  therapistAvailable: boolean;
  roomAvailable: boolean;
  therapistConflictDetails?: string;
  roomConflictDetails?: string;
  errorCode?: string;
}

export class SchedulingService {
  /**
   * Validates therapist schedule constraints (working hours, working days, leaves)
   */
  static async checkTherapistAvailabilityRule(
    therapistId: string,
    sessionDate: string,
    startTime: string,
    endTime: string
  ): Promise<{ available: boolean; code?: string; reason?: string }> {
    // 1. Check Leaves
    const leave = sqlite
      .prepare(`
        SELECT * FROM therapist_leaves 
        WHERE therapist_id = ? AND start_date <= ? AND end_date >= ?
        LIMIT 1
      `)
      .get(therapistId, sessionDate, sessionDate) as any;

    if (leave) {
      return {
        available: false,
        code: "THERAPIST_UNAVAILABLE",
        reason: `Therapist is on approved leave (${leave.reason || "Scheduled Leave"})`,
      };
    }

    // 2. Check Availability Schedule (Unrestricted if no record exists)
    const availRecord = sqlite
      .prepare(`SELECT * FROM therapist_availability WHERE therapist_id = ?`)
      .get(therapistId) as any;

    if (availRecord) {
      const parsedDate = parseISO(sessionDate);
      const dayOfWeek = parsedDate.getDay(); // 0 = Sunday, 1 = Monday..6 = Saturday
      let workingDays: number[] = [1, 2, 3, 4, 5, 6];
      try {
        workingDays = JSON.parse(availRecord.working_days || "[]");
      } catch (e) {
        workingDays = [1, 2, 3, 4, 5, 6];
      }

      if (!workingDays.includes(dayOfWeek) || dayOfWeek === availRecord.weekly_off) {
        return {
          available: false,
          code: "THERAPIST_UNAVAILABLE",
          reason: "Therapist is not scheduled to work on this day of the week",
        };
      }

      if (startTime < availRecord.working_hours_start || endTime > availRecord.working_hours_end) {
        return {
          available: false,
          code: "THERAPIST_UNAVAILABLE",
          reason: `Requested time (${startTime}-${endTime}) is outside practitioner working hours (${availRecord.working_hours_start}-${availRecord.working_hours_end})`,
        };
      }
    }

    return { available: true };
  }

  /**
   * Validates procedure ↔ treatment suite compatibility
   */
  static async checkProcedureRoomCompatibility(
    procedureName: string | undefined,
    roomId: string
  ): Promise<{ compatible: boolean; code?: string; reason?: string }> {
    if (!procedureName) return { compatible: true };

    const mappings = sqlite
      .prepare(`SELECT room_id FROM procedure_room_compatibility WHERE procedure_name = ?`)
      .all(procedureName) as Array<{ room_id: string }>;

    // If no compatibility restrictions defined for procedure, allowed in any active room
    if (mappings.length === 0) {
      return { compatible: true };
    }

    const isMatch = mappings.some((m) => m.room_id === roomId);
    if (!isMatch) {
      return {
        compatible: false,
        code: "ROOM_PROCEDURE_INCOMPATIBLE",
        reason: `Treatment Suite is not compatible/equipped for procedure "${procedureName}"`,
      };
    }

    return { compatible: true };
  }

  /**
   * Checks multi-day availability across entire course duration before committing
   */
  static async checkCourseAvailability(params: AvailabilityRequest): Promise<{
    isAvailable: boolean;
    conflictCount: number;
    sessions: DaySlotCheck[];
    firstConflict?: {
      dayNumber: number;
      sessionDate: string;
      resourceType: "THERAPIST" | "ROOM";
      errorCode?: string;
      message: string;
    };
  }> {
    const { durationDays, startDate, therapistId, roomId, sessionTime, procedure, excludeSessionId } = params;
    const startDateTime = parseISO(startDate);
    const endTime = calculateEndTime(sessionTime, 60);

    const sessionChecks: DaySlotCheck[] = [];
    let conflictCount = 0;
    let firstConflict: {
      dayNumber: number;
      sessionDate: string;
      resourceType: "THERAPIST" | "ROOM";
      errorCode?: string;
      message: string;
    } | undefined = undefined;

    // Fetch therapist and room names for clear error reporting
    const therapistRecord = await db.query.therapists.findFirst({
      where: eq(therapists.id, therapistId),
      with: { user: true },
    });
    const therapistName = therapistRecord?.user?.name || "Therapist";

    const roomRecord = await db.query.treatmentRooms.findFirst({
      where: eq(treatmentRooms.id, roomId),
    });
    const roomName = roomRecord ? `${roomRecord.roomName} (Room ${roomRecord.roomNumber})` : "Treatment Suite";

    // Room active check
    const isRoomActive = roomRecord && roomRecord.status === "ACTIVE";

    // Procedure compatibility check
    const compatCheck = await this.checkProcedureRoomCompatibility(procedure, roomId);

    for (let i = 0; i < durationDays; i++) {
      const currentDayNumber = i + 1;
      const currentDate = format(addDays(startDateTime, i), "yyyy-MM-dd");

      // 1. Check Room Active Status
      if (!isRoomActive) {
        conflictCount++;
        const msg = `Treatment Suite "${roomName}" is currently INACTIVE.`;
        if (!firstConflict) {
          firstConflict = {
            dayNumber: currentDayNumber,
            sessionDate: currentDate,
            resourceType: "ROOM",
            errorCode: "ROOM_INACTIVE",
            message: msg,
          };
        }
      }

      // 2. Check Procedure Compatibility
      if (!compatCheck.compatible) {
        conflictCount++;
        const msg = compatCheck.reason || `Treatment Suite is not compatible with procedure ${procedure}.`;
        if (!firstConflict) {
          firstConflict = {
            dayNumber: currentDayNumber,
            sessionDate: currentDate,
            resourceType: "ROOM",
            errorCode: compatCheck.code || "ROOM_PROCEDURE_INCOMPATIBLE",
            message: msg,
          };
        }
      }

      // 3. Check Therapist Shift Schedule & Leave
      const thpScheduleCheck = await this.checkTherapistAvailabilityRule(
        therapistId,
        currentDate,
        sessionTime,
        endTime
      );
      if (!thpScheduleCheck.available) {
        conflictCount++;
        const msg = `Therapist ${therapistName} is unavailable on Day ${currentDayNumber}, ${currentDate}: ${thpScheduleCheck.reason}`;
        if (!firstConflict) {
          firstConflict = {
            dayNumber: currentDayNumber,
            sessionDate: currentDate,
            resourceType: "THERAPIST",
            errorCode: thpScheduleCheck.code || "THERAPIST_UNAVAILABLE",
            message: msg,
          };
        }
      }

      // 4. Check Therapist Double-booking Conflict on currentDate
      const therapistConflictQuery = `
        SELECT s.id, s.start_time, s.end_time, c.therapy_name, u.name as patient_name
        FROM therapy_sessions s
        JOIN therapy_courses c ON s.course_id = c.id
        JOIN patients p ON s.patient_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE s.therapist_id = ?
          AND s.session_date = ?
          AND s.status != 'CANCELLED'
          ${excludeSessionId ? `AND s.id != '${excludeSessionId}'` : ""}
          AND (
            (s.start_time < ? AND s.end_time > ?)
          )
        LIMIT 1
      `;
      const therapistConflict = sqlite
        .prepare(therapistConflictQuery)
        .get(therapistId, currentDate, endTime, sessionTime) as any;

      // 5. Check Room Double-booking Conflict on currentDate
      const roomConflictQuery = `
        SELECT s.id, s.start_time, s.end_time, c.therapy_name, u.name as patient_name
        FROM therapy_sessions s
        JOIN therapy_courses c ON s.course_id = c.id
        JOIN patients p ON s.patient_id = p.id
        JOIN users u ON p.user_id = u.id
        WHERE s.room_id = ?
          AND s.session_date = ?
          AND s.status != 'CANCELLED'
          ${excludeSessionId ? `AND s.id != '${excludeSessionId}'` : ""}
          AND (
            (s.start_time < ? AND s.end_time > ?)
          )
        LIMIT 1
      `;
      const roomConflict = sqlite
        .prepare(roomConflictQuery)
        .get(roomId, currentDate, endTime, sessionTime) as any;

      const therapistAvailable: boolean = Boolean(thpScheduleCheck.available && !therapistConflict);
      const roomAvailable: boolean = Boolean(isRoomActive && compatCheck.compatible && !roomConflict);

      let therapistConflictDetails: string | undefined;
      let roomConflictDetails: string | undefined;

      if (therapistConflict) {
        conflictCount++;
        therapistConflictDetails = `${therapistName} is already booked from ${formatToDisplayTime(
          therapistConflict.start_time
        )} to ${formatToDisplayTime(therapistConflict.end_time)}`;
        if (!firstConflict) {
          firstConflict = {
            dayNumber: currentDayNumber,
            sessionDate: currentDate,
            resourceType: "THERAPIST",
            errorCode: "THERAPIST_CONFLICT",
            message: `Therapist ${therapistName} is unavailable on Day ${currentDayNumber}, ${currentDate} from ${formatToDisplayTime(
              sessionTime
            )} to ${formatToDisplayTime(endTime)}.`,
          };
        }
      }

      if (roomConflict) {
        conflictCount++;
        roomConflictDetails = `${roomName} is occupied from ${formatToDisplayTime(
          roomConflict.start_time
        )} to ${formatToDisplayTime(roomConflict.end_time)}`;
        if (!firstConflict) {
          firstConflict = {
            dayNumber: currentDayNumber,
            sessionDate: currentDate,
            resourceType: "ROOM",
            errorCode: "ROOM_CONFLICT",
            message: `Treatment Room ${roomName} is already booked on Day ${currentDayNumber}, ${currentDate} from ${formatToDisplayTime(
              sessionTime
            )} to ${formatToDisplayTime(endTime)}.`,
          };
        }
      }

      sessionChecks.push({
        dayNumber: currentDayNumber,
        sessionDate: currentDate,
        startTime: sessionTime,
        endTime: endTime,
        therapistAvailable,
        roomAvailable,
        therapistConflictDetails,
        roomConflictDetails,
      });
    }

    return {
      isAvailable: conflictCount === 0,
      conflictCount,
      sessions: sessionChecks,
      firstConflict,
    };
  }

  /**
   * Creates a multi-day Panchakarma course and generates all Day 1..N daily sessions atomically
   */
  static async createCourse(params: {
    patientId: string;
    therapyName: string;
    description?: string;
    durationDays: number;
    startDate: string;
    therapistId: string;
    roomId: string;
    defaultSessionTime: string;
    plan?: Array<{
      dayNumber: number;
      phase?: "PURVAKARMA" | "PRADHANA_KARMA" | "PASCHAT_KARMA";
      procedure?: string;
      therapistId?: string;
      roomId?: string;
      startTime?: string;
      endTime?: string;
      pathya?: string;
      apathya?: string;
      lifestyleInstructions?: string;
    }>;
    performedByUserId?: string;
  }) {
    const {
      patientId,
      therapyName,
      description,
      durationDays,
      startDate,
      therapistId,
      roomId,
      defaultSessionTime,
      plan,
      performedByUserId,
    } = params;

    // 1. Verify existence & active statuses
    const patient = await db.query.patients.findFirst({
      where: eq(patients.id, patientId),
      with: { user: true },
    });
    if (!patient) throw new AppError("Patient not found", 404);

    const therapist = await db.query.therapists.findFirst({
      where: eq(therapists.id, therapistId),
      with: { user: true },
    });
    if (!therapist) throw new AppError("Therapist not found", 404);

    const room = await db.query.treatmentRooms.findFirst({
      where: eq(treatmentRooms.id, roomId),
    });
    if (!room) throw new AppError("Treatment room not found", 404);
    if (room.status !== "ACTIVE") {
      throw new SchedulingConflictError(`Treatment Suite "${room.roomName}" is currently INACTIVE.`, {
        code: "ROOM_INACTIVE",
        resourceType: "ROOM",
        resourceId: roomId,
      });
    }

    // 2. Scan multi-day availability across all N days
    const availability = await this.checkCourseAvailability({
      durationDays,
      startDate,
      therapistId,
      roomId,
      sessionTime: defaultSessionTime,
    });

    if (!availability.isAvailable && availability.firstConflict) {
      throw new SchedulingConflictError(availability.firstConflict.message, {
        code: availability.firstConflict.errorCode || "SCHEDULING_CONFLICT",
        dayNumber: availability.firstConflict.dayNumber,
        sessionDate: availability.firstConflict.sessionDate,
        time: `${defaultSessionTime} - ${calculateEndTime(defaultSessionTime, 60)}`,
        resourceType: availability.firstConflict.resourceType,
      });
    }

    // 3. Prepare Day 1..N daily session data with phases & procedures
    const sessionDetails: Array<{
      dayNumber: number;
      sessionDate: string;
      startTime: string;
      endTime: string;
      therapistId: string;
      roomId: string;
      phase: "PURVAKARMA" | "PRADHANA_KARMA" | "PASCHAT_KARMA";
      procedure: string;
      pathya?: string | null;
      apathya?: string | null;
      lifestyleInstructions?: string | null;
    }> = [];

    const startDateTime = parseISO(startDate);
    const endTime = calculateEndTime(defaultSessionTime, 60);

    for (let i = 0; i < durationDays; i++) {
      const dayNum = i + 1;
      const sDate = format(addDays(startDateTime, i), "yyyy-MM-dd");
      const planItem = plan?.find((p) => p.dayNumber === dayNum);

      let phase: "PURVAKARMA" | "PRADHANA_KARMA" | "PASCHAT_KARMA" = "PRADHANA_KARMA";
      let proc = therapyName;
      let sThp = planItem?.therapistId || therapistId;
      let sRoom = planItem?.roomId || roomId;
      let sStart = planItem?.startTime || defaultSessionTime;
      let sEnd = planItem?.endTime || calculateEndTime(sStart, 60);
      let pathya = planItem?.pathya || "Warm light satvik diet";
      let apathya = planItem?.apathya || "Cold drinks, fried or heavy foods";
      let lifestyle = planItem?.lifestyleInstructions || "Adequate restful sleep, avoid physical exertion";

      if (planItem?.phase) {
        phase = planItem.phase;
      } else {
        // Automatic sensible classical Panchakarma default progression
        if (durationDays <= 5) {
          if (dayNum === 1) phase = "PURVAKARMA";
          else if (dayNum === durationDays) phase = "PASCHAT_KARMA";
          else phase = "PRADHANA_KARMA";
        } else if (durationDays <= 7) {
          if (dayNum <= 2) phase = "PURVAKARMA";
          else if (dayNum <= 5) phase = "PRADHANA_KARMA";
          else phase = "PASCHAT_KARMA";
        } else {
          const purvaEnd = Math.max(1, Math.floor(durationDays * 0.25));
          const pradhanaEnd = Math.max(purvaEnd + 1, Math.floor(durationDays * 0.75));
          if (dayNum <= purvaEnd) phase = "PURVAKARMA";
          else if (dayNum <= pradhanaEnd) phase = "PRADHANA_KARMA";
          else phase = "PASCHAT_KARMA";
        }
      }

      if (planItem?.procedure) {
        proc = planItem.procedure;
      } else {
        if (phase === "PURVAKARMA") {
          proc = durationDays <= 5 ? "Deepana & Pachana" : "Abhyanga & Swedana";
        } else if (phase === "PRADHANA_KARMA") {
          proc = therapyName;
        } else {
          proc = durationDays <= 5 ? "Swedana & Rest" : "Samsarjana Krama";
        }
      }

      // Validate Procedure ↔ Room Compatibility for this session
      const procCompat = await this.checkProcedureRoomCompatibility(proc, sRoom);
      if (!procCompat.compatible) {
        throw new SchedulingConflictError(
          procCompat.reason || `Room ${sRoom} is incompatible with procedure ${proc}`,
          {
            code: "ROOM_PROCEDURE_INCOMPATIBLE",
            dayNumber: dayNum,
            sessionDate: sDate,
            resourceType: "ROOM",
            resourceId: sRoom,
          }
        );
      }

      sessionDetails.push({
        dayNumber: dayNum,
        sessionDate: sDate,
        startTime: sStart,
        endTime: sEnd,
        therapistId: sThp,
        roomId: sRoom,
        phase,
        procedure: proc,
        pathya,
        apathya,
        lifestyleInstructions: lifestyle,
      });
    }

    // 4. Execute Atomic SQLite Transaction
    const courseId = `crs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const tx = sqlite.transaction(() => {
      // 4a. Insert Course
      sqlite.prepare(`
        INSERT INTO therapy_courses (
          id, patient_id, therapy_name, description, duration_days, 
          start_date, default_session_time, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(courseId, patientId, therapyName, description || null, durationDays, startDate, defaultSessionTime);

      // 4b. Insert all Day 1..N daily sessions
      const insertSessionStmt = sqlite.prepare(`
        INSERT INTO therapy_sessions (
          id, course_id, patient_id, therapist_id, room_id, day_number, 
          session_date, start_time, end_time, status, phase, procedure,
          pathya, apathya, lifestyle_instructions, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      for (const s of sessionDetails) {
        const sessionId = `ses_${courseId}_day_${s.dayNumber}`;
        insertSessionStmt.run(
          sessionId,
          courseId,
          patientId,
          s.therapistId,
          s.roomId,
          s.dayNumber,
          s.sessionDate,
          s.startTime,
          s.endTime,
          s.phase,
          s.procedure,
          s.pathya || null,
          s.apathya || null,
          s.lifestyleInstructions || null
        );
      }

      // 4c. Insert Initial Patient Notification
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO notifications (
          id, user_id, title, message, type, is_read, scheduled_for, created_at
        ) VALUES (?, ?, ?, ?, 'STATUS', 0, ?, CURRENT_TIMESTAMP)
      `).run(
        notifId,
        patient.userId,
        `New ${therapyName} Course Scheduled`,
        `Your ${durationDays}-day ${therapyName} has been successfully scheduled starting on ${startDate} at ${formatToDisplayTime(
          defaultSessionTime
        )} with ${therapist.user.name} in ${room.roomName} (Room ${room.roomNumber}).`,
        startDate
      );

      // 4d. Record Audit Log
      if (performedByUserId) {
        const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        sqlite.prepare(`
          INSERT INTO audit_logs (
            id, entity_type, entity_id, action, performed_by_user_id,
            original_value, new_value, reason, created_at
          ) VALUES (?, 'COURSE', ?, 'SESSION_CREATED', ?, NULL, ?, ?, CURRENT_TIMESTAMP)
        `).run(
          auditId,
          courseId,
          performedByUserId,
          JSON.stringify({ therapyName, durationDays, startDate, defaultSessionTime, therapistId, roomId }),
          "Initial multi-day course generation"
        );
      }
    });

    tx();

    // 5. Return created course with nested sessions
    const createdCourse = await db.query.therapyCourses.findFirst({
      where: eq(therapyCourses.id, courseId),
      with: {
        patient: { with: { user: true } },
        sessions: {
          with: {
            therapist: { with: { user: true } },
            room: true,
          },
          orderBy: (sessions, { asc }) => [asc(sessions.dayNumber)],
        },
      },
    });

    return createdCourse;
  }

  /**
   * Reschedules a specific session (SCHEDULED or MISSED) with full conflict checking,
   * patient notification, and audit logging.
   */
  static async rescheduleSession(params: {
    sessionId: string;
    sessionDate: string;
    startTime: string;
    therapistId?: string;
    roomId?: string;
    reason: string;
    performedByUserId: string;
  }) {
    const { sessionId, sessionDate, startTime, therapistId, roomId, reason, performedByUserId } = params;

    const session = await db.query.therapySessions.findFirst({
      where: eq(therapySessions.id, sessionId),
      with: {
        course: true,
        patient: { with: { user: true } },
        therapist: { with: { user: true } },
        room: true,
      },
    });

    if (!session) throw new AppError("Session not found", 404);
    if (session.status === "CANCELLED") {
      throw new AppError("Cannot reschedule a cancelled session.", 400);
    }
    if (session.status === "COMPLETED") {
      throw new AppError("Cannot reschedule an already completed session.", 400);
    }
    if (session.status === "MISSED") {
      throw new AppError("Cannot reschedule a missed session directly. A replacement session must be scheduled instead to preserve treatment records.", 400);
    }

    const targetTherapistId = therapistId || session.therapistId;
    const targetRoomId = roomId || session.roomId;
    const endTime = calculateEndTime(startTime, 60);

    // Verify room is active
    const targetRoom = await db.query.treatmentRooms.findFirst({
      where: eq(treatmentRooms.id, targetRoomId),
    });
    if (!targetRoom || targetRoom.status !== "ACTIVE") {
      throw new AppError(`Treatment Suite "${targetRoom?.roomName || targetRoomId}" is not active.`, 400);
    }

    // Check availability (excluding this specific session)
    const availability = await this.checkCourseAvailability({
      durationDays: 1,
      startDate: sessionDate,
      therapistId: targetTherapistId,
      roomId: targetRoomId,
      sessionTime: startTime,
      excludeSessionId: sessionId,
    });

    if (!availability.isAvailable && availability.firstConflict) {
      throw new SchedulingConflictError(availability.firstConflict.message, {
        dayNumber: session.dayNumber,
        sessionDate: sessionDate,
        time: `${startTime} - ${endTime}`,
        resourceType: availability.firstConflict.resourceType,
      });
    }

    const originalValue = {
      sessionDate: session.sessionDate,
      startTime: session.startTime,
      endTime: session.endTime,
      therapistId: session.therapistId,
      roomId: session.roomId,
      status: session.status,
    };

    const newValue = {
      sessionDate: sessionDate,
      startTime: startTime,
      endTime: endTime,
      therapistId: targetTherapistId,
      roomId: targetRoomId,
      status: "SCHEDULED",
    };

    // Execute atomic update, audit log, and notification
    const tx = sqlite.transaction(() => {
      sqlite.prepare(`
        UPDATE therapy_sessions 
        SET session_date = ?, start_time = ?, end_time = ?, 
            therapist_id = ?, room_id = ?, status = 'SCHEDULED', 
            reschedule_reason = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(sessionDate, startTime, endTime, targetTherapistId, targetRoomId, reason, sessionId);

      // Record Audit Log
      const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO audit_logs (
          id, entity_type, entity_id, action, performed_by_user_id,
          original_value, new_value, reason, created_at
        ) VALUES (?, 'SESSION', ?, 'SESSION_RESCHEDULED', ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        auditId,
        sessionId,
        performedByUserId,
        JSON.stringify(originalValue),
        JSON.stringify(newValue),
        reason
      );

      // Create Patient Notification
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO notifications (
          id, user_id, session_id, title, message, type, is_read, scheduled_for, created_at
        ) VALUES (?, ?, ?, 'Session Rescheduled', ?, 'ALERT', 0, ?, CURRENT_TIMESTAMP)
      `).run(
        notifId,
        session.patient.userId,
        sessionId,
        `Your Day ${session.dayNumber} ${session.course.therapyName} session has been rescheduled to ${sessionDate} at ${formatToDisplayTime(
          startTime
        )} in ${targetRoom.roomName} (Room ${targetRoom.roomNumber}). Reason: ${reason}`,
        sessionDate
      );

      // Notify Original Assigned Practitioner
      const notifIdTherapist = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO notifications (
          id, user_id, session_id, title, message, type, is_read, scheduled_for, created_at
        ) VALUES (?, ?, ?, 'Session Schedule Updated', ?, 'ALERT', 0, ?, CURRENT_TIMESTAMP)
      `).run(
        notifIdTherapist,
        session.therapist.userId,
        sessionId,
        `Day ${session.dayNumber} session for ${session.patient.user.name} (${session.course.therapyName}) has been rescheduled to ${sessionDate} at ${formatToDisplayTime(
          startTime
        )} in ${targetRoom.roomName}. Reason: ${reason}`,
        sessionDate
      );

      // If practitioner changed, notify the new practitioner as well
      if (targetTherapistId !== session.therapistId) {
        const targetTherapistUser = sqlite.prepare(`SELECT user_id FROM therapists WHERE id = ?`).get(targetTherapistId) as { user_id: string } | undefined;
        if (targetTherapistUser) {
          const notifIdNewThp = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          sqlite.prepare(`
            INSERT INTO notifications (
              id, user_id, session_id, title, message, type, is_read, scheduled_for, created_at
            ) VALUES (?, ?, ?, 'New Session Assigned', ?, 'ALERT', 0, ?, CURRENT_TIMESTAMP)
          `).run(
            notifIdNewThp,
            targetTherapistUser.user_id,
            sessionId,
            `You have been assigned to Day ${session.dayNumber} session for ${session.patient.user.name} (${session.course.therapyName}) on ${sessionDate} at ${formatToDisplayTime(
              startTime
            )} in ${targetRoom.roomName}.`,
            sessionDate
          );
        }
      }
    });

    tx();

    return await db.query.therapySessions.findFirst({
      where: eq(therapySessions.id, sessionId),
      with: {
        course: true,
        patient: { with: { user: true } },
        therapist: { with: { user: true } },
        room: true,
      },
    });
  }

  /**
   * Cancels a session with mandatory reason, preserving history, audit log & notifying all affected users
   */
  static async cancelSession(params: {
    sessionId: string;
    reason: string;
    performedByUserId: string;
  }) {
    const { sessionId, reason, performedByUserId } = params;

    const session = await db.query.therapySessions.findFirst({
      where: eq(therapySessions.id, sessionId),
      with: {
        course: true,
        patient: { with: { user: true } },
        therapist: { with: { user: true } },
        room: true,
      },
    });

    if (!session) throw new AppError("Session not found", 404);
    if (session.status === "COMPLETED") {
      throw new AppError("Cannot cancel an already completed session.", 400);
    }
    if (session.status === "CANCELLED") {
      throw new AppError("Session is already cancelled.", 400);
    }

    const originalValue = { status: session.status };
    const newValue = { status: "CANCELLED", cancelReason: reason };

    const tx = sqlite.transaction(() => {
      sqlite.prepare(`
        UPDATE therapy_sessions 
        SET status = 'CANCELLED', cancel_reason = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(reason, sessionId);

      // Audit Log
      const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO audit_logs (
          id, entity_type, entity_id, action, performed_by_user_id,
          original_value, new_value, reason, created_at
        ) VALUES (?, 'SESSION', ?, 'SESSION_CANCELLED', ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        auditId,
        sessionId,
        performedByUserId,
        JSON.stringify(originalValue),
        JSON.stringify(newValue),
        reason
      );

      // Patient Notification
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO notifications (
          id, user_id, session_id, title, message, type, is_read, scheduled_for, created_at
        ) VALUES (?, ?, ?, 'Session Cancelled', ?, 'ALERT', 0, ?, CURRENT_TIMESTAMP)
      `).run(
        notifId,
        session.patient.userId,
        sessionId,
        `Your Day ${session.dayNumber} ${session.course.therapyName} session on ${session.sessionDate} has been cancelled. Reason: ${reason}`,
        session.sessionDate
      );

      // Therapist Notification
      const notifIdThp = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO notifications (
          id, user_id, session_id, title, message, type, is_read, scheduled_for, created_at
        ) VALUES (?, ?, ?, 'Session Cancelled', ?, 'ALERT', 0, ?, CURRENT_TIMESTAMP)
      `).run(
        notifIdThp,
        session.therapist.userId,
        sessionId,
        `Day ${session.dayNumber} session for ${session.patient.user.name} on ${session.sessionDate} has been cancelled. Reason: ${reason}`,
        session.sessionDate
      );
    });

    tx();

    return await db.query.therapySessions.findFirst({
      where: eq(therapySessions.id, sessionId),
      with: {
        course: true,
        patient: { with: { user: true } },
        therapist: { with: { user: true } },
        room: true,
      },
    });
  }

  /**
   * Creates a replacement session for a MISSED session without modifying the original missed session record
   */
  static async createReplacementSession(params: {
    courseId: string;
    originalSessionId: string;
    sessionDate: string;
    startTime: string;
    therapistId?: string;
    roomId?: string;
    reason: string;
    performedByUserId: string;
  }) {
    const { courseId, originalSessionId, sessionDate, startTime, therapistId, roomId, reason, performedByUserId } = params;

    const originalSession = await db.query.therapySessions.findFirst({
      where: eq(therapySessions.id, originalSessionId),
      with: {
        course: true,
        patient: { with: { user: true } },
        therapist: { with: { user: true } },
        room: true,
      },
    });

    if (!originalSession) throw new AppError("Original session not found", 404);
    if (originalSession.status !== "MISSED") {
      throw new AppError("A replacement session can only be created for a MISSED session.", 400);
    }

    const targetTherapistId = therapistId || originalSession.therapistId;
    const targetRoomId = roomId || originalSession.roomId;
    const endTime = calculateEndTime(startTime, 60);

    const targetRoom = await db.query.treatmentRooms.findFirst({
      where: eq(treatmentRooms.id, targetRoomId),
    });
    if (!targetRoom || targetRoom.status !== "ACTIVE") {
      throw new AppError(`Treatment Suite "${targetRoom?.roomName || targetRoomId}" is not active.`, 400);
    }

    const targetTherapist = await db.query.therapists.findFirst({
      where: eq(therapists.id, targetTherapistId),
      with: { user: true },
    });
    if (!targetTherapist) throw new AppError("Therapist not found", 404);

    // Check availability
    const availability = await this.checkCourseAvailability({
      durationDays: 1,
      startDate: sessionDate,
      therapistId: targetTherapistId,
      roomId: targetRoomId,
      sessionTime: startTime,
    });

    if (!availability.isAvailable && availability.firstConflict) {
      throw new SchedulingConflictError(availability.firstConflict.message, {
        dayNumber: originalSession.dayNumber,
        sessionDate: sessionDate,
        time: `${startTime} - ${endTime}`,
        resourceType: availability.firstConflict.resourceType,
      });
    }

    // Determine next day_number for this course
    const maxDayResult = sqlite.prepare(`
      SELECT COALESCE(MAX(day_number), 0) as max_day FROM therapy_sessions WHERE course_id = ?
    `).get(courseId) as { max_day: number };
    const nextDayNumber = maxDayResult.max_day + 1;

    const replacementSessionId = `ses_${courseId}_rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const tx = sqlite.transaction(() => {
      sqlite.prepare(`
        INSERT INTO therapy_sessions (
          id, course_id, patient_id, therapist_id, room_id, day_number,
          session_date, start_time, end_time, status, replacement_for_session_id,
          reschedule_reason, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        replacementSessionId,
        courseId,
        originalSession.patientId,
        targetTherapistId,
        targetRoomId,
        nextDayNumber,
        sessionDate,
        startTime,
        endTime,
        originalSessionId,
        reason
      );

      // Audit Log
      const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO audit_logs (
          id, entity_type, entity_id, action, performed_by_user_id,
          original_value, new_value, reason, created_at
        ) VALUES (?, 'SESSION', ?, 'SESSION_REPLACEMENT_CREATED', ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        auditId,
        replacementSessionId,
        performedByUserId,
        JSON.stringify({
          originalSessionId,
          originalDayNumber: originalSession.dayNumber,
          originalSessionDate: originalSession.sessionDate,
          originalStatus: originalSession.status,
        }),
        JSON.stringify({
          replacementSessionId,
          dayNumber: nextDayNumber,
          sessionDate,
          startTime,
          endTime,
          therapistId: targetTherapistId,
          roomId: targetRoomId,
          status: "SCHEDULED",
        }),
        reason
      );

      // Patient Notification
      const notifId1 = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO notifications (
          id, user_id, session_id, title, message, type, is_read, scheduled_for, created_at
        ) VALUES (?, ?, ?, 'Replacement Session Scheduled', ?, 'ALERT', 0, ?, CURRENT_TIMESTAMP)
      `).run(
        notifId1,
        originalSession.patient.userId,
        replacementSessionId,
        `Your missed Day ${originalSession.dayNumber} ${originalSession.course.therapyName} session has been scheduled as Day ${nextDayNumber} on ${sessionDate} at ${formatToDisplayTime(
          startTime
        )} in ${targetRoom.roomName} (Room ${targetRoom.roomNumber}) with ${targetTherapist.user.name}. Original session: ${originalSession.sessionDate} (MISSED).`,
        sessionDate
      );

      // Assigned Therapist Notification
      const notifId2 = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO notifications (
          id, user_id, session_id, title, message, type, is_read, scheduled_for, created_at
        ) VALUES (?, ?, ?, 'Replacement Session Assigned', ?, 'ALERT', 0, ?, CURRENT_TIMESTAMP)
      `).run(
        notifId2,
        targetTherapist.userId,
        replacementSessionId,
        `A replacement session (Day ${nextDayNumber}) for ${originalSession.patient.user.name} (${originalSession.course.therapyName}) has been scheduled on ${sessionDate} at ${formatToDisplayTime(
          startTime
        )} in ${targetRoom.roomName}.`,
        sessionDate
      );

      // If original therapist differs, notify original therapist too
      if (originalSession.therapistId !== targetTherapistId) {
        const notifId3 = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        sqlite.prepare(`
          INSERT INTO notifications (
            id, user_id, session_id, title, message, type, is_read, scheduled_for, created_at
          ) VALUES (?, ?, ?, 'Replacement Session Reassigned', ?, 'STATUS', 0, ?, CURRENT_TIMESTAMP)
        `).run(
          notifId3,
          originalSession.therapist.userId,
          replacementSessionId,
          `The replacement for missed Day ${originalSession.dayNumber} session (${originalSession.patient.user.name}) has been scheduled with ${targetTherapist.user.name} on ${sessionDate}.`,
          sessionDate
        );
      }
    });

    tx();

    return await db.query.therapySessions.findFirst({
      where: eq(therapySessions.id, replacementSessionId),
      with: {
        course: true,
        patient: { with: { user: true } },
        therapist: { with: { user: true } },
        room: true,
      },
    });
  }

  /**
   * Reassigns the therapist for a scheduled session
   */
  static async changeTherapist(params: {
    sessionId: string;
    newTherapistId: string;
    reason?: string;
    performedByUserId: string;
  }) {
    const { sessionId, newTherapistId, reason, performedByUserId } = params;

    const session = await db.query.therapySessions.findFirst({
      where: eq(therapySessions.id, sessionId),
      with: {
        course: true,
        patient: { with: { user: true } },
        therapist: { with: { user: true } },
        room: true,
      },
    });

    if (!session) throw new AppError("Session not found", 404);
    if (session.status !== "SCHEDULED") {
      throw new AppError("Can only change therapist for scheduled sessions.", 400);
    }

    const newTherapist = await db.query.therapists.findFirst({
      where: eq(therapists.id, newTherapistId),
      with: { user: true },
    });
    if (!newTherapist) throw new AppError("Therapist not found", 404);

    // Check conflict
    const availability = await this.checkCourseAvailability({
      durationDays: 1,
      startDate: session.sessionDate,
      therapistId: newTherapistId,
      roomId: session.roomId,
      sessionTime: session.startTime,
      excludeSessionId: sessionId,
    });

    if (!availability.isAvailable && availability.firstConflict?.resourceType === "THERAPIST") {
      throw new SchedulingConflictError(availability.firstConflict.message, {
        dayNumber: session.dayNumber,
        sessionDate: session.sessionDate,
        time: `${session.startTime} - ${session.endTime}`,
        resourceType: "THERAPIST",
      });
    }

    const originalValue = { therapistId: session.therapistId, therapistName: session.therapist.user.name };
    const newValue = { therapistId: newTherapistId, therapistName: newTherapist.user.name };

    const tx = sqlite.transaction(() => {
      sqlite.prepare(`
        UPDATE therapy_sessions 
        SET therapist_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newTherapistId, sessionId);

      const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO audit_logs (
          id, entity_type, entity_id, action, performed_by_user_id,
          original_value, new_value, reason, created_at
        ) VALUES (?, 'SESSION', ?, 'THERAPIST_CHANGED', ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        auditId,
        sessionId,
        performedByUserId,
        JSON.stringify(originalValue),
        JSON.stringify(newValue),
        reason || "Practitioner schedule adjustment"
      );

      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO notifications (
          id, user_id, session_id, title, message, type, is_read, scheduled_for, created_at
        ) VALUES (?, ?, ?, 'Therapist Assigned', ?, 'STATUS', 0, ?, CURRENT_TIMESTAMP)
      `).run(
        notifId,
        session.patient.userId,
        sessionId,
        `Dr. ${newTherapist.user.name} has been assigned as your practitioner for Day ${session.dayNumber} ${session.course.therapyName} on ${session.sessionDate}.`,
        session.sessionDate
      );

      // Notify previous therapist
      const notifIdOld = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO notifications (
          id, user_id, session_id, title, message, type, is_read, scheduled_for, created_at
        ) VALUES (?, ?, ?, 'Session Reassigned', ?, 'STATUS', 0, ?, CURRENT_TIMESTAMP)
      `).run(
        notifIdOld,
        session.therapist.userId,
        sessionId,
        `Your assigned Day ${session.dayNumber} session for ${session.patient.user.name} on ${session.sessionDate} has been reassigned to Dr. ${newTherapist.user.name}.`,
        session.sessionDate
      );

      // Notify new therapist
      const notifIdNew = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO notifications (
          id, user_id, session_id, title, message, type, is_read, scheduled_for, created_at
        ) VALUES (?, ?, ?, 'New Session Assignment', ?, 'ALERT', 0, ?, CURRENT_TIMESTAMP)
      `).run(
        notifIdNew,
        newTherapist.userId,
        sessionId,
        `You have been assigned to Day ${session.dayNumber} session for ${session.patient.user.name} on ${session.sessionDate} in ${session.room?.roomName || "Treatment Suite"}.`,
        session.sessionDate
      );
    });

    tx();

    return await db.query.therapySessions.findFirst({
      where: eq(therapySessions.id, sessionId),
      with: {
        course: true,
        patient: { with: { user: true } },
        therapist: { with: { user: true } },
        room: true,
      },
    });
  }

  /**
   * Reassigns the treatment suite for a scheduled session
   */
  static async changeRoom(params: {
    sessionId: string;
    newRoomId: string;
    reason?: string;
    performedByUserId: string;
  }) {
    const { sessionId, newRoomId, reason, performedByUserId } = params;

    const session = await db.query.therapySessions.findFirst({
      where: eq(therapySessions.id, sessionId),
      with: {
        course: true,
        room: true,
      },
    });

    if (!session) throw new AppError("Session not found", 404);
    if (session.status !== "SCHEDULED") {
      throw new AppError("Can only change treatment suite for scheduled sessions.", 400);
    }

    const newRoom = await db.query.treatmentRooms.findFirst({
      where: eq(treatmentRooms.id, newRoomId),
    });
    if (!newRoom) throw new AppError("Treatment room not found", 404);
    if (newRoom.status !== "ACTIVE") {
      throw new AppError(`Treatment Suite "${newRoom.roomName}" is currently INACTIVE.`, 400);
    }

    // Check conflict
    const availability = await this.checkCourseAvailability({
      durationDays: 1,
      startDate: session.sessionDate,
      therapistId: session.therapistId,
      roomId: newRoomId,
      sessionTime: session.startTime,
      excludeSessionId: sessionId,
    });

    if (!availability.isAvailable && availability.firstConflict?.resourceType === "ROOM") {
      throw new SchedulingConflictError(availability.firstConflict.message, {
        dayNumber: session.dayNumber,
        sessionDate: session.sessionDate,
        time: `${session.startTime} - ${session.endTime}`,
        resourceType: "ROOM",
      });
    }

    const originalValue = { roomId: session.roomId, roomName: session.room.roomName };
    const newValue = { roomId: newRoomId, roomName: newRoom.roomName };

    const tx = sqlite.transaction(() => {
      sqlite.prepare(`
        UPDATE therapy_sessions 
        SET room_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newRoomId, sessionId);

      const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO audit_logs (
          id, entity_type, entity_id, action, performed_by_user_id,
          original_value, new_value, reason, created_at
        ) VALUES (?, 'SESSION', ?, 'ROOM_CHANGED', ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        auditId,
        sessionId,
        performedByUserId,
        JSON.stringify(originalValue),
        JSON.stringify(newValue),
        reason || "Treatment suite adjustment"
      );
    });

    tx();

    return await db.query.therapySessions.findFirst({
      where: eq(therapySessions.id, sessionId),
      with: {
        course: true,
        patient: { with: { user: true } },
        therapist: { with: { user: true } },
        room: true,
      },
    });
  }

  /**
   * Pauses an active therapy course without deleting sessions or notes
   */
  static async pauseCourse(courseId: string, performedByUserId: string, reason?: string) {
    const course = await db.query.therapyCourses.findFirst({
      where: eq(therapyCourses.id, courseId),
      with: { patient: { with: { user: true } } },
    });

    if (!course) throw new AppError("Therapy course not found", 404);
    if (course.status !== "ACTIVE") {
      throw new AppError(`Cannot pause a course with status "${course.status}".`, 400);
    }

    const nowIso = new Date().toISOString();

    const tx = sqlite.transaction(() => {
      sqlite.prepare(`
        UPDATE therapy_courses 
        SET status = 'PAUSED', paused_at = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `).run(nowIso, courseId);

      const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO audit_logs (
          id, entity_type, entity_id, action, performed_by_user_id,
          original_value, new_value, reason, created_at
        ) VALUES (?, 'COURSE', ?, 'COURSE_PAUSED', ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        auditId,
        courseId,
        performedByUserId,
        JSON.stringify({ status: "ACTIVE" }),
        JSON.stringify({ status: "PAUSED", pausedAt: nowIso }),
        reason || "Course paused by clinical director"
      );

      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO notifications (
          id, user_id, title, message, type, is_read, created_at
        ) VALUES (?, ?, 'Course Paused', ?, 'ALERT', 0, CURRENT_TIMESTAMP)
      `).run(
        notifId,
        course.patient.userId,
        `Your ${course.therapyName} course has been paused. Please contact your doctor for resumption details.`
      );
    });

    tx();

    return await db.query.therapyCourses.findFirst({
      where: eq(therapyCourses.id, courseId),
      with: {
        patient: { with: { user: true } },
        sessions: {
          with: {
            therapist: { with: { user: true } },
            room: true,
          },
        },
      },
    });
  }

  /**
   * Resumes a paused therapy course with atomic conflict revalidation & schedule shifting
   */
  static async resumeCourse(
    courseId: string,
    performedByUserId: string,
    paramsOrReason?: string | { resumeStartDate?: string; reason?: string }
  ) {
    const course = await db.query.therapyCourses.findFirst({
      where: eq(therapyCourses.id, courseId),
      with: {
        patient: { with: { user: true } },
        sessions: {
          orderBy: (sessions, { asc }) => [asc(sessions.dayNumber)],
        },
      },
    });

    if (!course) throw new AppError("Therapy course not found", 404);
    if (course.status !== "PAUSED") {
      throw new AppError(`Cannot resume a course with status "${course.status}".`, 400);
    }

    const resumeStartDate = typeof paramsOrReason === "object" ? paramsOrReason?.resumeStartDate : undefined;
    const reason = typeof paramsOrReason === "string" ? paramsOrReason : paramsOrReason?.reason || "Course resumed";

    const scheduledSessions = course.sessions.filter((s) => s.status === "SCHEDULED");

    const tx = sqlite.transaction(() => {
      // If resumeStartDate is specified, compute date shift and revalidate all future sessions
      if (resumeStartDate && scheduledSessions.length > 0) {
        const earliestScheduled = scheduledSessions[0];
        const originalDate = parseISO(earliestScheduled.sessionDate);
        const newStartDate = parseISO(resumeStartDate);

        if (isNaN(newStartDate.getTime())) {
          throw new SchedulingConflictError("Invalid resume start date format. Expected YYYY-MM-DD.", {
            code: "INVALID_RESUME_DATE",
          });
        }

        const dayOffset = differenceInCalendarDays(newStartDate, originalDate);

        // Pre-validate all shifted sessions for conflicts before executing any writes
        for (const session of scheduledSessions) {
          const shiftedDate = format(addDays(parseISO(session.sessionDate), dayOffset), "yyyy-MM-dd");

          // Room active & procedure compatibility check
          const roomRecord = sqlite.prepare(`SELECT * FROM treatment_rooms WHERE id = ?`).get(session.roomId) as any;
          if (!roomRecord || roomRecord.status !== "ACTIVE") {
            throw new SchedulingConflictError(`Treatment Suite is inactive on Day ${session.dayNumber}.`, {
              code: "ROOM_INACTIVE",
              dayNumber: session.dayNumber,
              sessionDate: shiftedDate,
              resourceType: "ROOM",
              resourceId: session.roomId,
            });
          }

          if (session.procedure) {
            const procCompat = sqlite
              .prepare(`SELECT room_id FROM procedure_room_compatibility WHERE procedure_name = ?`)
              .all(session.procedure) as Array<{ room_id: string }>;

            if (procCompat.length > 0 && !procCompat.some((p) => p.room_id === session.roomId)) {
              throw new SchedulingConflictError(
                `Suite ${roomRecord.room_name} is incompatible with procedure ${session.procedure} on shifted Day ${session.dayNumber}.`,
                {
                  code: "ROOM_PROCEDURE_INCOMPATIBLE",
                  dayNumber: session.dayNumber,
                  sessionDate: shiftedDate,
                  resourceType: "ROOM",
                  resourceId: session.roomId,
                }
              );
            }
          }

          // Therapist schedule availability & leave check
          const leave = sqlite
            .prepare(`SELECT id FROM therapist_leaves WHERE therapist_id = ? AND start_date <= ? AND end_date >= ? LIMIT 1`)
            .get(session.therapistId, shiftedDate, shiftedDate);
          if (leave) {
            throw new SchedulingConflictError(
              `Therapist is on approved leave on shifted Day ${session.dayNumber} (${shiftedDate}).`,
              {
                code: "THERAPIST_UNAVAILABLE",
                dayNumber: session.dayNumber,
                sessionDate: shiftedDate,
                resourceType: "THERAPIST",
                resourceId: session.therapistId,
              }
            );
          }

          // Therapist double booking check on shifted date
          const thpConflict = sqlite
            .prepare(`
              SELECT s.id FROM therapy_sessions s
              WHERE s.therapist_id = ? AND s.session_date = ? AND s.status != 'CANCELLED'
                AND s.id != ? AND ((s.start_time < ? AND s.end_time > ?))
              LIMIT 1
            `)
            .get(session.therapistId, shiftedDate, session.id, session.endTime, session.startTime);

          if (thpConflict) {
            throw new SchedulingConflictError(
              `Therapist schedule conflict on shifted Day ${session.dayNumber} (${shiftedDate}).`,
              {
                code: "COURSE_CONFLICT",
                dayNumber: session.dayNumber,
                sessionDate: shiftedDate,
                resourceType: "THERAPIST",
                resourceId: session.therapistId,
              }
            );
          }

          // Room double booking check on shifted date
          const roomConflict = sqlite
            .prepare(`
              SELECT s.id FROM therapy_sessions s
              WHERE s.room_id = ? AND s.session_date = ? AND s.status != 'CANCELLED'
                AND s.id != ? AND ((s.start_time < ? AND s.end_time > ?))
              LIMIT 1
            `)
            .get(session.roomId, shiftedDate, session.id, session.endTime, session.startTime);

          if (roomConflict) {
            throw new SchedulingConflictError(
              `Treatment Room booking conflict on shifted Day ${session.dayNumber} (${shiftedDate}).`,
              {
                code: "COURSE_CONFLICT",
                dayNumber: session.dayNumber,
                sessionDate: shiftedDate,
                resourceType: "ROOM",
                resourceId: session.roomId,
              }
            );
          }

          // Update session with shifted date
          sqlite
            .prepare(`UPDATE therapy_sessions SET session_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
            .run(shiftedDate, session.id);
        }
      }

      // Mark Course ACTIVE and clear paused_at
      sqlite
        .prepare(`UPDATE therapy_courses SET status = 'ACTIVE', paused_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(courseId);

      const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO audit_logs (
          id, entity_type, entity_id, action, performed_by_user_id,
          original_value, new_value, reason, created_at
        ) VALUES (?, 'COURSE', ?, 'COURSE_RESUMED', ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        auditId,
        courseId,
        performedByUserId,
        JSON.stringify({ status: "PAUSED", pausedAt: course.pausedAt }),
        JSON.stringify({ status: "ACTIVE", resumeStartDate: resumeStartDate || null }),
        reason
      );

      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO notifications (
          id, user_id, title, message, type, is_read, created_at
        ) VALUES (?, ?, 'Course Resumed', ?, 'STATUS', 0, CURRENT_TIMESTAMP)
      `).run(
        notifId,
        course.patient.userId,
        `Your ${course.therapyName} course has been resumed. Your daily schedule is active.`
      );
    });

    tx();

    return await db.query.therapyCourses.findFirst({
      where: eq(therapyCourses.id, courseId),
      with: {
        patient: { with: { user: true } },
        sessions: {
          with: {
            therapist: { with: { user: true } },
            room: true,
          },
          orderBy: (sessions, { asc }) => [asc(sessions.dayNumber)],
        },
      },
    });
  }

  /**
   * Checks whether a course has completed all sessions and resolved all missed sessions,
   * transitioning it to COMPLETED automatically.
   */
  static checkAndAutoCompleteCourse(courseId: string, performedByUserId: string): boolean {
    const course = sqlite.prepare(`SELECT status FROM therapy_courses WHERE id = ?`).get(courseId) as any;
    if (!course || course.status !== "ACTIVE") return false;

    // Check remaining SCHEDULED sessions
    const scheduledCount = sqlite
      .prepare(`SELECT count(*) as count FROM therapy_sessions WHERE course_id = ? AND status = 'SCHEDULED'`)
      .get(courseId) as { count: number };

    if (scheduledCount.count > 0) return false;

    // Check all MISSED sessions
    const missedSessions = sqlite
      .prepare(`SELECT id FROM therapy_sessions WHERE course_id = ? AND status = 'MISSED'`)
      .all(courseId) as Array<{ id: string }>;

    for (const missed of missedSessions) {
      // Check if a replacement session exists and is COMPLETED
      const replacement = sqlite
        .prepare(`SELECT id, status FROM therapy_sessions WHERE replacement_for_session_id = ?`)
        .get(missed.id) as { id: string; status: string } | undefined;

      if (replacement) {
        if (replacement.status !== "COMPLETED") {
          return false; // Replacement is scheduled/missed/cancelled, not yet finished
        }
      } else {
        // Check if there was a replacement request that was resolved or declined
        const request = sqlite
          .prepare(`SELECT id, status FROM session_requests WHERE session_id = ? AND request_type = 'REPLACEMENT'`)
          .get(missed.id) as { id: string; status: string } | undefined;

        // If request is pending or no resolution, cannot auto-complete
        if (request && request.status === "PENDING") {
          return false;
        }
      }
    }

    // Auto-complete course
    sqlite
      .prepare(`UPDATE therapy_courses SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(courseId);

    const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    sqlite.prepare(`
      INSERT INTO audit_logs (
        id, entity_type, entity_id, action, performed_by_user_id,
        original_value, new_value, reason, created_at
      ) VALUES (?, 'COURSE', ?, 'COURSE_COMPLETED', ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      auditId,
      courseId,
      performedByUserId,
      JSON.stringify({ status: "ACTIVE" }),
      JSON.stringify({ status: "COMPLETED" }),
      "All course therapy sessions completed and missed sessions resolved"
    );

    return true;
  }

  /**
   * Retrieves audit logs for a session or course
   */
  static async getAuditLogs(entityType: "SESSION" | "COURSE", entityId: string) {
    const logs = await db.query.auditLogs.findMany({
      where: and(
        eq(auditLogs.entityType, entityType),
        eq(auditLogs.entityId, entityId)
      ),
      with: {
        performedByUser: {
          columns: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: (logs, { desc }) => [desc(logs.createdAt)],
    });

    return logs;
  }

  /**
   * Retrieves requests based on role and optional filters
   */
  static async getRequests(params: {
    role: "ADMIN" | "THERAPIST" | "PATIENT";
    userId: string;
    patientId?: string;
    therapistId?: string;
    status?: string;
  }) {
    const { role, userId, patientId, therapistId, status } = params;

    let whereClause: any = undefined;
    if (role === "PATIENT") {
      whereClause = patientId ? eq(sessionRequests.patientId, patientId) : eq(sessionRequests.requestedByUserId, userId);
    } else if (role === "THERAPIST") {
      whereClause = therapistId ? eq(sessionRequests.therapistId, therapistId) : eq(sessionRequests.requestedByUserId, userId);
    }

    if (status) {
      whereClause = whereClause ? and(whereClause, eq(sessionRequests.status, status as any)) : eq(sessionRequests.status, status as any);
    }

    const requests = await db.query.sessionRequests.findMany({
      where: whereClause,
      with: {
        session: {
          with: {
            room: true,
            therapist: { with: { user: true } },
            course: true,
          },
        },
        course: true,
        patient: { with: { user: true } },
        therapist: { with: { user: true } },
        requestedByUser: {
          columns: { id: true, name: true, email: true, role: true },
        },
        resolvedByUser: {
          columns: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: [desc(sessionRequests.createdAt)],
    });

    return requests;
  }

  /**
   * Approves a reschedule, cancellation, or replacement request and executes the change atomically
   */
  static async approveRequest(params: {
    requestId: string;
    sessionDate?: string;
    startTime?: string;
    therapistId?: string;
    roomId?: string;
    notes?: string;
    performedByUserId: string;
  }) {
    const { requestId, sessionDate, startTime, therapistId, roomId, notes, performedByUserId } = params;

    const request = await db.query.sessionRequests.findFirst({
      where: eq(sessionRequests.id, requestId),
      with: {
        session: {
          with: {
            course: true,
            patient: { with: { user: true } },
            therapist: { with: { user: true } },
            room: true,
          },
        },
        course: true,
        patient: { with: { user: true } },
        therapist: { with: { user: true } },
        requestedByUser: true,
      },
    });

    if (!request) throw new AppError("Request not found", 404);
    if (request.status !== "PENDING") {
      throw new AppError(`Request has already been processed with status "${request.status}".`, 400);
    }

    let resultSession: any = null;
    const nowStr = format(new Date(), "yyyy-MM-dd HH:mm:ss");

    if (request.requestType === "RESCHEDULE") {
      const targetDate = sessionDate || request.preferredDate || request.session.sessionDate;
      const targetTime = startTime || request.preferredTime || request.session.startTime;
      const targetTherapistId = therapistId || request.session.therapistId;
      const targetRoomId = roomId || request.session.roomId;

      resultSession = await this.rescheduleSession({
        sessionId: request.sessionId,
        sessionDate: targetDate,
        startTime: targetTime,
        therapistId: targetTherapistId,
        roomId: targetRoomId,
        reason: `Approved request: ${request.reason}${notes ? ` (Admin notes: ${notes})` : ""}`,
        performedByUserId,
      });
    } else if (request.requestType === "CANCEL") {
      resultSession = await this.cancelSession({
        sessionId: request.sessionId,
        reason: `Approved cancellation: ${request.reason}${notes ? ` (Admin notes: ${notes})` : ""}`,
        performedByUserId,
      });
    } else if (request.requestType === "REPLACEMENT") {
      const targetDate = sessionDate || request.preferredDate;
      const targetTime = startTime || request.preferredTime || request.session.startTime;
      if (!targetDate) {
        throw new AppError("Session date is required to schedule a replacement session.", 400);
      }
      const targetTherapistId = therapistId || request.session.therapistId;
      const targetRoomId = roomId || request.session.roomId;

      resultSession = await this.createReplacementSession({
        courseId: request.courseId,
        originalSessionId: request.sessionId,
        sessionDate: targetDate,
        startTime: targetTime,
        therapistId: targetTherapistId,
        roomId: targetRoomId,
        reason: `Approved replacement: ${request.reason}${notes ? ` (Admin notes: ${notes})` : ""}`,
        performedByUserId,
      });
    }

    // Mark Request Approved
    sqlite.prepare(`
      UPDATE session_requests 
      SET status = 'APPROVED', admin_notes = ?, resolved_by_user_id = ?, resolved_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(notes || null, performedByUserId, nowStr, requestId);

    // Record Audit Log for Request Approval
    const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    sqlite.prepare(`
      INSERT INTO audit_logs (
        id, entity_type, entity_id, action, performed_by_user_id,
        original_value, new_value, reason, created_at
      ) VALUES (?, 'SESSION', ?, 'REQUEST_APPROVED', ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
      auditId,
      request.sessionId,
      performedByUserId,
      JSON.stringify({ requestId, requestType: request.requestType, status: "PENDING" }),
      JSON.stringify({ requestId, requestType: request.requestType, status: "APPROVED", notes }),
      notes || `Admin approved ${request.requestType.toLowerCase()} request`
    );

    return {
      success: true,
      message: `${request.requestType} request approved and schedule updated successfully.`,
      session: resultSession,
    };
  }

  /**
   * Rejects a reschedule, cancellation, or replacement request with mandatory reason
   */
  static async rejectRequest(params: {
    requestId: string;
    reason: string;
    performedByUserId: string;
  }) {
    const { requestId, reason, performedByUserId } = params;

    const request = await db.query.sessionRequests.findFirst({
      where: eq(sessionRequests.id, requestId),
      with: {
        session: {
          with: {
            course: true,
            patient: { with: { user: true } },
            therapist: { with: { user: true } },
            room: true,
          },
        },
        requestedByUser: true,
      },
    });

    if (!request) throw new AppError("Request not found", 404);
    if (request.status !== "PENDING") {
      throw new AppError(`Request has already been processed with status "${request.status}".`, 400);
    }

    const nowStr = format(new Date(), "yyyy-MM-dd HH:mm:ss");

    const tx = sqlite.transaction(() => {
      sqlite.prepare(`
        UPDATE session_requests 
        SET status = 'REJECTED', admin_notes = ?, resolved_by_user_id = ?, resolved_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(reason, performedByUserId, nowStr, requestId);

      // Record Audit Log
      const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO audit_logs (
          id, entity_type, entity_id, action, performed_by_user_id,
          original_value, new_value, reason, created_at
        ) VALUES (?, 'SESSION', ?, 'REQUEST_REJECTED', ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        auditId,
        request.sessionId,
        performedByUserId,
        JSON.stringify({ requestId, requestType: request.requestType, status: "PENDING" }),
        JSON.stringify({ requestId, requestType: request.requestType, status: "REJECTED", reason }),
        reason
      );

      // Notify Requester
      const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const reqTypeLabel = request.requestType === "RESCHEDULE" 
        ? "reschedule" 
        : request.requestType === "CANCEL" 
          ? "cancellation" 
          : "replacement";

      const originalInfo = request.session.status === "MISSED"
        ? `Your original session remains: MISSED on ${request.session.sessionDate}.`
        : `Your original session remains scheduled for ${request.session.sessionDate} at ${formatToDisplayTime(request.session.startTime)}.`;

      sqlite.prepare(`
        INSERT INTO notifications (
          id, user_id, session_id, title, message, type, is_read, created_at
        ) VALUES (?, ?, ?, ?, ?, 'ALERT', 0, CURRENT_TIMESTAMP)
      `).run(
        notifId,
        request.requestedByUserId,
        request.sessionId,
        `Request Rejected: ${request.session.course.therapyName}`,
        `Your request to ${reqTypeLabel} the ${request.session.course.therapyName} session (Day ${request.session.dayNumber}) was not approved. Reason: ${reason}. ${originalInfo}`
      );
    });

    tx();

    return {
      success: true,
      message: "Request rejected and requester notified.",
    };
  }
}

