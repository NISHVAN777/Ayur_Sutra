import { Router } from "express";
import { 
  getSessionById, 
  completeSession, 
  markSessionMissed, 
  updateSessionNotes,
  rescheduleSession,
  cancelSession,
  changeTherapist,
  changeRoom,
  getSessionAuditLogs,
  requestRescheduleSession,
  requestCancelSession,
  requestReplacementSession,
  declineReplacementSession
} from "../controllers/session.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { 
  completeSessionSchema, 
  markMissedSessionSchema,
  rescheduleSessionSchema,
  cancelSessionSchema,
  changeTherapistSchema,
  changeRoomSchema,
  requestRescheduleSchema,
  requestCancelSchema,
  requestReplacementSchema
} from "../utils/validators.js";

const router = Router();

router.use(requireAuth);

router.get("/:id", getSessionById);
router.get("/:id/audit", requireRole("ADMIN"), getSessionAuditLogs);

// Patient & Therapist request actions (submitted for admin approval)
router.post("/:id/request-reschedule", requireRole("PATIENT", "THERAPIST", "ADMIN"), validateBody(requestRescheduleSchema), requestRescheduleSession);
router.post("/:id/request-cancel", requireRole("PATIENT", "THERAPIST", "ADMIN"), validateBody(requestCancelSchema), requestCancelSession);
router.post("/:id/request-replacement", requireRole("PATIENT", "THERAPIST", "ADMIN"), validateBody(requestReplacementSchema), requestReplacementSession);
router.post("/:id/recommend-reschedule", requireRole("THERAPIST", "ADMIN"), validateBody(requestReplacementSchema), requestReplacementSession);
router.post("/:id/decline-replacement", requireRole("PATIENT", "ADMIN"), declineReplacementSession);

// Therapist & Admin actions
router.patch("/:id/complete", requireRole("THERAPIST", "ADMIN"), validateBody(completeSessionSchema), completeSession);
router.post("/:id/complete", requireRole("THERAPIST", "ADMIN"), validateBody(completeSessionSchema), completeSession);
router.patch("/:id/missed", requireRole("THERAPIST", "ADMIN"), validateBody(markMissedSessionSchema), markSessionMissed);
router.patch("/:id/notes", requireRole("THERAPIST", "ADMIN"), validateBody(completeSessionSchema), updateSessionNotes);
router.post("/:id/notes", requireRole("THERAPIST", "ADMIN"), validateBody(completeSessionSchema), updateSessionNotes);

// Admin clinical scheduling & modification actions
router.patch("/:id/reschedule", requireRole("ADMIN"), validateBody(rescheduleSessionSchema), rescheduleSession);
router.patch("/:id/cancel", requireRole("ADMIN"), validateBody(cancelSessionSchema), cancelSession);
router.patch("/:id/therapist", requireRole("ADMIN"), validateBody(changeTherapistSchema), changeTherapist);
router.patch("/:id/room", requireRole("ADMIN"), validateBody(changeRoomSchema), changeRoom);

export default router;

