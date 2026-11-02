import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { loginSchema, registerPatientSchema } from "../utils/validators.js";

const router = Router();

router.post("/login", validateBody(loginSchema), AuthController.login);
router.post("/logout", AuthController.logout);
router.get("/me", requireAuth, AuthController.me);
router.post("/register", validateBody(registerPatientSchema), AuthController.registerPatient);

export default router;
