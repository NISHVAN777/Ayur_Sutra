import { Request, Response, NextFunction } from "express";
import { db, sqlite } from "../db/index.js";
import { therapyCourses, therapySessions, treatmentRooms, therapists, patients, users } from "../db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { SchedulingService } from "../services/scheduling.service.js";
import { AppError } from "../middleware/errorHandler.js";

export async function getAllCourses(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, patientId } = req.query;

    let whereClause: any = undefined;
    if (status && patientId) {
      whereClause = and(eq(therapyCourses.status, status as any), eq(therapyCourses.patientId, patientId as string));
    } else if (status) {
      whereClause = eq(therapyCourses.status, status as any);
    } else if (patientId) {
      whereClause = eq(therapyCourses.patientId, patientId as string);
    }

    const courses = await db.query.therapyCourses.findMany({
      where: whereClause,
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
      orderBy: (courses, { desc }) => [desc(courses.createdAt)],
    });

    const enriched = courses.map((course) => {
      const completedSessions = course.sessions.filter((s) => s.status === "COMPLETED").length;
      const totalSessions = course.durationDays;
      const progressPercentage = Math.round((completedSessions / totalSessions) * 100);
      const nextSession = course.sessions.find((s) => s.status === "SCHEDULED");
      const primaryTherapist = course.sessions[0]?.therapist?.user.name || "Assigned Practitioner";
      const primaryRoom = course.sessions[0]?.room?.roomName || "Treatment Suite";

      return {
        ...course,
        patientName: course.patient.user.name,
        primaryTherapist,
        primaryRoom,
        stats: {
          totalSessions,
          completedSessions,
          progressPercentage,
        },
        nextSession,
      };
    });

    res.json({
      success: true,
      count: enriched.length,
      courses: enriched,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCourseById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const course = await db.query.therapyCourses.findFirst({
      where: eq(therapyCourses.id, id),
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

    if (!course) throw new AppError("Therapy course not found", 404);

    if (req.user?.role === "PATIENT" && course.patientId !== req.user.patientId) {
      throw new AppError("Access denied to another patient's therapy course.", 403);
    }

    const completedSessions = course.sessions.filter((s) => s.status === "COMPLETED").length;
    const totalSessions = course.durationDays;
    const progressPercentage = Math.round((completedSessions / totalSessions) * 100);
    const nextSession = course.sessions.find((s) => s.status === "SCHEDULED");

    res.json({
      success: true,
      course: {
        ...course,
        patientName: course.patient.user.name,
        stats: {
          totalSessions,
          completedSessions,
          progressPercentage,
        },
        nextSession,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function checkAvailability(req: Request, res: Response, next: NextFunction) {
  try {
    const { durationDays, startDate, therapistId, roomId, sessionTime, excludeSessionId } = req.body;

    const result = await SchedulingService.checkCourseAvailability({
      durationDays: Number(durationDays),
      startDate,
      therapistId,
      roomId,
      sessionTime,
      excludeSessionId,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function createCourse(req: Request, res: Response, next: NextFunction) {
  try {
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
    } = req.body;

    const course = await SchedulingService.createCourse({
      patientId,
      therapyName,
      description,
      durationDays: Number(durationDays),
      startDate,
      therapistId,
      roomId,
      defaultSessionTime,
      plan,
      performedByUserId: req.user!.userId,
    });

    res.status(201).json({
      success: true,
      message: `Successfully scheduled ${durationDays}-day ${therapyName} course.`,
      course,
    });
  } catch (error) {
    next(error);
  }
}

export async function pauseCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const performedByUserId = req.user!.userId;

    const updatedCourse = await SchedulingService.pauseCourse(id, performedByUserId, reason);

    res.json({
      success: true,
      message: "Therapy course paused successfully.",
      course: updatedCourse,
    });
  } catch (error) {
    next(error);
  }
}

export async function resumeCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { reason, resumeStartDate } = req.body;
    const performedByUserId = req.user!.userId;

    const updatedCourse = await SchedulingService.resumeCourse(id, performedByUserId, { resumeStartDate, reason });

    res.json({
      success: true,
      message: "Therapy course resumed successfully.",
      course: updatedCourse,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const course = await db.query.therapyCourses.findFirst({
      where: eq(therapyCourses.id, id),
    });

    if (!course) throw new AppError("Therapy course not found", 404);

    sqlite.transaction(() => {
      sqlite.prepare("UPDATE therapy_courses SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(id);
      sqlite.prepare("UPDATE therapy_sessions SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE course_id = ? AND status = 'SCHEDULED'").run(id);
    })();

    res.json({
      success: true,
      message: "Course and remaining scheduled sessions cancelled successfully.",
    });
  } catch (error) {
    next(error);
  }
}
