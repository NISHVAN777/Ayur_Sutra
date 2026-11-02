import { Router } from "express";
import { RoomController } from "../controllers/room.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { createRoomSchema, updateRoomSchema } from "../utils/validators.js";

const router = Router();

router.get("/", requireAuth, RoomController.getAllRooms);
router.post("/", requireAuth, requireRole("ADMIN"), validateBody(createRoomSchema), RoomController.createRoom);
router.put("/:id", requireAuth, requireRole("ADMIN"), validateBody(updateRoomSchema), RoomController.updateRoom);

export default router;
