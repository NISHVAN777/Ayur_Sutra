import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../index.js";
import { sqlite } from "../db/index.js";
import { seedDatabase } from "../db/seed.js";
import { ReminderService } from "../services/reminder.service.js";

describe("8. AyurSutra Final Professional Enhancements Suite", () => {
  let adminToken: string;
  let therapist1Token: string; // Dr. Rajesh Kumar (thp_001) - Unrestricted
  let therapist2Token: string; // Dr. Ananya Nair (thp_002) - Restricted Mon-Sun 08:00-18:00
  let therapist3Token: string; // Dr. Vikram Joshi (thp_003) - Restricted Mon-Fri 09:00-17:00
  let patient1Token: string;   // Arun Sharma (pat_001)

  beforeAll(async () => {
    await seedDatabase();

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@ayursutra.com", password: "Admin@123" });
    adminToken = adminLogin.body.token;

    const therapist1Login = await request(app)
      .post("/api/auth/login")
      .send({ email: "therapist@ayursutra.com", password: "Therapist@123" });
    therapist1Token = therapist1Login.body.token;

    const therapist2Login = await request(app)
      .post("/api/auth/login")
      .send({ email: "ananya.nair@ayursutra.com", password: "Therapist@123" });
    therapist2Token = therapist2Login.body.token;

    const therapist3Login = await request(app)
      .post("/api/auth/login")
      .send({ email: "vikram.joshi@ayursutra.com", password: "Therapist@123" });
    therapist3Token = therapist3Login.body.token;

    const patient1Login = await request(app)
      .post("/api/auth/login")
      .send({ email: "patient@ayursutra.com", password: "Patient@123" });
    patient1Token = patient1Login.body.token;
  });

  // --- Enhancement 1: Therapist Full Therapy Plan ---
  describe("Enhancement 1: Full Therapy Plan Access", () => {
    it("should allow therapist to fetch full multi-day therapy plan for an assigned patient", async () => {
      const res = await request(app)
        .get("/api/therapist/patients/pat_001/therapy-plan")
        .set("Authorization", `Bearer ${therapist1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.patient.name).toBe("Arun Sharma");
      expect(res.body.activeCourse).toBeDefined();
      expect(res.body.activeCourse.sessions.length).toBe(7);
      expect(res.body.activeCourse.sessions[0].phase).toBe("PURVAKARMA");
      expect(res.body.activeCourse.sessions[0].procedure).toBe("Deepana & Pachana");
    });
  });

  // --- Enhancement 2 & 3 & 4: Phases, Procedures, Clinical Vitals, and Dietary Guidelines ---
  describe("Enhancement 2, 3, 4: Panchakarma Clinical Observations & Vitals", () => {
    it("should record complete vitals, pathya/apathya, and clinical notes upon session completion", async () => {
      const res = await request(app)
        .patch("/api/sessions/ses_arun_day_4/complete")
        .set("Authorization", `Bearer ${therapist1Token}`)
        .send({
          treatmentNotes: "Day 4 Matra Basti administered smoothly with 60ml herbal formulation. Patient showed good retention.",
          bloodPressure: "120/78",
          pulseRate: 72,
          temperature: 98.4,
          weight: 70.2,
          symptomScore: 3,
          pathya: "Warm rice gruel with cumin and ghee",
          apathya: "Cold drinks, fried foods, raw salads",
          lifestyleInstructions: "Avoid direct breeze, afternoon rest recommended",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.session.status).toBe("COMPLETED");
      expect(res.body.session.bloodPressure).toBe("120/78");
      expect(res.body.session.pulseRate).toBe(72);
      expect(res.body.session.temperature).toBe(98.4);
      expect(res.body.session.weight).toBe(70.2);
      expect(res.body.session.symptomScore).toBe(3);
      expect(res.body.session.pathya).toContain("Warm rice gruel");
      expect(res.body.session.apathya).toContain("Cold drinks");
      expect(res.body.session.lifestyleInstructions).toContain("afternoon rest");
    });

    it("should prevent non-admin/therapist tampering with phase & procedure during notes update", async () => {
      const res = await request(app)
        .patch("/api/sessions/ses_arun_day_4/notes")
        .set("Authorization", `Bearer ${therapist1Token}`)
        .send({
          treatmentNotes: "Updated observation: patient had peaceful rest.",
          phase: "PASCHAT_KARMA", // should be ignored / preserved as PRADHANA_KARMA
        });

      expect(res.status).toBe(200);
      expect(res.body.session.phase).toBe("PRADHANA_KARMA");
    });
  });

  // --- Enhancement 5 & 6: Therapist Availability Rules & Conflict Error Codes ---
  describe("Enhancement 5 & 6: Therapist Availability, Leaves & Error Codes", () => {
    it("should allow scheduling Dr. Rajesh Kumar (thp_001) at any time as he has NO availability record (UNRESTRICTED)", async () => {
      const res = await request(app)
        .post("/api/courses/check-availability")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          durationDays: 1,
          startDate: "2027-10-10",
          therapistId: "thp_001",
          roomId: "room_101",
          sessionTime: "06:00", // Early morning time
        });

      expect(res.status).toBe(200);
      expect(res.body.isAvailable).toBe(true);
    });

    it("should reject scheduling Dr. Vikram Joshi (thp_003) on Saturday (weekly off) with THERAPIST_UNAVAILABLE", async () => {
      // 2027-10-09 is a Saturday
      const res = await request(app)
        .post("/api/courses")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          patientId: "pat_004",
          therapyName: "Detox Therapy",
          durationDays: 1,
          startDate: "2027-10-09", // Saturday
          therapistId: "thp_003",  // Works Mon-Fri
          roomId: "room_104",
          defaultSessionTime: "10:00",
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("THERAPIST_UNAVAILABLE");
      expect(res.body.message).toContain("unavailable");
    });

    it("should reject scheduling when practitioner is on approved leave", async () => {
      // Add leave for Dr. Vikram Joshi on 2027-11-01 to 2027-11-05
      await request(app)
        .post("/api/admin/therapists/thp_003/leaves")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          startDate: "2027-11-01",
          endDate: "2027-11-05",
          reason: "Attending National Ayurveda Summit",
        });

      const res = await request(app)
        .post("/api/courses")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          patientId: "pat_004",
          therapyName: "Detox Therapy",
          durationDays: 1,
          startDate: "2027-11-02", // Tuesday during leave
          therapistId: "thp_003",
          roomId: "room_104",
          defaultSessionTime: "10:00",
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("THERAPIST_UNAVAILABLE");
      expect(res.body.message).toContain("approved leave");
    });
  });

  // --- Enhancement 7: Procedure ↔ Treatment Room Compatibility ---
  describe("Enhancement 7: Procedure ↔ Treatment Room Compatibility", () => {
    it("should reject course creation when room is incompatible with procedure (ROOM_PROCEDURE_INCOMPATIBLE)", async () => {
      // Shirodhara procedure in room_102 (Abhyanga Suite)
      const res = await request(app)
        .post("/api/courses")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          patientId: "pat_004",
          therapyName: "Shirodhara",
          durationDays: 1,
          startDate: "2027-12-01",
          therapistId: "thp_001",
          roomId: "room_102", // Abhyanga Suite is incompatible with Shirodhara
          defaultSessionTime: "10:00",
          plan: [
            {
              dayNumber: 1,
              procedure: "Shirodhara",
              phase: "PRADHANA_KARMA",
              roomId: "room_102",
              therapistId: "thp_001",
            }
          ]
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe("ROOM_PROCEDURE_INCOMPATIBLE");
      expect(res.body.message).toContain("not compatible");
    });
  });

  // --- Enhancement 8: Course Pause & Resume with date shifting and revalidation ---
  describe("Enhancement 8: Course Pause & Resume Lifecycle", () => {
    let testCourseId: string;

    beforeAll(async () => {
      const courseRes = await request(app)
        .post("/api/courses")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          patientId: "pat_004",
          therapyName: "5-Day Pause Test",
          durationDays: 5,
          startDate: "2028-01-10",
          therapistId: "thp_001",
          roomId: "room_104",
          defaultSessionTime: "14:00",
        });
      testCourseId = courseRes.body.course.id;
    });

    it("should pause course and set status to PAUSED", async () => {
      const res = await request(app)
        .patch(`/api/courses/${testCourseId}/pause`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "Patient temporary flu" });

      expect(res.status).toBe(200);
      expect(res.body.course.status).toBe("PAUSED");
      expect(res.body.course.pausedAt).toBeDefined();
    });

    it("should resume course shifting remaining sessions to new resumeStartDate", async () => {
      const res = await request(app)
        .patch(`/api/courses/${testCourseId}/resume`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          resumeStartDate: "2028-01-20",
          reason: "Patient cleared for resumption",
        });

      expect(res.status).toBe(200);
      expect(res.body.course.status).toBe("ACTIVE");
      expect(res.body.course.sessions[0].sessionDate).toBe("2028-01-20");
      expect(res.body.course.sessions[4].sessionDate).toBe("2028-01-24");
    });
  });

  // --- Enhancement 10: Secure Registration Role Restriction & Admin Therapist Onboarding ---
  describe("Enhancement 10: Role-restricted Registration & Admin Staff Onboarding", () => {
    it("should FORBID public registration with role=ADMIN (403 Forbidden)", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Malicious Admin",
          email: "hacker@test.com",
          password: "Password@123",
          role: "ADMIN",
          phone: "+91 99999 88888",
          dateOfBirth: "1990-01-01",
          gender: "Male",
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
    });

    it("should FORBID public registration with role=THERAPIST (403 Forbidden)", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Unregistered Doctor",
          email: "doctor@test.com",
          password: "Password@123",
          role: "THERAPIST",
          phone: "+91 99999 77777",
          dateOfBirth: "1990-01-01",
          gender: "Female",
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
    });

    it("should allow ADMIN to onboard therapist via POST /api/admin/therapists", async () => {
      const res = await request(app)
        .post("/api/admin/therapists")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Dr. Sandeep Varma",
          email: "sandeep.varma@ayursutra.com",
          password: "Therapist@123",
          specialization: "Rasayana & Kayachikitsa",
          phone: "+91 98888 11111",
          experience: "9 years",
          availability: {
            workingDays: [1, 2, 3, 4, 5, 6],
            workingHoursStart: "09:00",
            workingHoursEnd: "18:00",
            weeklyOff: 0,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.therapist.name).toBe("Dr. Sandeep Varma");
    });
  });

  // --- Enhancement 11: Reminder Deduplication and Course Status Suppression ---
  describe("Enhancement 11: Deduplicated Reminder Engine", () => {
    it("should generate reminders and deduplicate multiple runs on same date", async () => {
      // Clean previous reminder logs
      sqlite.prepare("DELETE FROM reminder_logs").run();
      sqlite.prepare("DELETE FROM notifications WHERE type = 'REMINDER'").run();

      const run1Count = await ReminderService.generateUpcomingSessionReminders("2027-01-09");
      const run2Count = await ReminderService.generateUpcomingSessionReminders("2027-01-09");

      // Run 2 must generate 0 duplicate reminders
      expect(run2Count).toBe(0);

      // Verify deduplication logs exist
      const logs = sqlite.prepare("SELECT count(*) as c FROM reminder_logs").get() as { c: number };
      expect(logs.c).toBe(run1Count);
    });
  });

  // --- Enhancement 12: Admin Compatibility & Availability CRUD ---
  describe("Enhancement 12: Admin Configuration CRUD", () => {
    it("should allow Admin to fetch, add, and remove procedure room compatibility rules", async () => {
      // List
      const listRes = await request(app)
        .get("/api/admin/compatibility")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(listRes.status).toBe(200);
      expect(listRes.body.compatibilities.length).toBeGreaterThan(0);

      // Add
      const addRes = await request(app)
        .post("/api/admin/compatibility")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          procedureName: "Kati Basti",
          roomId: "room_101",
        });
      expect(addRes.status).toBe(201);
      const newId = addRes.body.compatibility.id;

      // Delete
      const delRes = await request(app)
        .delete(`/api/admin/compatibility/${newId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);
    });
  });
});
