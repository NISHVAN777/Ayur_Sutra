import { Request, Response, NextFunction } from "express";
import { db, schema } from "../db/index.js";
import { eq, desc, asc, and, gte, sql } from "drizzle-orm";
import { format } from "date-fns";
import { AppError } from "../middleware/errorHandler.js";

export class AdminController {
  // ADMIN: Get Full Clinic Operational Dashboard Stats
  static async getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const todayStr = format(new Date(), "yyyy-MM-dd");

      // 1. Total Patients
      const totalPatients = await db.query.patients.findMany();

      // 2. Active Therapy Courses
      const activeCourses = await db.query.therapyCourses.findMany({
        where: eq(schema.therapyCourses.status, "ACTIVE"),
        with: {
          patient: { with: { user: true } },
          sessions: true,
        },
        orderBy: [desc(schema.therapyCourses.createdAt)],
      });

      // 3. Today's Sessions
      const todaySessions = await db.query.therapySessions.findMany({
        where: eq(schema.therapySessions.sessionDate, todayStr),
        with: {
          patient: { with: { user: true } },
          therapist: { with: { user: true } },
          room: true,
          course: true,
        },
        orderBy: [asc(schema.therapySessions.startTime)],
      });

      // 4. Therapists & Rooms
      const allTherapists = await db.query.therapists.findMany({
        with: { user: true },
      });

      const allRooms = await db.query.treatmentRooms.findMany({
        where: eq(schema.treatmentRooms.status, "ACTIVE"),
      });

      // 5. Total Completed Sessions all time
      const allCompletedSessions = await db.query.therapySessions.findMany({
        where: eq(schema.therapySessions.status, "COMPLETED"),
      });

      // 6. Upcoming Sessions (Next 7 days)
      const upcomingSessions = await db.query.therapySessions.findMany({
        where: and(
          gte(schema.therapySessions.sessionDate, todayStr),
          eq(schema.therapySessions.status, "SCHEDULED")
        ),
        with: {
          patient: { with: { user: true } },
          therapist: { with: { user: true } },
          room: true,
          course: true,
        },
        orderBy: [asc(schema.therapySessions.sessionDate), asc(schema.therapySessions.startTime)],
        limit: 10,
      });

      // 7. Recent Notifications / Activity
      const recentActivity = await db.query.notifications.findMany({
        orderBy: [desc(schema.notifications.createdAt)],
        limit: 8,
      });

      res.json({
        success: true,
        date: todayStr,
        stats: {
          totalPatients: totalPatients.length,
          activeCourses: activeCourses.length,
          todaySessionsCount: todaySessions.length,
          availableTherapistsCount: allTherapists.length,
          availableRoomsCount: allRooms.length,
          totalCompletedSessions: allCompletedSessions.length,
        },
        todaySessions,
        activeCourses: activeCourses.map((c) => {
          const total = c.durationDays;
          const completed = c.sessions.filter((s) => s.status === "COMPLETED").length;
          return {
            id: c.id,
            therapyName: c.therapyName,
            patientName: c.patient.user.name,
            durationDays: c.durationDays,
            startDate: c.startDate,
            progressPercentage: total > 0 ? Number(((completed / total) * 100).toFixed(1)) : 0,
            completedSessions: completed,
            status: c.status,
          };
        }),
        upcomingSessions,
        recentActivity,
      });
    } catch (error) {
      next(error);
    }
  }

  // ADMIN: Reports & Analytics
  static async getReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const allCourses = await db.query.therapyCourses.findMany({
        with: {
          sessions: true,
          patient: { with: { user: true } },
        },
      });

      const allSessions = await db.query.therapySessions.findMany({
        with: {
          therapist: { with: { user: true } },
          room: true,
        },
      });

      // Group courses by therapy name
      const therapyDistribution: Record<string, number> = {};
      allCourses.forEach((c) => {
        therapyDistribution[c.therapyName] = (therapyDistribution[c.therapyName] || 0) + 1;
      });

      // Group sessions by status
      const sessionStatusCounts = {
        SCHEDULED: allSessions.filter((s) => s.status === "SCHEDULED").length,
        COMPLETED: allSessions.filter((s) => s.status === "COMPLETED").length,
        MISSED: allSessions.filter((s) => s.status === "MISSED").length,
        CANCELLED: allSessions.filter((s) => s.status === "CANCELLED").length,
      };

      // Therapist session workload
      const therapistWorkload: Record<string, { name: string; completed: number; scheduled: number }> = {};
      allSessions.forEach((s) => {
        const name = s.therapist.user.name;
        if (!therapistWorkload[name]) {
          therapistWorkload[name] = { name, completed: 0, scheduled: 0 };
        }
        if (s.status === "COMPLETED") therapistWorkload[name].completed++;
        if (s.status === "SCHEDULED") therapistWorkload[name].scheduled++;
      });

      res.json({
        success: true,
        summary: {
          totalCourses: allCourses.length,
          totalSessions: allSessions.length,
          sessionStatusCounts,
          therapyDistribution,
          therapistWorkload: Object.values(therapistWorkload),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ADMIN: Onboard New Therapist
  static async createTherapist(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, specialization, phone, experience, avatarUrl, bio, availability } = req.body;

      const existing = await db.query.users.findFirst({
        where: eq(schema.users.email, email.toLowerCase().trim()),
      });
      if (existing) {
        throw new AppError("Email is already in use.", 400);
      }

      const passwordHash = await (await import("bcryptjs")).default.hash(password || "Therapist@123", 10);
      const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const therapistId = `thp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      await db.insert(schema.users).values({
        id: userId,
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        role: "THERAPIST",
      });

      await db.insert(schema.therapists).values({
        id: therapistId,
        userId,
        specialization,
        phone,
        experience,
        avatarUrl: avatarUrl || null,
        bio: bio || null,
      });

      if (availability) {
        const availId = `av_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await db.insert(schema.therapistAvailability).values({
          id: availId,
          therapistId,
          workingDays: Array.isArray(availability.workingDays)
            ? JSON.stringify(availability.workingDays)
            : JSON.stringify([1, 2, 3, 4, 5, 6]),
          workingHoursStart: availability.workingHoursStart || "08:00",
          workingHoursEnd: availability.workingHoursEnd || "18:00",
          weeklyOff: availability.weeklyOff !== undefined ? availability.weeklyOff : 0,
        });
      }

      res.status(201).json({
        success: true,
        message: "Therapist onboarded successfully.",
        therapist: {
          id: therapistId,
          userId,
          name,
          email,
          phone,
          specialization,
          experience,
          avatarUrl,
          bio,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ADMIN: Get Therapist Availability Schedule
  static async getTherapistAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const avail = await db.query.therapistAvailability.findFirst({
        where: eq(schema.therapistAvailability.therapistId, id),
      });

      res.json({
        success: true,
        availability: avail ? {
          ...avail,
          workingDays: JSON.parse(avail.workingDays || "[]"),
        } : null,
      });
    } catch (error) {
      next(error);
    }
  }

  // ADMIN: Update Therapist Availability Schedule
  static async updateTherapistAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { workingDays, workingHoursStart, workingHoursEnd, weeklyOff } = req.body;

      const existing = await db.query.therapistAvailability.findFirst({
        where: eq(schema.therapistAvailability.therapistId, id),
      });

      const daysJson = Array.isArray(workingDays) ? JSON.stringify(workingDays) : JSON.stringify([1, 2, 3, 4, 5, 6]);

      if (existing) {
        await db
          .update(schema.therapistAvailability)
          .set({
            workingDays: daysJson,
            workingHoursStart: workingHoursStart || existing.workingHoursStart,
            workingHoursEnd: workingHoursEnd || existing.workingHoursEnd,
            weeklyOff: weeklyOff !== undefined ? weeklyOff : existing.weeklyOff,
            updatedAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(schema.therapistAvailability.id, existing.id));
      } else {
        const availId = `av_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await db.insert(schema.therapistAvailability).values({
          id: availId,
          therapistId: id,
          workingDays: daysJson,
          workingHoursStart: workingHoursStart || "08:00",
          workingHoursEnd: workingHoursEnd || "18:00",
          weeklyOff: weeklyOff !== undefined ? weeklyOff : 0,
        });
      }

      const updated = await db.query.therapistAvailability.findFirst({
        where: eq(schema.therapistAvailability.therapistId, id),
      });

      res.json({
        success: true,
        message: "Availability schedule updated.",
        availability: updated ? {
          ...updated,
          workingDays: JSON.parse(updated.workingDays || "[]"),
        } : null,
      });
    } catch (error) {
      next(error);
    }
  }

  // ADMIN: Get Leaves for a Therapist
  static async getTherapistLeaves(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const leavesList = await db.query.therapistLeaves.findMany({
        where: eq(schema.therapistLeaves.therapistId, id),
        orderBy: [desc(schema.therapistLeaves.startDate)],
      });

      res.json({
        success: true,
        count: leavesList.length,
        leaves: leavesList,
      });
    } catch (error) {
      next(error);
    }
  }

  // ADMIN: Create Leave for Therapist
  static async createTherapistLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { startDate, endDate, reason } = req.body;

      if (!startDate || !endDate) {
        throw new AppError("startDate and endDate are required", 400);
      }

      const leaveId = `lv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await db.insert(schema.therapistLeaves).values({
        id: leaveId,
        therapistId: id,
        startDate,
        endDate,
        reason: reason || null,
      });

      const created = await db.query.therapistLeaves.findFirst({
        where: eq(schema.therapistLeaves.id, leaveId),
      });

      res.status(201).json({
        success: true,
        message: "Leave recorded successfully.",
        leave: created,
      });
    } catch (error) {
      next(error);
    }
  }

  // ADMIN: Delete Leave Record
  static async deleteTherapistLeave(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await db.delete(schema.therapistLeaves).where(eq(schema.therapistLeaves.id, id));

      res.json({
        success: true,
        message: "Leave record deleted.",
      });
    } catch (error) {
      next(error);
    }
  }

  // ADMIN: Get Procedure Room Compatibility List
  static async getCompatibilityList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await db.query.procedureRoomCompatibility.findMany({
        with: {
          room: true,
        },
        orderBy: [asc(schema.procedureRoomCompatibility.procedureName)],
      });

      res.json({
        success: true,
        count: list.length,
        compatibilities: list,
      });
    } catch (error) {
      next(error);
    }
  }

  // ADMIN: Add Procedure Room Compatibility
  static async addCompatibility(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { procedureName, roomId } = req.body;
      if (!procedureName || !roomId) {
        throw new AppError("procedureName and roomId are required", 400);
      }

      const room = await db.query.treatmentRooms.findFirst({
        where: eq(schema.treatmentRooms.id, roomId),
      });
      if (!room) {
        throw new AppError("Treatment room not found", 404);
      }

      const compId = `comp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await db.insert(schema.procedureRoomCompatibility).values({
        id: compId,
        procedureName,
        roomId,
      });

      const created = await db.query.procedureRoomCompatibility.findFirst({
        where: eq(schema.procedureRoomCompatibility.id, compId),
        with: { room: true },
      });

      res.status(201).json({
        success: true,
        message: "Procedure compatibility mapping added.",
        compatibility: created,
      });
    } catch (error) {
      next(error);
    }
  }

  // ADMIN: Remove Procedure Room Compatibility
  static async removeCompatibility(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await db.delete(schema.procedureRoomCompatibility).where(eq(schema.procedureRoomCompatibility.id, id));

      res.json({
        success: true,
        message: "Compatibility mapping removed.",
      });
    } catch (error) {
      next(error);
    }
  }
}

