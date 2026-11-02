import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import { signToken } from "../utils/jwt.js";
import { AppError } from "../middleware/errorHandler.js";

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      const user = await db.query.users.findFirst({
        where: eq(schema.users.email, email.toLowerCase().trim()),
        with: {
          patientProfile: true,
          therapistProfile: true,
        },
      });

      if (!user) {
        throw new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
      }

      const patientId = user.patientProfile?.id;
      const therapistId = user.therapistProfile?.id;

      const token = signToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        patientId,
        therapistId,
      });

      // Set secure HTTP-only cookie
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        success: true,
        message: "Login successful.",
        token, // also return token for header-based auth if needed
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          patientId,
          therapistId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.json({
      success: true,
      message: "Logged out successfully.",
    });
  }

  static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new AppError("Not authenticated", 401, "UNAUTHORIZED");
      }

      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, req.user.userId),
        with: {
          patientProfile: true,
          therapistProfile: true,
        },
      });

      if (!user) {
        throw new AppError("User not found", 404, "USER_NOT_FOUND");
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          patientId: user.patientProfile?.id,
          therapistId: user.therapistProfile?.id,
          patientProfile: user.patientProfile,
          therapistProfile: user.therapistProfile,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async registerPatient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.body.role && req.body.role !== "PATIENT") {
        throw new AppError("Staff accounts cannot be registered publicly. Please contact an Administrator.", 403, "FORBIDDEN");
      }

      const { name, email, password, phone, dateOfBirth, gender, address, emergencyContact, medicalNotes } = req.body;

      const existingUser = await db.query.users.findFirst({
        where: eq(schema.users.email, email.toLowerCase().trim()),
      });

      if (existingUser) {
        throw new AppError("Email is already registered.", 400, "EMAIL_EXISTS");
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userId = `usr_${crypto.randomUUID()}`;
      const patientId = `pat_${crypto.randomUUID()}`;

      await db.insert(schema.users).values({
        id: userId,
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        role: "PATIENT",
      });

      await db.insert(schema.patients).values({
        id: patientId,
        userId,
        phone,
        dateOfBirth,
        gender,
        address: address || null,
        emergencyContact: emergencyContact || null,
        medicalNotes: medicalNotes || null,
      });

      const token = signToken({
        userId,
        email: email.toLowerCase().trim(),
        name,
        role: "PATIENT",
        patientId,
      });

      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        success: true,
        message: "Patient registered successfully.",
        token,
        user: {
          id: userId,
          name,
          email,
          role: "PATIENT",
          patientId,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
