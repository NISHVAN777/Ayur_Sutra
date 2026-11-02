import { Router } from "express";
import { AdminController } from "../controllers/admin.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth);
router.use(requireRole("ADMIN"));

router.get("/dashboard", AdminController.getDashboardStats);
router.get("/reports", AdminController.getReports);

// Therapist Onboarding
router.post("/therapists", AdminController.createTherapist);

// Therapist Availability Schedule
router.get("/therapists/:id/availability", AdminController.getTherapistAvailability);
router.put("/therapists/:id/availability", AdminController.updateTherapistAvailability);

// Therapist Leaves
router.get("/therapists/:id/leaves", AdminController.getTherapistLeaves);
router.post("/therapists/:id/leaves", AdminController.createTherapistLeave);
router.delete("/leaves/:id", AdminController.deleteTherapistLeave);

// Procedure ↔ Room Compatibility
router.get("/compatibility", AdminController.getCompatibilityList);
router.post("/compatibility", AdminController.addCompatibility);
router.delete("/compatibility/:id", AdminController.removeCompatibility);

export default router;
