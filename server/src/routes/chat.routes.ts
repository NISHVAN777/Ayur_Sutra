import { Router } from "express";
import { ChatController } from "../controllers/chat.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { chatMessageSchema } from "../utils/validators.js";

const router = Router();

router.post("/", requireAuth, validateBody(chatMessageSchema), ChatController.sendMessage);
router.get("/history", requireAuth, ChatController.getChatHistory);

export default router;
