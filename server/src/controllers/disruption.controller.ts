import { Request, Response, NextFunction } from "express";
import { DisruptionService } from "../services/disruption.service.js";

export class DisruptionController {
  // ADMIN: preview how sessions will be reassigned (no changes are saved)
  static async preview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await DisruptionService.buildPlan(req.body);
      res.json({ success: true, ...plan });
    } catch (error) {
      next(error);
    }
  }

  // ADMIN: record the leave and apply the reassignment atomically
  static async apply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plan = await DisruptionService.applyPlan(req.body, req.user!.userId);
      res.json({ success: true, message: "Leave recorded and remaining sessions rescheduled.", ...plan });
    } catch (error) {
      next(error);
    }
  }
}
