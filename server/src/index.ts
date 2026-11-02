import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cron from "node-cron";
import authRoutes from "./routes/auth.routes.js";
import patientRoutes from "./routes/patient.routes.js";
import therapistRoutes from "./routes/therapist.routes.js";
import roomRoutes from "./routes/room.routes.js";
import courseRoutes from "./routes/course.routes.js";
import sessionRoutes from "./routes/session.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import requestRoutes from "./routes/request.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { ReminderService } from "./services/reminder.service.js";
import { PatientController } from "./controllers/patient.controller.js";
import { TherapistController } from "./controllers/therapist.controller.js";
import { requireAuth, requireRole } from "./middleware/auth.js";

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Middleware
app.use(
  cors({
    origin: [CLIENT_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "AYURSUTRA Backend API",
    time: new Date().toISOString(),
  });
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);

// Direct /api/patient aliases for patient portal
const patientRouter = express.Router();
patientRouter.get("/dashboard", requireAuth, requireRole("PATIENT"), PatientController.getPatientDashboard);
patientRouter.get("/course", requireAuth, requireRole("PATIENT"), PatientController.getPatientCourse);
patientRouter.get("/sessions", requireAuth, requireRole("PATIENT"), PatientController.getPatientSessions);
patientRouter.get("/history", requireAuth, requireRole("PATIENT"), PatientController.getPatientHistory);
app.use("/api/patient", patientRouter);

app.use("/api/therapists", therapistRoutes);

// Direct /api/therapist aliases for therapist portal
const therapistRouter = express.Router();
therapistRouter.get("/dashboard", requireAuth, requireRole("THERAPIST"), TherapistController.getTherapistDashboard);
therapistRouter.get("/today", requireAuth, requireRole("THERAPIST"), TherapistController.getTodaySessions);
therapistRouter.get("/sessions", requireAuth, requireRole("THERAPIST"), TherapistController.getTherapistSessions);
therapistRouter.get("/history", requireAuth, requireRole("THERAPIST"), TherapistController.getTherapistHistory);
therapistRouter.get("/patients/:id/therapy-plan", requireAuth, TherapistController.getPatientTherapyPlan);
app.use("/api/therapist", therapistRouter);

app.use("/api/rooms", roomRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/requests", requestRoutes);

// Centralized Error Handling
app.use(errorHandler);

// Background Reminder Cron (Runs daily at 06:00 AM or on startup)
if (process.env.NODE_ENV !== "test") {
  cron.schedule("0 6 * * *", async () => {
    console.log("[Cron] Running automated upcoming session reminder job...");
    try {
      const generated = await ReminderService.generateUpcomingSessionReminders();
      console.log(`[Cron] Generated ${generated} reminder notifications.`);
    } catch (err) {
      console.error("[Cron] Reminder job encountered an error:", err);
    }
  });

  // Start HTTP server
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`  🌿 AYURSUTRA Panchakarma Management Server`);
    console.log(`  🚀 API Listening on http://localhost:${PORT}`);
    console.log(`  🩺 Client URL: ${CLIENT_URL}`);
    console.log(`====================================================`);
  });
}
