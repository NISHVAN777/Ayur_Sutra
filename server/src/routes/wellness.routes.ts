import { Router } from "express";
import { WellnessController } from "../controllers/wellness.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { wellnessLogSchema } from "../utils/validators.js";

const router = Router();

router.post("/", requireAuth, requireRole("PATIENT"), validateBody(wellnessLogSchema), WellnessController.submitLog);
router.get("/", requireAuth, requireRole("PATIENT"), WellnessController.getMyLogs);
router.get("/patient/:patientId", requireAuth, requireRole("ADMIN", "THERAPIST"), WellnessController.getPatientLogs);

export default router;
