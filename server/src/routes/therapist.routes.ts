import { Router } from "express";
import { 
  getAllTherapists, 
  createTherapist, 
  getTherapistDashboard, 
  getTherapistSessions, 
  getTherapistHistory,
  getTherapistProfile,
  getPatientTherapyPlan
} from "../controllers/therapist.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { createTherapistSchema } from "../utils/validators.js";

const router = Router();

router.use(requireAuth);

// Therapist Dashboard Endpoints
router.get("/dashboard", requireRole("THERAPIST"), getTherapistDashboard);
router.get("/sessions", requireRole("THERAPIST"), getTherapistSessions);
router.get("/history", requireRole("THERAPIST"), getTherapistHistory);

// Full Patient Therapy Plan Endpoint
router.get("/patients/:id/therapy-plan", getPatientTherapyPlan);

// Safe Profile Endpoint (accessible to patients & staff)
router.get("/:id/profile", getTherapistProfile);

// Admin Roster Endpoints
router.get("/", getAllTherapists);
router.post("/", requireRole("ADMIN"), validateBody(createTherapistSchema), createTherapist);

export default router;
