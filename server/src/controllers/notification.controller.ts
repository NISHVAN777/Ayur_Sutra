import { Request, Response, NextFunction } from "express";
import { db, schema } from "../db/index.js";
import { eq, desc, and, sql } from "drizzle-orm";
import { ReminderService } from "../services/reminder.service.js";
import { AppError } from "../middleware/errorHandler.js";

export class NotificationController {
  // GET: User's notifications
  static async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;

      const userNotifications = await db.query.notifications.findMany({
        where: eq(schema.notifications.userId, userId),
        orderBy: [desc(schema.notifications.createdAt)],
      });

      const unreadCount = userNotifications.filter((n) => !n.isRead).length;

      res.json({
        success: true,
        unreadCount,
        notifications: userNotifications,
      });
    } catch (error) {
      next(error);
    }
  }

  // PATCH: Mark notification as read
  static async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const notif = await db.query.notifications.findFirst({
        where: and(
          eq(schema.notifications.id, id),
          eq(schema.notifications.userId, userId)
        ),
      });

      if (!notif) {
        throw new AppError("Notification not found.", 404, "NOT_FOUND");
      }

      await db
        .update(schema.notifications)
        .set({ isRead: true })
        .where(eq(schema.notifications.id, id));

      res.json({
        success: true,
        message: "Notification marked as read.",
      });
    } catch (error) {
      next(error);
    }
  }

  // POST: Trigger reminders manually (Admin / System)
  static async triggerReminders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await ReminderService.generateUpcomingSessionReminders();
      res.json({
        success: true,
        message: `Generated ${count} upcoming session reminders.`,
      });
    } catch (error) {
      next(error);
    }
  }
}
