import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, schema } from "../db/index.js";
import { eq, ne, desc, asc, and, like, or, sql } from "drizzle-orm";
import { AppError } from "../middleware/errorHandler.js";

export class PatientController {
  // ADMIN: Get all patients with search filter
  static async getAllPatients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = (req.query.search as string)?.trim();

      const allPatients = await db.query.patients.findMany({
        with: {
          user: true,
          therapyCourses: {
            with: {
              sessions: true,
            },
            orderBy: [desc(schema.therapyCourses.createdAt)],
          },
        },
        orderBy: [desc(schema.patients.createdAt)],
      });

      let filtered = allPatients;
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = allPatients.filter(
          (p) =>
            p.user.name.toLowerCase().includes(searchLower) ||
            p.user.email.toLowerCase().includes(searchLower) ||
            p.phone.includes(searchLower)
        );
      }

      // Add computed progress stats
      const formatted = filtered.map((p) => {
        const activeCourse = p.therapyCourses.find((c) => c.status === "ACTIVE");
        let progress = 0;
        let completedSessions = 0;
        let totalSessions = 0;

        if (activeCourse) {
          totalSessions = activeCourse.durationDays;
          completedSessions = activeCourse.sessions.filter((s) => s.status === "COMPLETED").length;
          progress = totalSessions > 0 ? Number(((completedSessions / totalSessions) * 100).toFixed(2)) : 0;
        }

        return {
          id: p.id,
          userId: p.userId,
          name: p.user.name,
          email: p.user.email,
          phone: p.phone,
          dateOfBirth: p.dateOfBirth,
          gender: p.gender,
          address: p.address,
          emergencyContact: p.emergencyContact,
          medicalNotes: p.medicalNotes,
          activeCourse: activeCourse
            ? {
                id: activeCourse.id,
                therapyName: activeCourse.therapyName,
                durationDays: activeCourse.durationDays,
                startDate: activeCourse.startDate,
                progress,
                completedSessions,
                totalSessions,
              }
            : null,
          totalCourses: p.therapyCourses.length,
          createdAt: p.createdAt,
        };
      });

      res.json({
        success: true,
        count: formatted.length,
        patients: formatted,
      });
    } catch (error) {
      next(error);
    }
  }

  // ADMIN / PATIENT (Self only): Get patient by ID
  static async getPatientById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // Data Isolation Check: If PATIENT role, must match own patientId
      if (req.user?.role === "PATIENT" && req.user.patientId !== id) {
        throw new AppError("Access denied. You can only access your own patient profile.", 403, "FORBIDDEN");
      }

      const patient = await db.query.patients.findFirst({
        where: eq(schema.patients.id, id),
        with: {
          user: true,
          therapyCourses: {
            with: {
              sessions: {
                with: {
                  therapist: { with: { user: true } },
                  room: true,
                },
                orderBy: [asc(schema.therapySessions.dayNumber)],
              },
            },
            orderBy: [desc(schema.therapyCourses.createdAt)],
          },
        },
      });

      if (!patient) {
        throw new AppError("Patient not found.", 404, "PATIENT_NOT_FOUND");
      }

      res.json({
        success: true,
        patient,
      });
    } catch (error) {
      next(error);
    }
  }

  // ADMIN: Create patient
  static async createPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, phone, dateOfBirth, gender, address, emergencyContact, medicalNotes } = req.body;

      const existingUser = await db.query.users.findFirst({
        where: eq(schema.users.email, email.toLowerCase().trim()),
      });

      if (existingUser) {
        throw new AppError("A user with this email address already exists.", 400, "EMAIL_EXISTS");
      }

      const passwordHash = await bcrypt.hash(password || "Patient@123", 10);
      const userId = `usr_${crypto.randomUUID()}`;
      const patientId = `pat_${crypto.randomUUID()}`;

      await db.insert(schema.users).values({
        id: userId,
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        role: "PATIENT",
      });

      const [newPatient] = await db
        .insert(schema.patients)
        .values({
          id: patientId,
          userId,
          phone,
          dateOfBirth,
          gender,
          address: address || null,
          emergencyContact: emergencyContact || null,
          medicalNotes: medicalNotes || null,
        })
        .returning();

      res.status(201).json({
        success: true,
        message: "Patient registered successfully.",
        patient: {
          ...newPatient,
          user: { id: userId, name, email },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ADMIN: Update patient
  static async updatePatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { name, phone, dateOfBirth, gender, address, emergencyContact, medicalNotes } = req.body;

      const patient = await db.query.patients.findFirst({
        where: eq(schema.patients.id, id),
      });

      if (!patient) {
        throw new AppError("Patient not found.", 404, "PATIENT_NOT_FOUND");
      }

      if (name) {
        await db.update(schema.users).set({ name, updatedAt: sql`(CURRENT_TIMESTAMP)` }).where(eq(schema.users.id, patient.userId));
      }

      await db
        .update(schema.patients)
        .set({
          phone: phone ?? patient.phone,
          dateOfBirth: dateOfBirth ?? patient.dateOfBirth,
          gender: gender ?? patient.gender,
          address: address ?? patient.address,
          emergencyContact: emergencyContact ?? patient.emergencyContact,
          medicalNotes: medicalNotes ?? patient.medicalNotes,
          updatedAt: sql`(CURRENT_TIMESTAMP)`,
        })
        .where(eq(schema.patients.id, id));

      const updated = await db.query.patients.findFirst({
        where: eq(schema.patients.id, id),
        with: { user: true },
      });

      res.json({
        success: true,
        message: "Patient details updated.",
        patient: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  // ADMIN: Delete patient
  static async deletePatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const patient = await db.query.patients.findFirst({
        where: eq(schema.patients.id, id),
      });

      if (!patient) {
        throw new AppError("Patient not found.", 404, "PATIENT_NOT_FOUND");
      }

      // Delete user (cascades to patient, courses, sessions, notifications)
      await db.delete(schema.users).where(eq(schema.users.id, patient.userId));

      res.json({
        success: true,
        message: "Patient and associated therapy records deleted successfully.",
      });
    } catch (error) {
      next(error);
    }
  }

  // PATIENT: Get My Dashboard Data
  static async getPatientDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patientId = req.user?.patientId;
      if (!patientId) {
        throw new AppError("Patient profile not linked to authenticated user.", 400, "PROFILE_NOT_LINKED");
      }

      const patient = await db.query.patients.findFirst({
        where: eq(schema.patients.id, patientId),
        with: {
          user: true,
          therapyCourses: {
            where: eq(schema.therapyCourses.status, "ACTIVE"),
            with: {
              sessions: {
                with: {
                  therapist: { with: { user: true } },
                  room: true,
                },
                orderBy: [asc(schema.therapySessions.dayNumber)],
              },
            },
            orderBy: [desc(schema.therapyCourses.createdAt)],
          },
        },
      });

      if (!patient) {
        throw new AppError("Patient profile not found.", 404, "PATIENT_NOT_FOUND");
      }

      const activeCourse = patient.therapyCourses?.[0] || null;
      let progress = 0;
      let completedSessions = 0;
      let remainingSessions = 0;
      let totalSessions = 0;
      let nextSession = null;
      let currentDayDisplay = "No active course";

      if (activeCourse) {
        totalSessions = activeCourse.durationDays;
        completedSessions = activeCourse.sessions.filter((s) => s.status === "COMPLETED").length;
        remainingSessions = totalSessions - completedSessions;
        progress = totalSessions > 0 ? Number(((completedSessions / totalSessions) * 100).toFixed(2)) : 0;

        nextSession = activeCourse.sessions.find((s) => s.status === "SCHEDULED") || null;
        const currentDayNumber = nextSession ? nextSession.dayNumber : completedSessions;
        currentDayDisplay = `Day ${currentDayNumber} of ${totalSessions}`;
      }

      // Recent notifications
      const userNotifications = await db.query.notifications.findMany({
        where: eq(schema.notifications.userId, req.user!.userId),
        orderBy: [desc(schema.notifications.createdAt)],
        limit: 5,
      });

      res.json({
        success: true,
        patient: {
          id: patient.id,
          name: patient.user.name,
          email: patient.user.email,
          phone: patient.phone,
          medicalNotes: patient.medicalNotes,
        },
        activeCourse,
        stats: {
          progressPercentage: progress,
          completedSessions,
          remainingSessions,
          totalSessions,
          currentDayDisplay,
          hasActiveCourse: !!activeCourse,
        },
        nextSession,
        recentNotifications: userNotifications,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATIENT: Get My Care Journey (Active Course + All Timeline Sessions)
  static async getPatientCourse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patientId = req.user?.patientId;
      if (!patientId) {
        throw new AppError("Patient profile not found.", 400, "NO_PATIENT_PROFILE");
      }

      const activeCourse = await db.query.therapyCourses.findFirst({
        where: and(
          eq(schema.therapyCourses.patientId, patientId),
          eq(schema.therapyCourses.status, "ACTIVE")
        ),
        with: {
          sessions: {
            with: {
              therapist: { with: { user: true } },
              room: true,
            },
            orderBy: [asc(schema.therapySessions.dayNumber)],
          },
        },
      });

      if (!activeCourse) {
        res.json({
          success: true,
          activeCourse: null,
          message: "No active therapy course found.",
        });
        return;
      }

      const total = activeCourse.durationDays;
      const completed = activeCourse.sessions.filter((s) => s.status === "COMPLETED").length;
      const progress = Number(((completed / total) * 100).toFixed(2));
      const nextSession = activeCourse.sessions.find((s) => s.status === "SCHEDULED") || null;

      res.json({
        success: true,
        activeCourse: {
          ...activeCourse,
          progressPercentage: progress,
          completedSessions: completed,
          remainingSessions: total - completed,
          nextSession,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // PATIENT: Get All Sessions
  static async getPatientSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patientId = req.user?.patientId;
      if (!patientId) {
        throw new AppError("Patient profile not found.", 400, "NO_PATIENT_PROFILE");
      }

      const sessions = await db.query.therapySessions.findMany({
        where: eq(schema.therapySessions.patientId, patientId),
        with: {
          course: true,
          therapist: { with: { user: true } },
          room: true,
        },
        orderBy: [asc(schema.therapySessions.sessionDate), asc(schema.therapySessions.startTime)],
      });

      res.json({
        success: true,
        count: sessions.length,
        sessions,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATIENT: Get Patient-Visible Treatment History (COMPLETED and MISSED sessions)
  static async getPatientHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patientId = req.user?.patientId;
      if (!patientId) {
        throw new AppError("Patient profile not found.", 400, "NO_PATIENT_PROFILE");
      }

      const historySessions = await db.query.therapySessions.findMany({
        where: and(
          eq(schema.therapySessions.patientId, patientId),
          ne(schema.therapySessions.status, "CANCELLED")
        ),
        with: {
          course: true,
          therapist: { with: { user: true } },
          room: true,
        },
        orderBy: [desc(schema.therapySessions.sessionDate), desc(schema.therapySessions.startTime)],
      });

      res.json({
        success: true,
        count: historySessions.length,
        history: historySessions,
      });
    } catch (error) {
      next(error);
    }
  }
}
