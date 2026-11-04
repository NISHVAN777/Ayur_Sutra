import { Request, Response, NextFunction } from "express";
import { WellnessService } from "../services/wellness.service.js";
import { AppError } from "../middleware/errorHandler.js";

export class WellnessController {
  // PATIENT: submit today's wellness log and receive AI guidance
  static async submitLog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patientId = req.user!.patientId;
      if (!patientId) throw new AppError("Patient profile not found.", 404, "NOT_FOUND");
      const log = await WellnessService.submitLog(patientId, req.body);
      res.status(201).json({ success: true, message: "Wellness log saved.", log });
    } catch (error) {
      next(error);
    }
  }

  // PATIENT: own wellness history
  static async getMyLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patientId = req.user!.patientId;
      if (!patientId) throw new AppError("Patient profile not found.", 404, "NOT_FOUND");
      res.json({ success: true, logs: WellnessService.getLogs(patientId) });
    } catch (error) {
      next(error);
    }
  }

  // ADMIN / assigned THERAPIST: a patient's wellness history
  static async getPatientLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      WellnessService.assertCanRead(req.user!.role, req.user!.therapistId, req.params.patientId);
      res.json({ success: true, logs: WellnessService.getLogs(req.params.patientId) });
    } catch (error) {
      next(error);
    }
  }
}
