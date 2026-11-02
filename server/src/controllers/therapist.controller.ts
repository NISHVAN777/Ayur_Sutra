import { Request, Response, NextFunction } from "express";
import { db } from "../db/index.js";
import { therapists, users, therapySessions, patients, therapyCourses } from "../db/schema.js";
import { eq, sql, desc, asc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { AppError } from "../middleware/errorHandler.js";

export async function getAllTherapists(req: Request, res: Response, next: NextFunction) {
  try {
    const allTherapists = await db.query.therapists.findMany({
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        therapySessions: {
          columns: {
            id: true,
            status: true,
            sessionDate: true,
          },
        },
      },
    });

    const result = allTherapists.map((t) => {
      const upcomingSessions = t.therapySessions.filter((s) => s.status === "SCHEDULED").length;
      const completedSessions = t.therapySessions.filter((s) => s.status === "COMPLETED").length;

      return {
        id: t.id,
        userId: t.userId,
        name: t.user.name,
        email: t.user.email,
        phone: t.phone,
        specialization: t.specialization,
        experience: t.experience,
        avatarUrl: t.avatarUrl,
        bio: t.bio,
        upcomingSessionsCount: upcomingSessions,
        completedSessionsCount: completedSessions,
      };
    });

    res.json({
      success: true,
      count: result.length,
      therapists: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTherapistProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const therapist = await db.query.therapists.findFirst({
      where: eq(therapists.id, id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!therapist) throw new AppError("Therapist not found", 404);

    // Non-sensitive public practitioner profile
    const profile = {
      id: therapist.id,
      name: therapist.user.name,
      email: therapist.user.email,
      phone: therapist.phone,
      specialization: therapist.specialization,
      experience: therapist.experience,
      avatarUrl: therapist.avatarUrl,
      bio: therapist.bio || "Experienced Ayurvedic Panchakarma practitioner providing holistic personalized care.",
    };

    res.json({
      success: true,
      profile,
    });
  } catch (error) {
    next(error);
  }
}

export async function createTherapist(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password, specialization, phone, experience, avatarUrl, bio } = req.body;

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existingUser) {
      throw new AppError("A user with this email already exists", 400);
    }

    const passwordHash = await bcrypt.hash(password || "Therapist@123", 10);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const therapistId = `thp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await db.insert(users).values({
      id: userId,
      name,
      email,
      passwordHash,
      role: "THERAPIST",
    });

    await db.insert(therapists).values({
      id: therapistId,
      userId,
      specialization,
      phone,
      experience,
      avatarUrl: avatarUrl || null,
      bio: bio || null,
    });

    res.status(201).json({
      success: true,
      message: "Therapist registered successfully.",
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

export async function getTherapistDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const therapistId = req.user!.therapistId;
    if (!therapistId) throw new AppError("Therapist profile not found for user", 400);

    const todayStr = new Date().toISOString().substring(0, 10);

    const todaySessions = await db.query.therapySessions.findMany({
      where: eq(therapySessions.therapistId, therapistId),
      with: {
        patient: { with: { user: true } },
        course: true,
        room: true,
      },
      orderBy: (sessions, { asc }) => [asc(sessions.startTime)],
    });

    const todayFiltered = todaySessions.filter((s) => s.sessionDate === todayStr && s.status !== "CANCELLED");
    const nextSession = todayFiltered.find((s) => s.status === "SCHEDULED");
    const allCompleted = todaySessions.filter((s) => s.status === "COMPLETED").length;

    res.json({
      success: true,
      date: todayStr,
      stats: {
        todayTotal: todayFiltered.length,
        todayCompleted: todayFiltered.filter((s) => s.status === "COMPLETED").length,
        todayPending: todayFiltered.filter((s) => s.status === "SCHEDULED").length,
        allTimeCompleted: allCompleted,
      },
      nextSession,
      todaySessions: todayFiltered,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTherapistSessions(req: Request, res: Response, next: NextFunction) {
  try {
    const therapistId = req.user!.therapistId;
    if (!therapistId) throw new AppError("Therapist profile not found", 400);

    const sessions = await db.query.therapySessions.findMany({
      where: eq(therapySessions.therapistId, therapistId),
      with: {
        patient: { with: { user: true } },
        course: true,
        room: true,
      },
      orderBy: (sessions, { asc }) => [asc(sessions.sessionDate), asc(sessions.startTime)],
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

export async function getTherapistHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const therapistId = req.user!.therapistId;
    if (!therapistId) throw new AppError("Therapist profile not found", 400);

    const history = await db.query.therapySessions.findMany({
      where: eq(therapySessions.therapistId, therapistId),
      with: {
        patient: { with: { user: true } },
        course: true,
        room: true,
      },
      orderBy: (sessions, { desc }) => [desc(sessions.sessionDate), desc(sessions.startTime)],
    });

    const completed = history.filter((s) => s.status === "COMPLETED");

    res.json({
      success: true,
      count: completed.length,
      history: completed,
    });
  } catch (error) {
    next(error);
  }
}


export async function getPatientTherapyPlan(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    let patient = await db.query.patients.findFirst({
      where: eq(patients.id, id),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!patient) {
      patient = await db.query.patients.findFirst({
        where: eq(patients.userId, id),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });
    }

    if (!patient) {
      throw new AppError("Patient not found", 404);
    }

    const courses = await db.query.therapyCourses.findMany({
      where: eq(therapyCourses.patientId, patient.id),
      with: {
        sessions: {
          with: {
            therapist: {
              with: {
                user: {
                  columns: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
            room: true,
          },
          orderBy: (sessions, { asc }) => [asc(sessions.dayNumber)],
        },
      },
      orderBy: (courses, { desc }) => [desc(courses.createdAt)],
    });

    const activeCourse = courses.find((c) => c.status === "ACTIVE" || c.status === "PAUSED") || courses[0] || null;

    res.json({
      success: true,
      patient: {
        id: patient.id,
        userId: patient.userId,
        name: patient.user.name,
        email: patient.user.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
        gender: patient.gender,
        medicalNotes: patient.medicalNotes,
        emergencyContact: patient.emergencyContact,
        address: patient.address,
      },
      activeCourse,
      courses,
    });
  } catch (error) {
    next(error);
  }
}

export const TherapistController = {
  getAllTherapists,
  createTherapist,
  getTherapistDashboard,
  getTodaySessions: getTherapistDashboard,
  getTherapistSessions,
  getTherapistHistory,
  getTherapistProfile,
  getPatientTherapyPlan,
};

