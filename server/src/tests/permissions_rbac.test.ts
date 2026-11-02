import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../index.js";
import { seedDatabase } from "../db/seed.js";

describe("7. Patient & Practitioner Permissions & Actions Suite", () => {
  let adminToken: string;
  let therapist1Token: string; // Dr. Rajesh Kumar (thp_001)
  let therapist2Token: string; // Dr. Ananya Nair (thp_002)
  let patient1Token: string;   // Arun Sharma (pat_001)
  let patient2Token: string;   // Meera Patel (pat_002)

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

    const patient1Login = await request(app)
      .post("/api/auth/login")
      .send({ email: "patient@ayursutra.com", password: "Patient@123" });
    patient1Token = patient1Login.body.token;

    const patient2Login = await request(app)
      .post("/api/auth/login")
      .send({ email: "meera.patel@ayursutra.com", password: "Patient@123" });
    patient2Token = patient2Login.body.token;
  });

  // --- Patient Permissions ---
  describe("Patient Actions & Boundary Enforcement", () => {
    it("should allow PATIENT to submit a reschedule request for own scheduled session", async () => {
      // ses_arun_day_4 is Arun Sharma's session (pat_001)
      const res = await request(app)
        .post("/api/sessions/ses_arun_day_4/request-reschedule")
        .set("Authorization", `Bearer ${patient1Token}`)
        .send({
          reason: "Need to shift to afternoon due to morning travel",
          preferredDate: "2027-05-15",
          preferredTime: "14:00",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("Reschedule request submitted successfully");
    });

    it("should allow PATIENT to submit a cancellation request for own scheduled session", async () => {
      const res = await request(app)
        .post("/api/sessions/ses_arun_day_5/request-cancel")
        .set("Authorization", `Bearer ${patient1Token}`)
        .send({
          reason: "Unavoidable family emergency",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain("Cancellation request submitted successfully");
    });

    it("should FORBID PATIENT from directly modifying or rescheduling session (403 Forbidden)", async () => {
      const res = await request(app)
        .patch("/api/sessions/ses_arun_day_4/reschedule")
        .set("Authorization", `Bearer ${patient1Token}`)
        .send({
          sessionDate: "2027-05-16",
          startTime: "11:00",
          reason: "Direct modification attempt",
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
    });

    it("should FORBID PATIENT from directly cancelling session (403 Forbidden)", async () => {
      const res = await request(app)
        .patch("/api/sessions/ses_arun_day_4/cancel")
        .set("Authorization", `Bearer ${patient1Token}`)
        .send({
          reason: "Direct cancel attempt",
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
    });

    it("should FORBID PATIENT from requesting reschedule on another patient's session (403 Forbidden)", async () => {
      // ses_meera_day_7 belongs to Meera Patel (pat_002)
      const res = await request(app)
        .post("/api/sessions/ses_meera_day_7/request-reschedule")
        .set("Authorization", `Bearer ${patient1Token}`)
        .send({
          reason: "Attempting to modify someone else's session",
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("Access denied");
    });
  });

  // --- Practitioner Permissions ---
  describe("Practitioner Clinical Actions & Ownership Enforcement", () => {
    it("should allow PRACTITIONER to complete own assigned session and record notes (200 OK)", async () => {
      // ses_arun_day_4 is assigned to Dr. Rajesh Kumar (thp_001)
      const res = await request(app)
        .patch("/api/sessions/ses_arun_day_4/complete")
        .set("Authorization", `Bearer ${therapist1Token}`)
        .send({
          treatmentNotes: "Day 4 Basti procedure completed with standard herbal formulation. Patient showed excellent response.",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.session.status).toBe("COMPLETED");
      expect(res.body.session.treatmentNotes).toContain("Day 4 Basti procedure completed");
    });

    it("should allow PRACTITIONER to update treatment notes for own assigned session", async () => {
      const res = await request(app)
        .patch("/api/sessions/ses_arun_day_4/notes")
        .set("Authorization", `Bearer ${therapist1Token}`)
        .send({
          treatmentNotes: "Updated clinical notes: Patient resting well post therapy. Advised herbal tea.",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.session.treatmentNotes).toContain("Updated clinical notes");
    });

    it("should FORBID PRACTITIONER from completing another practitioner's session (403 Forbidden)", async () => {
      // ses_meera_day_6 is assigned to Dr. Ananya Nair (thp_002)
      // Dr. Rajesh Kumar (therapist1Token) attempts to complete it
      const res = await request(app)
        .patch("/api/sessions/ses_meera_day_6/complete")
        .set("Authorization", `Bearer ${therapist1Token}`)
        .send({
          treatmentNotes: "Unauthorized notes by another doctor",
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("Access denied: You can only complete your own assigned therapy sessions.");
    });

    it("should FORBID PRACTITIONER from updating notes for another practitioner's session (403 Forbidden)", async () => {
      const res = await request(app)
        .patch("/api/sessions/ses_meera_day_6/notes")
        .set("Authorization", `Bearer ${therapist1Token}`)
        .send({
          treatmentNotes: "Unauthorized notes edit",
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("Access denied: You can only update notes for your own assigned therapy sessions.");
    });

    it("should FORBID PRACTITIONER from directly rescheduling or reassigning rooms (403 Forbidden)", async () => {
      const res = await request(app)
        .patch("/api/sessions/ses_arun_day_6/reschedule")
        .set("Authorization", `Bearer ${therapist1Token}`)
        .send({
          sessionDate: "2027-05-18",
          startTime: "10:00",
          reason: "Direct practitioner reschedule attempt",
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
    });

    it("should allow PRACTITIONER to submit a reschedule request for own assigned session (200 OK)", async () => {
      const res = await request(app)
        .post("/api/sessions/ses_arun_day_6/request-reschedule")
        .set("Authorization", `Bearer ${therapist1Token}`)
        .send({
          reason: "Practitioner attending medical seminar",
          preferredDate: "2027-05-19",
          preferredTime: "11:00",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // --- Admin Clinical Control & Audit Verification ---
  describe("Admin Full Control & Audit Verification", () => {
    it("should allow ADMIN to view session audit trail including reschedule requests", async () => {
      const res = await request(app)
        .get("/api/sessions/ses_arun_day_4/audit")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.auditLogs.length).toBeGreaterThan(0);
      const reqAction = res.body.auditLogs.find((l: any) => l.action === "SESSION_RESCHEDULE_REQUESTED");
      expect(reqAction).toBeDefined();
    });

    it("should allow ADMIN to execute direct rescheduling with conflict validation and audit logging", async () => {
      const res = await request(app)
        .patch("/api/sessions/ses_arun_day_7/reschedule")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          sessionDate: "2027-07-20",
          startTime: "14:00",
          reason: "Admin confirmed reschedule after patient request",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.session.sessionDate).toBe("2027-07-20");
      expect(res.body.session.startTime).toBe("14:00");
    });
  });

  // --- Missed Session Lifecycle & Replacement Scheduling ---
  describe("Missed Session Lifecycle, Replacements & Duplicate Prevention", () => {
    beforeAll(async () => {
      // Mark ses_meera_day_8 as MISSED by Dr. Ananya Nair
      await request(app)
        .patch("/api/sessions/ses_meera_day_8/missed")
        .set("Authorization", `Bearer ${therapist2Token}`)
        .send({ reason: "Patient missed appointment due to travel" });
    });

    it("should prevent direct rescheduling of a MISSED session (400 Bad Request)", async () => {
      const res = await request(app)
        .patch("/api/sessions/ses_meera_day_8/reschedule")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          sessionDate: "2027-07-22",
          startTime: "10:00",
          reason: "Direct reschedule attempt on missed session",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Cannot reschedule a missed session directly");
    });

    it("should allow PATIENT to submit a replacement request for own MISSED session (200 OK)", async () => {
      const res = await request(app)
        .post("/api/sessions/ses_meera_day_8/request-replacement")
        .set("Authorization", `Bearer ${patient2Token}`)
        .send({
          preferredDate: "2027-08-01",
          preferredTime: "11:30",
          reason: "Requesting replacement session for missed Day 8 procedure",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.request.requestType).toBe("REPLACEMENT");
      expect(res.body.request.status).toBe("PENDING");
    });

    it("should REJECT duplicate pending request for the same session and type (400 Bad Request)", async () => {
      const res = await request(app)
        .post("/api/sessions/ses_meera_day_8/request-replacement")
        .set("Authorization", `Bearer ${patient2Token}`)
        .send({
          preferredDate: "2027-08-02",
          preferredTime: "14:00",
          reason: "Duplicate replacement attempt",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("A pending REPLACEMENT request already exists for this session");
    });

    it("should allow ADMIN to view all requests via GET /api/requests", async () => {
      const res = await request(app)
        .get("/api/requests")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.requests.length).toBeGreaterThan(0);
    });

    it("should allow ADMIN to APPROVE a replacement request, creating a replacement session and preserving MISSED status", async () => {
      // Find the pending replacement request
      const listRes = await request(app)
        .get("/api/requests")
        .set("Authorization", `Bearer ${adminToken}`);

      const pendingRepl = listRes.body.requests.find(
        (r: any) => r.sessionId === "ses_meera_day_8" && r.status === "PENDING"
      );
      expect(pendingRepl).toBeDefined();

      // Approve request
      const approveRes = await request(app)
        .post(`/api/requests/${pendingRepl.id}/approve`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          sessionDate: "2027-08-05",
          startTime: "11:30",
          notes: "Approved replacement slot at quiet clinic time",
        });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.success).toBe(true);
      expect(approveRes.body.session.replacementForSessionId).toBe("ses_meera_day_8");
      expect(approveRes.body.session.status).toBe("SCHEDULED");

      // Verify original session ses_meera_day_8 is STILL MISSED
      const origRes = await request(app)
        .get("/api/sessions/ses_meera_day_8")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(origRes.status).toBe(200);
      expect(origRes.body.session.status).toBe("MISSED");
    });

    it("should allow PRACTITIONER to submit a replacement recommendation (200 OK)", async () => {
      // ses_meera_day_9 is SCHEDULED, let's mark it MISSED by Dr. Ananya Nair
      await request(app)
        .patch("/api/sessions/ses_meera_day_9/missed")
        .set("Authorization", `Bearer ${therapist2Token}`)
        .send({ reason: "Patient did not attend appointment" });

      const recRes = await request(app)
        .post("/api/sessions/ses_meera_day_9/recommend-reschedule")
        .set("Authorization", `Bearer ${therapist2Token}`)
        .send({
          preferredDate: "2027-08-10",
          preferredTime: "11:30",
          reason: "Dr. Nair recommending replacement Shirodhara procedure",
        });

      expect(recRes.status).toBe(200);
      expect(recRes.body.success).toBe(true);
      expect(recRes.body.request.requestType).toBe("REPLACEMENT");
      expect(recRes.body.request.requestedByRole).toBe("THERAPIST");
    });

    it("should allow ADMIN to REJECT a request with mandatory reason", async () => {
      const listRes = await request(app)
        .get("/api/requests")
        .set("Authorization", `Bearer ${adminToken}`);

      const pendingRec = listRes.body.requests.find(
        (r: any) => r.sessionId === "ses_meera_day_9" && r.status === "PENDING"
      );
      expect(pendingRec).toBeDefined();

      const rejectRes = await request(app)
        .post(`/api/requests/${pendingRec.id}/reject`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          reason: "Patient has requested to pause therapy course; replacement declined per patient request.",
        });

      expect(rejectRes.status).toBe(200);
      expect(rejectRes.body.success).toBe(true);

      // Verify request is marked REJECTED
      const updatedList = await request(app)
        .get("/api/requests")
        .set("Authorization", `Bearer ${adminToken}`);

      const rejectedReq = updatedList.body.requests.find((r: any) => r.id === pendingRec.id);
      expect(rejectedReq.status).toBe("REJECTED");
      expect(rejectedReq.adminNotes).toContain("Patient has requested to pause therapy course");
    });
  });
});
