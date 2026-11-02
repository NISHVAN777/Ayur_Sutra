import { Request, Response, NextFunction } from "express";
import { verifyToken, TokenPayload } from "../utils/jwt.js";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        error: "UNAUTHORIZED",
        message: "Authentication token is missing. Please log in."
      });
      return;
    }

    const payload = verifyToken(token);

    // Verify user still exists in database
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, payload.userId)
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: "USER_NOT_FOUND",
        message: "User session is invalid. Please log in again."
      });
      return;
    }

    // Attach patientId or therapistId if applicable
    let patientId = payload.patientId;
    let therapistId = payload.therapistId;

    if (user.role === "PATIENT" && !patientId) {
      const patient = await db.query.patients.findFirst({
        where: eq(schema.patients.userId, user.id)
      });
      patientId = patient?.id;
    } else if (user.role === "THERAPIST" && !therapistId) {
      const therapist = await db.query.therapists.findFirst({
        where: eq(schema.therapists.userId, user.id)
      });
      therapistId = therapist?.id;
    }

    req.user = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      patientId,
      therapistId
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: "INVALID_TOKEN",
      message: "Session expired or invalid token. Please log in again."
    });
  }
}

export function requireRole(...allowedRoles: Array<"ADMIN" | "THERAPIST" | "PATIENT">) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "UNAUTHORIZED",
        message: "Authentication required."
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: "FORBIDDEN",
        message: `Access denied. Requires one of roles: [${allowedRoles.join(", ")}]. Current role: ${req.user.role}.`
      });
      return;
    }

    next();
  };
}
