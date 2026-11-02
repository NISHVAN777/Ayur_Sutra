import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class SchedulingConflictError extends Error {
  public statusCode = 409;
  public errorCode: string = "SCHEDULING_CONFLICT";
  public code?: string;
  public dayNumber?: number;
  public sessionDate?: string;
  public date?: string;
  public time?: string;
  public resourceType?: "THERAPIST" | "ROOM" | "COURSE";
  public resourceName?: string;
  public resourceId?: string;

  constructor(
    message: string,
    details?: {
      code?: string;
      errorCode?: string;
      dayNumber?: number;
      sessionDate?: string;
      date?: string;
      time?: string;
      resourceType?: "THERAPIST" | "ROOM" | "COURSE";
      resourceName?: string;
      resourceId?: string;
    }
  ) {
    super(message);
    this.name = "SchedulingConflictError";
    if (details) {
      this.errorCode = details.code || details.errorCode || "SCHEDULING_CONFLICT";
      this.code = this.errorCode;
      this.dayNumber = details.dayNumber;
      this.sessionDate = details.sessionDate || details.date;
      this.date = this.sessionDate;
      this.time = details.time;
      this.resourceType = details.resourceType;
      this.resourceName = details.resourceName;
      this.resourceId = details.resourceId;
    }
  }
}

export class AppError extends Error {
  public statusCode: number;
  public errorCode: string;

  constructor(message: string, statusCode: number = 400, errorCode: string = "BAD_REQUEST") {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log full stack on server
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);

  if (
    err instanceof SchedulingConflictError ||
    err.name === "SchedulingConflictError" ||
    err.statusCode === 409
  ) {
    const code = err.errorCode || err.code || "SCHEDULING_CONFLICT";
    res.status(409).json({
      success: false,
      error: "SCHEDULING_CONFLICT",
      code,
      errorCode: code,
      message: err.message,
      dayNumber: err.dayNumber,
      sessionDate: err.sessionDate || err.date,
      date: err.date || err.sessionDate,
      time: err.time,
      resourceType: err.resourceType,
      resourceName: err.resourceName,
      resourceId: err.resourceId,
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.errorCode,
      message: err.message,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: "VALIDATION_ERROR",
      message: err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", "),
      details: err.errors,
    });
    return;
  }

  // Handle generic error (never leak stack trace to clients)
  res.status(500).json({
    success: false,
    error: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred on the server. Please try again later.",
  });
}
