import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../index.js";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";

describe("4. Session Completion, Notes & Dynamic Progress Suite", () => {
  let therapistToken: string;
  let patientToken: string;

  beforeAll(async () => {
    const therapistLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "therapist@ayursutra.com", password: "Therapist@123" });
    therapistToken = therapistLogin.body.token;

    const patientLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "patient@ayursutra.com", password: "Patient@123" });
    patientToken = patientLogin.body.token;
  });

  it("should allow therapist to complete a session and record clinical notes & completed_at", async () => {
    // Complete Arun Sharma's Day 4 session (ses_arun_day_4)
    const notes = "Day 4 Matra Basti administered with Mahanarayana Taila (70ml). Patient observed 4 hour retention with notable ease in lumbar stiffness.";
    
    const res = await request(app)
      .patch("/api/sessions/ses_arun_day_4/complete")
      .set("Authorization", `Bearer ${therapistToken}`)
      .send({ treatmentNotes: notes });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.session.status).toBe("COMPLETED");
    expect(res.body.session.treatmentNotes).toBe(notes);
    expect(res.body.session.completedAt).toBeDefined();
  });

  it("should calculate dynamic progress percentage accurately (4 completed of 7 = 57.14%)", async () => {
    const res = await request(app)
      .get("/api/patient/dashboard")
      .set("Authorization", `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.stats.totalSessions).toBe(7);
    expect(res.body.stats.completedSessions).toBe(4);
    expect(res.body.stats.remainingSessions).toBe(3);
    expect(res.body.stats.progressPercentage).toBe(57.14);
  });

  it("should correctly identify next scheduled session (Day 5)", async () => {
    const res = await request(app)
      .get("/api/patient/course")
      .set("Authorization", `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.activeCourse.nextSession).toBeDefined();
    expect(res.body.activeCourse.nextSession.dayNumber).toBe(5);
    expect(res.body.activeCourse.nextSession.status).toBe("SCHEDULED");
  });

  it("should allow therapist to update clinical treatment notes", async () => {
    const updatedNote = "Updated note: Patient reported mild appetite increase after evening herbal tea.";
    
    const res = await request(app)
      .post("/api/sessions/ses_arun_day_4/notes")
      .set("Authorization", `Bearer ${therapistToken}`)
      .send({ treatmentNotes: updatedNote });

    expect(res.status).toBe(200);
    expect(res.body.session.treatmentNotes).toBe(updatedNote);
  });
});
