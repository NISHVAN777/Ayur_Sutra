import { Request, Response, NextFunction } from "express";
import { db, sqlite } from "../db/index.js";
import { therapySessions, therapyCourses, auditLogs, sessionRequests } from "../db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { SchedulingService } from "../services/scheduling.service.js";
import { AppError } from "../middleware/errorHandler.js";
import { format } from "date-fns";
import { formatToDisplayTime } from "../utils/dateUtils.js";

export async function getSessionById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const session = await db.query.therapySessions.findFirst({
      where: eq(therapySessions.id, id),
      with: {
        course: true,
        patient: { with: { user: true } },
        therapist: { with: { user: true } },
        room: true,
      },
    });

    if (!session) throw new AppError("Session not found", 404);

    // Patient access check
    if (req.user?.role === "PATIENT" && session.patientId !== req.user.patientId) {
      throw new AppError("Access denied to another patient's session.", 403);
    }

    res.json({ success: true, session });
  } catch (error) {
    next(error);
  }
}

export async function completeSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { 
      treatmentNotes, 
      bloodPressure, 
      pulseRate, 
      temperature, 
      weight, 
      symptomScore, 
      pathya, 
      apathya, 
      lifestyleInstructions 
    } = req.body;
    const userId = req.user!.userId;

    const session = await db.query.therapySessions.findFirst({
      where: eq(therapySessions.id, id),
      with: { course: true },
    });

    if (!session) throw new AppError("Session not found", 404);
    if (session.status === "COMPLETED") {
      throw new AppError("Session is already completed", 400);
    }

    if (req.user?.role === "THERAPIST" && session.therapistId !== req.user.therapistId) {
      throw new AppError("Access denied: You can only complete your own assigned therapy sessions.", 403);
    }

    const now = format(new Date(), "yyyy-MM-dd HH:mm:ss");

    const tx = sqlite.transaction(() => {
      // Update session status, vitals, lifestyle, and treatment notes
      sqlite.prepare(`
        UPDATE therapy_sessions 
        SET status = 'COMPLETED',
            treatment_notes = COALESCE(?, treatment_notes),
            blood_pressure = COALESCE(?, blood_pressure),
            pulse_rate = COALESCE(?, pulse_rate),
            temperature = COALESCE(?, temperature),
            weight = COALESCE(?, weight),
            symptom_score = COALESCE(?, symptom_score),
            pathya = COALESCE(?, pathya),
            apathya = COALESCE(?, apathya),
            lifestyle_instructions = COALESCE(?, lifestyle_instructions),
            completed_at = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        treatmentNotes || null,
        bloodPressure || null,
        pulseRate ?? null,
        temperature ?? null,
        weight ?? null,
        symptomScore ?? null,
        pathya || null,
        apathya || null,
        lifestyleInstructions || null,
        now,
        id
      );

      // Check auto-completion of course
      SchedulingService.checkAndAutoCompleteCourse(session.courseId, userId);
    });

    tx();

    const updatedSession = await db.query.therapySessions.findFirst({
      where: eq(therapySessions.id, id),
      with: {
        course: true,
        patient: { with: { user: true } },
        therapist: { with: { user: true } },
        room: true,
      },
    });

    res.json({
      success: true,
      message: "Session completed and clinical observations recorded successfully.",
      session: updatedSession,
    });
  } catch (error) {
    next(error);
  }
}

export async function markSessionMissed(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const session = await db.query.therapySessions.findFirst({
      where: eq(therapySessions.id, id),
      with: {
        course: true,
        patient: { with: { user: true } },
        therapist: { with: { user: true } },
        room: true,
      },
    });

    if (!session) throw new AppError("Session not found", 404);
    if (session.status === "COMPLETED") {
      throw new AppError("Cannot mark completed session as missed", 400);
    }

    if (req.user?.role === "THERAPIST" && session.therapistId !== req.user.therapistId) {
      throw new AppError("Access denied: You can only mark your own assigned therapy sessions as missed.", 403);
    }

    const missedReason = reason || "Patient did not attend scheduled session";

    const tx = sqlite.transaction(() => {
      sqlite.prepare(`
        UPDATE therapy_sessions
        SET status = 'MISSED', reschedule_reason = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(missedReason, id);

      // Notify Patient with option to request replacement session
      const notifId1 = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO notifications (
          id, user_id, session_id, title, message, type, is_read, scheduled_for, created_at
        ) VALUES (?, ?, ?, 'Session Missed', ?, 'ALERT', 0, ?, CURRENT_TIMESTAMP)
      `).run(
        notifId1,
        session.patient.userId,
        id,
        `Your Day ${session.dayNumber} ${session.course.therapyName} session on ${session.sessionDate} at ${formatToDisplayTime(
          session.startTime
        )} was marked as missed. Would you like to request a replacement session?`,
        session.sessionDate
      );

      // Notify Practitioner
      const notifId2 = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO notifications (
          id, user_id, session_id, title, message, type, is_read, scheduled_for, created_at
        ) VALUES (?, ?, ?, 'Session Marked Missed', ?, 'STATUS', 0, ?, CURRENT_TIMESTAMP)
      `).run(
        notifId2,
        session.therapist.userId,
        id,
        `The ${session.course.therapyName} session (Day ${session.dayNumber}) for ${session.patient.user.name} on ${session.sessionDate} was marked as missed. You may recommend a replacement session for Admin review.`,
        session.sessionDate
      );
    });

    tx();

    res.json({
      success: true,
      message: "Session marked as missed. Notifications sent for replacement scheduling.",
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSessionNotes(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { 
      treatmentNotes, 
      bloodPressure, 
      pulseRate, 
      temperature, 
      weight, 
      symptomScore, 
      pathya, 
      apathya, 
      lifestyleInstructions 
    } = req.body;

    const session = await db.query.therapySessions.findFirst({
      where: eq(therapySessions.id, id),
    });

    if (!session) throw new AppError("Session not found", 404);

    if (req.user?.role === "THERAPIST" && session.therapistId !== req.user.therapistId) {
      throw new AppError("Access denied: You can only update notes for your own assigned therapy sessions.", 403);
    }

    sqlite.prepare(`
      UPDATE therapy_sessions
      SET treatment_notes = COALESCE(?, treatment_notes),
          blood_pressure = COALESCE(?, blood_pressure),
          pulse_rate = COALESCE(?, pulse_rate),
          temperature = COALESCE(?, temperature),
          weight = COALESCE(?, weight),
          symptom_score = COALESCE(?, symptom_score),
          pathya = COALESCE(?, pathya),
          apathya = COALESCE(?, apathya),
          lifestyle_instructions = COALESCE(?, lifestyle_instructions),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      treatmentNotes || null,
      bloodPressure || null,
      pulseRate ?? null,
      temperature ?? null,
      weight ?? null,
      symptomScore ?? null,
      pathya || null,
      apathya || null,
      lifestyleInstructions || null,
      id
    );

    const updatedSession = await db.query.therapySessions.findFirst({
      where: eq(therapySessions.id, id),
      with: {
        course: true,
        patient: { with: { user: true } },
        therapist: { with: { user: true } },
        room: true,
      },
    });

    res.json({
      success: true,
      message: "Treatment notes and observations updated successfully.",
      session: updatedSession,
    });
  } catch (error) {
    next(error);
  }
}

export async function rescheduleSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { sessionDate, startTime, therapistId, roomId, reason } = req.body;
    const performedByUserId = req.user!.userId;

    const updatedSession = await SchedulingService.rescheduleSession({
      sessionId: id,
      sessionDate,
      startTime,
      therapistId,
      roomId,
      reason,
      performedByUserId,
    });

    res.json({
      success: true,
      message: `Session rescheduled to ${sessionDate} at ${startTime}.`,
      session: updatedSession,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const performedByUserId = req.user!.userId;

    const cancelledSession = await SchedulingService.cancelSession({
      sessionId: id,
      reason,
      performedByUserId,
    });

    res.json({
      success: true,
      message: "Session successfully cancelled.",
      session: cancelledSession,
    });
  } catch (error) {
    next(error);
  }
}

export async function changeTherapist(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { therapistId, reason } = req.body;
    const performedByUserId = req.user!.userId;

    const updatedSession = await SchedulingService.changeTherapist({
      sessionId: id,
      newTherapistId: therapistId,
      reason,
      performedByUserId,
    });

    res.json({
      success: true,
      message: "Therapist updated successfully.",
      session: updatedSession,
    });
  } catch (error) {
    next(error);
  }
}

export async function changeRoom(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { roomId, reason } = req.body;
    const performedByUserId = req.user!.userId;

    const updatedSession = await SchedulingService.changeRoom({
      sessionId: id,
      newRoomId: roomId,
      reason,
      performedByUserId,
    });

    res.json({
      success: true,
      message: "Treatment suite updated successfully.",
      session: updatedSession,
    });
  } catch (error) {
    next(error);
  }
}

export async function getSessionAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const logs = await SchedulingService.getAuditLogs("SESSION", id);

    res.json({
      success: true,
      count: logs.length,
      auditLogs: logs,
    });
  } catch (error) {
    next(error);
  }
}

export async function requestRescheduleSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { reason, preferredDate, preferredTime } = req.body;
    const user = req.user!;

    const session = await db.query.therapySessions.findFirst({
      where: eq(therapySessions.id, id),
      with: {
        course: true,
        patient: { with: { user: true } },
        therapist: { with: { user: true } },
        room: true,
      },
    });

    if (!session) throw new AppError("Session not found", 404);

    if (session.status === "COMPLETED") {
      throw new AppError("Cannot request reschedule for an already completed session", 400);
    }
    if (session.status === "CANCELLED") {
      throw new AppError("Cannot request reschedule for a cancelled session", 400);
    }

    if (user.role === "PATIENT" && session.patientId !== user.patientId) {
      throw new AppError("Access denied: You can only request reschedule for your own therapy sessions.", 403);
    }
    if (user.role === "THERAPIST" && session.therapistId !== user.therapistId) {
      throw new AppError("Access denied: You can only request reschedule for your own assigned therapy sessions.", 403);
    }

    // Duplicate Pending Request Protection
    const existingPending = sqlite.prepare(`
      SELECT id FROM session_requests 
      WHERE session_id = ? AND request_type = 'RESCHEDULE' AND status = 'PENDING'
    `).get(id);

    if (existingPending) {
      throw new AppError("A pending RESCHEDULE request already exists for this session.", 400);
    }

    const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const tx = sqlite.transaction(() => {
      // Insert Session Request
      sqlite.prepare(`
        INSERT INTO session_requests (
          id, session_id, course_id, patient_id, therapist_id, requested_by_user_id,
          requested_by_role, request_type, status, reason, preferred_date, preferred_time,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'RESCHEDULE', 'PENDING', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        reqId,
        id,
        session.courseId,
        session.patientId,
        session.therapistId,
        user.userId,
        user.role,
        reason,
        preferredDate || null,
        preferredTime || null
      );

      // Record Audit Log
      const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO audit_logs (
          id, entity_type, entity_id, action, performed_by_user_id,
          original_value, new_value, reason, created_at
        ) VALUES (?, 'SESSION', ?, 'SESSION_RESCHEDULE_REQUESTED', ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        auditId,
        id,
        user.userId,
        JSON.stringify({
          sessionDate: session.sessionDate,
          startTime: session.startTime,
          therapistId: session.therapistId,
          roomId: session.roomId,
        }),
        JSON.stringify({
          requestId: reqId,
          preferredDate: preferredDate || null,
          preferredTime: preferredTime || null,
          requestedByRole: user.role,
          requestedByName: user.name,
        }),
        reason
      );

      // Create Admin Notifications
      const admins = sqlite.prepare(`SELECT id FROM users WHERE role = 'ADMIN'`).all() as { id: string }[];
      const adminNotifStmt = sqlite.prepare(`
        INSERT INTO notifications (
          id, user_id, session_id, title, message, type, is_read, created_at
        ) VALUES (?, ?, ?, 'Reschedule Request Received', ?, 'ALERT', 0, CURRENT_TIMESTAMP)
      `);

      const prefInfo = preferredDate ? ` (Preferred: ${preferredDate}${preferredTime ? ` at ${preferredTime}` : ""})` : "";
      const notifMsg = `${user.name} (${user.role === "THERAPIST" ? "Practitioner" : "Patient"}) requested reschedule for Day ${session.dayNumber} session (${session.sessionDate}) of ${session.course.therapyName}.${prefInfo} Reason: ${reason}`;

      for (const admin of admins) {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        adminNotifStmt.run(notifId, admin.id, id, notifMsg);
      }

      // If requested by Patient, notify the patient confirming receipt
      if (user.role === "PATIENT") {
        const patNotifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        sqlite.prepare(`
          INSERT INTO notifications (
            id, user_id, session_id, title, message, type, is_read, created_at
          ) VALUES (?, ?, ?, 'Reschedule Request Submitted', ?, 'STATUS', 0, CURRENT_TIMESTAMP)
        `).run(
          patNotifId,
          user.userId,
          id,
          `Your reschedule request for Day ${session.dayNumber} ${session.course.therapyName} session has been received and is pending clinic administrative review.`
        );
      }
    });

    tx();

    res.json({
      success: true,
      message: "Reschedule request submitted successfully for administrative review.",
      requestId: reqId,
      request: {
        id: reqId,
        sessionId: id,
        courseId: session.courseId,
        patientId: session.patientId,
        therapistId: session.therapistId,
        requestType: "RESCHEDULE",
        status: "PENDING",
        requestedByRole: user.role,
        reason,
        preferredDate: preferredDate || null,
        preferredTime: preferredTime || null,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function requestCancelSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = req.user!;

    const session = await db.query.therapySessions.findFirst({
      where: eq(therapySessions.id, id),
      with: {
        course: true,
        patient: { with: { user: true } },
        therapist: { with: { user: true } },
        room: true,
      },
    });

    if (!session) throw new AppError("Session not found", 404);

    if (session.status === "COMPLETED") {
      throw new AppError("Cannot request cancellation for an already completed session", 400);
    }
    if (session.status === "CANCELLED") {
      throw new AppError("Session is already cancelled", 400);
    }

    if (user.role === "PATIENT" && session.patientId !== user.patientId) {
      throw new AppError("Access denied: You can only request cancellation for your own therapy sessions.", 403);
    }
    if (user.role === "THERAPIST" && session.therapistId !== user.therapistId) {
      throw new AppError("Access denied: You can only request cancellation for your own assigned therapy sessions.", 403);
    }

    // Duplicate Pending Request Protection
    const existingPending = sqlite.prepare(`
      SELECT id FROM session_requests 
      WHERE session_id = ? AND request_type = 'CANCEL' AND status = 'PENDING'
    `).get(id);

    if (existingPending) {
      throw new AppError("A pending CANCEL request already exists for this session.", 400);
    }

    const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const tx = sqlite.transaction(() => {
      // Insert Session Request
      sqlite.prepare(`
        INSERT INTO session_requests (
          id, session_id, course_id, patient_id, therapist_id, requested_by_user_id,
          requested_by_role, request_type, status, reason,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'CANCEL', 'PENDING', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        reqId,
        id,
        session.courseId,
        session.patientId,
        session.therapistId,
        user.userId,
        user.role,
        reason
      );

      // Record Audit Log
      const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO audit_logs (
          id, entity_type, entity_id, action, performed_by_user_id,
          original_value, new_value, reason, created_at
        ) VALUES (?, 'SESSION', ?, 'SESSION_CANCEL_REQUESTED', ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        auditId,
        id,
        user.userId,
        JSON.stringify({
          status: session.status,
          sessionDate: session.sessionDate,
        }),
        JSON.stringify({
          requestId: reqId,
          requestedAction: "CANCEL",
          requestedByRole: user.role,
          requestedByName: user.name,
        }),
        reason
      );

      // Create Admin Notifications
      const admins = sqlite.prepare(`SELECT id FROM users WHERE role = 'ADMIN'`).all() as { id: string }[];
      const adminNotifStmt = sqlite.prepare(`
        INSERT INTO notifications (
          id, user_id, session_id, title, message, type, is_read, created_at
        ) VALUES (?, ?, ?, 'Cancellation Request Received', ?, 'ALERT', 0, CURRENT_TIMESTAMP)
      `);

      const notifMsg = `${user.name} (${user.role === "THERAPIST" ? "Practitioner" : "Patient"}) requested cancellation for Day ${session.dayNumber} session (${session.sessionDate}) of ${session.course.therapyName}. Reason: ${reason}`;

      for (const admin of admins) {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        adminNotifStmt.run(notifId, admin.id, id, notifMsg);
      }

      // If requested by Patient, notify patient
      if (user.role === "PATIENT") {
        const patNotifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        sqlite.prepare(`
          INSERT INTO notifications (
            id, user_id, session_id, title, message, type, is_read, created_at
          ) VALUES (?, ?, ?, 'Cancellation Request Submitted', ?, 'STATUS', 0, CURRENT_TIMESTAMP)
        `).run(
          patNotifId,
          user.userId,
          id,
          `Your cancellation request for Day ${session.dayNumber} ${session.course.therapyName} session has been received and is pending clinic administrative review.`
        );
      }
    });

    tx();

    res.json({
      success: true,
      message: "Cancellation request submitted successfully for administrative review.",
      requestId: reqId,
      request: {
        id: reqId,
        sessionId: id,
        courseId: session.courseId,
        patientId: session.patientId,
        therapistId: session.therapistId,
        requestType: "CANCEL",
        status: "PENDING",
        requestedByRole: user.role,
        reason,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function requestReplacementSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { reason, preferredDate, preferredTime } = req.body;
    const user = req.user!;

    const session = await db.query.therapySessions.findFirst({
      where: eq(therapySessions.id, id),
      with: {
        course: true,
        patient: { with: { user: true } },
        therapist: { with: { user: true } },
        room: true,
      },
    });

    if (!session) throw new AppError("Session not found", 404);

    if (session.status !== "MISSED") {
      throw new AppError("Replacement sessions can only be requested for sessions marked as MISSED.", 400);
    }

    if (user.role === "PATIENT" && session.patientId !== user.patientId) {
      throw new AppError("Access denied: You can only request replacement for your own therapy sessions.", 403);
    }
    if (user.role === "THERAPIST" && session.therapistId !== user.therapistId) {
      throw new AppError("Access denied: You can only recommend replacement for your own assigned therapy sessions.", 403);
    }

    // Duplicate Pending Request Protection
    const existingPending = sqlite.prepare(`
      SELECT id FROM session_requests 
      WHERE session_id = ? AND request_type = 'REPLACEMENT' AND status = 'PENDING'
    `).get(id);

    if (existingPending) {
      throw new AppError("A pending REPLACEMENT request already exists for this session.", 400);
    }

    const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const tx = sqlite.transaction(() => {
      // Insert Session Request
      sqlite.prepare(`
        INSERT INTO session_requests (
          id, session_id, course_id, patient_id, therapist_id, requested_by_user_id,
          requested_by_role, request_type, status, reason, preferred_date, preferred_time,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'REPLACEMENT', 'PENDING', ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(
        reqId,
        id,
        session.courseId,
        session.patientId,
        session.therapistId,
        user.userId,
        user.role,
        reason,
        preferredDate || null,
        preferredTime || null
      );

      // Record Audit Log
      const auditId = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      sqlite.prepare(`
        INSERT INTO audit_logs (
          id, entity_type, entity_id, action, performed_by_user_id,
          original_value, new_value, reason, created_at
        ) VALUES (?, 'SESSION', ?, 'SESSION_REPLACEMENT_REQUESTED', ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        auditId,
        id,
        user.userId,
        JSON.stringify({
          status: "MISSED",
          sessionDate: session.sessionDate,
          dayNumber: session.dayNumber,
        }),
        JSON.stringify({
          requestId: reqId,
          preferredDate: preferredDate || null,
          preferredTime: preferredTime || null,
          requestedByRole: user.role,
          requestedByName: user.name,
        }),
        reason
      );

      // Create Admin Notifications
      const admins = sqlite.prepare(`SELECT id FROM users WHERE role = 'ADMIN'`).all() as { id: string }[];
      const adminNotifStmt = sqlite.prepare(`
        INSERT INTO notifications (
          id, user_id, session_id, title, message, type, is_read, created_at
        ) VALUES (?, ?, ?, 'Replacement Session Request', ?, 'ALERT', 0, CURRENT_TIMESTAMP)
      `);

      const prefInfo = preferredDate ? ` (Preferred: ${preferredDate}${preferredTime ? ` at ${preferredTime}` : ""})` : "";
      const notifMsg = `${user.name} (${user.role === "THERAPIST" ? "Practitioner" : "Patient"}) requested replacement for missed Day ${session.dayNumber} session (${session.sessionDate}) of ${session.course.therapyName}.${prefInfo} Reason: ${reason}`;

      for (const admin of admins) {
        const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        adminNotifStmt.run(notifId, admin.id, id, notifMsg);
      }

      // If requested by Patient, notify patient
      if (user.role === "PATIENT") {
        const patNotifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        sqlite.prepare(`
          INSERT INTO notifications (
            id, user_id, session_id, title, message, type, is_read, created_at
          ) VALUES (?, ?, ?, 'Replacement Request Submitted', ?, 'STATUS', 0, CURRENT_TIMESTAMP)
        `).run(
          patNotifId,
          user.userId,
          id,
          `Your request for a replacement session for Day ${session.dayNumber} ${session.course.therapyName} has been submitted for admin review.`
        );
      }
    });

    tx();

    res.json({
      success: true,
      message: "Replacement session request submitted successfully for administrative review.",
      requestId: reqId,
      request: {
        id: reqId,
        sessionId: id,
        courseId: session.courseId,
        patientId: session.patientId,
        therapistId: session.therapistId,
        requestType: "REPLACEMENT",
        status: "PENDING",
        requestedByRole: user.role,
        reason,
        preferredDate: preferredDate || null,
        preferredTime: preferredTime || null,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function declineReplacementSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const user = req.user!;

    const session = await db.query.therapySessions.findFirst({
      where: eq(therapySessions.id, id),
    });

    if (!session) throw new AppError("Session not found", 404);

    if (user.role === "PATIENT" && session.patientId !== user.patientId) {
      throw new AppError("Access denied: You can only respond to your own therapy sessions.", 403);
    }

    res.json({
      success: true,
      message: "Acknowledged. The missed session will remain in your treatment history without rescheduling.",
    });
  } catch (error) {
    next(error);
  }
}

