import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, NotificationController.getNotifications);
router.patch("/:id/read", requireAuth, NotificationController.markAsRead);
router.post("/trigger-reminders", requireAuth, requireRole("ADMIN"), NotificationController.triggerReminders);

export default router;
