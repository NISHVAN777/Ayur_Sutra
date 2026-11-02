import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../index.js";
import { sqlite } from "../db/index.js";
import { seedDatabase } from "../db/seed.js";

describe("6. AyurSutra Enhancements & Workflow Refinements Suite", () => {
  let adminToken: string;
  let therapistToken: string;
  let therapist2Token: string;
  let patientToken: string;

  beforeAll(async () => {
    await seedDatabase();

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@ayursutra.com", password: "Admin@123" });
    adminToken = adminLogin.body.token;

    const therapistLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "therapist@ayursutra.com", password: "Therapist@123" });
    therapistToken = therapistLogin.body.token;

    const therapist2Login = await request(app)
      .post("/api/auth/login")
      .send({ email: "ananya.nair@ayursutra.com", password: "Therapist@123" });
    therapist2Token = therapist2Login.body.token;

    const patientLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "patient@ayursutra.com", password: "Patient@123" });
    patientToken = patientLogin.body.token;
  });

  it("should allow Admin to reschedule a scheduled session and create an audit log and notification", async () => {
    const res = await request(app)
      .patch("/api/sessions/ses_arun_day_5/reschedule")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        sessionDate: "2027-05-15",
        startTime: "14:00",
        reason: "Patient requested afternoon appointment due to personal travel.",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.session.sessionDate).toBe("2027-05-15");
    expect(res.body.session.startTime).toBe("14:00");
    expect(res.body.session.rescheduleReason).toBe("Patient requested afternoon appointment due to personal travel.");

    // Verify audit log
    const auditRes = await request(app)
      .get("/api/sessions/ses_arun_day_5/audit")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(auditRes.status).toBe(200);
    expect(auditRes.body.count).toBeGreaterThan(0);
    const rescheduleLog = auditRes.body.auditLogs.find((l: any) => l.action === "SESSION_RESCHEDULED");
    expect(rescheduleLog).toBeDefined();
    expect(rescheduleLog.reason).toContain("afternoon appointment");
  });

  it("should prevent rescheduling when therapist has a double-booking conflict (409 Conflict)", async () => {
    // Create an obstacle session for Dr. Rajesh Kumar (thp_001) on 2027-06-10 at 10:00
    sqlite.prepare(`
      INSERT INTO therapy_sessions (id, course_id, patient_id, therapist_id, room_id, day_number, session_date, start_time, end_time, status)
      VALUES ('ses_conflict_obstacle_1', 'crs_basti_001', 'pat_002', 'thp_001', 'room_102', 99, '2027-06-10', '10:00', '11:00', 'SCHEDULED')
    `).run();

    const res = await request(app)
      .patch("/api/sessions/ses_arun_day_6/reschedule")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        sessionDate: "2027-06-10",
        startTime: "10:00",
        therapistId: "thp_001",
        reason: "Attempted move to overlapping slot",
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("SCHEDULING_CONFLICT");
    expect(res.body.message).toContain("Dr. Rajesh Kumar is unavailable");

    sqlite.prepare("DELETE FROM therapy_sessions WHERE id = 'ses_conflict_obstacle_1'").run();
  });

  it("should allow Admin to cancel a session with a required reason", async () => {
    const res = await request(app)
      .patch("/api/sessions/ses_arun_day_7/cancel")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        reason: "Patient has medical contraindication reported by physician.",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.session.status).toBe("CANCELLED");
    expect(res.body.session.cancelReason).toContain("contraindication");
  });

  it("should allow Admin to change therapist for a scheduled session", async () => {
    const res = await request(app)
      .patch("/api/sessions/ses_arun_day_6/therapist")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        therapistId: "thp_002", // Dr. Ananya Nair
        reason: "Dr. Rajesh Kumar attending clinical seminar",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.session.therapistId).toBe("thp_002");
  });

  it("should allow Admin to change treatment suite for a scheduled session", async () => {
    const res = await request(app)
      .patch("/api/sessions/ses_arun_day_6/room")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        roomId: "room_104", // Panchakarma Suite
        reason: "Facility suite upgrade",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.session.roomId).toBe("room_104");
  });

  it("should allow Admin to pause and resume an active therapy course", async () => {
    // Pause
    const pauseRes = await request(app)
      .patch("/api/courses/crs_basti_001/pause")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Patient temporary flu pause" });

    expect(pauseRes.status).toBe(200);
    expect(pauseRes.body.course.status).toBe("PAUSED");

    // Resume
    const resumeRes = await request(app)
      .patch("/api/courses/crs_basti_001/resume")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Patient recovered and cleared for therapy" });

    expect(resumeRes.status).toBe(200);
    expect(resumeRes.body.course.status).toBe("ACTIVE");
  });

  it("should automatically mark course as COMPLETED when all sessions are completed", async () => {
    // Complete Day 4, 5, 6 (Day 1..3 already completed, Day 7 was cancelled above)
    await request(app)
      .patch("/api/sessions/ses_arun_day_4/complete")
      .set("Authorization", `Bearer ${therapistToken}`)
      .send({ treatmentNotes: "Day 4 procedure completed smoothly with herbal steam." });

    await request(app)
      .patch("/api/sessions/ses_arun_day_5/complete")
      .set("Authorization", `Bearer ${therapistToken}`)
      .send({ treatmentNotes: "Day 5 therapy completed with excellent patient tolerance." });

    await request(app)
      .patch("/api/sessions/ses_arun_day_6/complete")
      .set("Authorization", `Bearer ${therapist2Token}`)
      .send({ treatmentNotes: "Day 6 final treatment completed. Patient discharge consultation." });

    const courseRes = await request(app)
      .get("/api/courses/crs_basti_001")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(courseRes.status).toBe(200);
    expect(courseRes.body.course.status).toBe("COMPLETED");
  });

  it("should provide safe practitioner public profile for patients without sensitive data leakage", async () => {
    const res = await request(app)
      .get("/api/therapists/thp_001/profile")
      .set("Authorization", `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.profile.name).toBe("Dr. Rajesh Kumar");
    expect(res.body.profile.specialization).toBe("Panchakarma & Basti Specialist");
    expect(res.body.profile.avatarUrl).toBeDefined();
    expect(res.body.profile.bio).toBeDefined();
    expect(res.body.profile.passwordHash).toBeUndefined();
  });
});
