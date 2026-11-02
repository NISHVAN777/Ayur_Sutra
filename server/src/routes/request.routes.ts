import { Router } from "express";
import { RequestController } from "../controllers/request.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { approveRequestSchema, rejectRequestSchema } from "../utils/validators.js";

const router = Router();

router.use(requireAuth);

router.get("/", RequestController.getRequests);
router.post("/:id/approve", requireRole("ADMIN"), validateBody(approveRequestSchema), RequestController.approveRequest);
router.post("/:id/reject", requireRole("ADMIN"), validateBody(rejectRequestSchema), RequestController.rejectRequest);

export default router;
