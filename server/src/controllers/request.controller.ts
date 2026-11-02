import { Request, Response, NextFunction } from "express";
import { SchedulingService } from "../services/scheduling.service.js";

export class RequestController {
  // GET /api/requests - Get requests accessible to current user (Admin = all, Patient = own, Therapist = assigned)
  static async getRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const status = req.query.status as string | undefined;

      const requests = await SchedulingService.getRequests({
        role: user.role,
        userId: user.userId,
        patientId: user.patientId,
        therapistId: user.therapistId,
        status,
      });

      res.json({
        success: true,
        count: requests.length,
        requests,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/requests/:id/approve - Admin approves request and applies scheduling changes
  static async approveRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { sessionDate, startTime, therapistId, roomId, notes } = req.body;
      const performedByUserId = req.user!.userId;

      const result = await SchedulingService.approveRequest({
        requestId: id,
        sessionDate,
        startTime,
        therapistId,
        roomId,
        notes,
        performedByUserId,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  // POST /api/requests/:id/reject - Admin rejects request with mandatory reason
  static async rejectRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const performedByUserId = req.user!.userId;

      const result = await SchedulingService.rejectRequest({
        requestId: id,
        reason,
        performedByUserId,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
