import { Router } from "express";
import { PatientController } from "../controllers/patient.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { registerPatientSchema, updatePatientSchema } from "../utils/validators.js";

const router = Router();

// Patient Portal Self-Endpoints (Strictly isolated by authenticated patientId)
router.get("/dashboard", requireAuth, requireRole("PATIENT"), PatientController.getPatientDashboard);
router.get("/course", requireAuth, requireRole("PATIENT"), PatientController.getPatientCourse);
router.get("/sessions", requireAuth, requireRole("PATIENT"), PatientController.getPatientSessions);
router.get("/history", requireAuth, requireRole("PATIENT"), PatientController.getPatientHistory);

// Admin Management Endpoints
router.get("/", requireAuth, requireRole("ADMIN"), PatientController.getAllPatients);
router.get("/:id", requireAuth, PatientController.getPatientById); // Accessible by ADMIN or PATIENT (self)
router.post("/", requireAuth, requireRole("ADMIN"), validateBody(registerPatientSchema), PatientController.createPatient);
router.put("/:id", requireAuth, requireRole("ADMIN"), validateBody(updatePatientSchema), PatientController.updatePatient);
router.delete("/:id", requireAuth, requireRole("ADMIN"), PatientController.deletePatient);

export default router;
