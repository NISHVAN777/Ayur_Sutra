import { Router } from "express";
import { 
  getAllCourses, 
  getCourseById, 
  checkAvailability, 
  createCourse, 
  cancelCourse,
  pauseCourse,
  resumeCourse
} from "../controllers/course.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { 
  createCourseSchema, 
  checkAvailabilitySchema,
  pauseCourseSchema,
  resumeCourseSchema
} from "../utils/validators.js";

const router = Router();

router.use(requireAuth);

router.get("/", getAllCourses);
router.post("/check-availability", requireRole("ADMIN"), validateBody(checkAvailabilitySchema), checkAvailability);
router.post("/", requireRole("ADMIN"), validateBody(createCourseSchema), createCourse);
router.get("/:id", getCourseById);
router.patch("/:id/pause", requireRole("ADMIN"), validateBody(pauseCourseSchema), pauseCourse);
router.patch("/:id/resume", requireRole("ADMIN"), validateBody(resumeCourseSchema), resumeCourse);
router.patch("/:id/cancel", requireRole("ADMIN"), cancelCourse);

export default router;
