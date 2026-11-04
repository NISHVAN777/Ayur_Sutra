import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../index.js";
import { sqlite } from "../db/index.js";
import { seedDatabase } from "../db/seed.js";

describe("9. Hackathon Tasks Suite", () => {
  let adminToken: string;
  let therapist1Token: string; // Dr. Rajesh Kumar (thp_001) - treats Arun Sharma
  let therapist3Token: string; // Dr. Vikram Joshi (thp_003) - not assigned to Arun
  let patient1Token: string; // Arun Sharma (pat_001)

  const login = async (email: string, password: string) =>
    (await request(app).post("/api/auth/login").send({ email, password })).body.token;

  const createCourse = async (patientId: string, startDate: string) => {
    const res = await request(app)
      .post("/api/courses")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ patientId, therapyName: "Basti", durationDays: 7, startDate, therapistId: "thp_001", roomId: "room_101", defaultSessionTime: "10:00" });
    expect(res.status).toBe(201);
    return res.body.course?.id || res.body.data?.id || res.body.id;
  };

  beforeAll(async () => {
    await seedDatabase();
    adminToken = await login("admin@ayursutra.com", "Admin@123");
    therapist1Token = await login("therapist@ayursutra.com", "Therapist@123");
    therapist3Token = await login("vikram.joshi@ayursutra.com", "Therapist@123");
    patient1Token = await login("patient@ayursutra.com", "Patient@123");
  });

  // ---------------- Task 1: Daily wellness log with AI review ----------------
  describe("Task 1: Daily Wellness Log", () => {
    const entry = {
      breakfast: "Rice kanji",
      lunch: "Moong dal khichdi",
      dinner: "Vegetable soup",
      agniStatus: "MANDA",
      bowelStatus: "CONSTIPATED",
      reactions: ["Heaviness"],
      energyLevel: 2,
      discomfortLevel: 3,
      notes: "Felt heavy after lunch",
    };

    it("should save the patient's log and return pre- and post-treatment guidance", async () => {
      const res = await request(app).post("/api/wellness-logs").set("Authorization", `Bearer ${patient1Token}`).send(entry);
      expect(res.status).toBe(201);
      const g = res.body.log.guidance;
      expect(g.preTreatment.length).toBeGreaterThan(0);
      expect(g.postTreatment.length).toBeGreaterThan(0);
      expect(g.preTreatment.join(" ")).toMatch(/light, warm meal/i);
      expect(res.body.log.dayNumber).toBeGreaterThan(0);
    });

    it("should link guidance to the next scheduled procedure (Basti)", async () => {
      const res = await request(app).get("/api/wellness-logs").set("Authorization", `Bearer ${patient1Token}`);
      expect(res.status).toBe(200);
      const today = res.body.logs[0];
      expect([...today.guidance.preTreatment, ...today.guidance.postTreatment].join(" ")).toMatch(/Basti/);
    });

    it("should update the same day's log instead of creating a duplicate", async () => {
      await request(app).post("/api/wellness-logs").set("Authorization", `Bearer ${patient1Token}`).send({ ...entry, agniStatus: "SAMA" });
      const res = await request(app).get("/api/wellness-logs").set("Authorization", `Bearer ${patient1Token}`);
      const dates = res.body.logs.map((l: any) => l.logDate);
      expect(new Set(dates).size).toBe(dates.length);
      expect(res.body.logs[0].agniStatus).toBe("SAMA");
    });

    it("should raise an alert and notify the therapist for warning signs", async () => {
      const res = await request(app)
        .post("/api/wellness-logs")
        .set("Authorization", `Bearer ${patient1Token}`)
        .send({ ...entry, reactions: ["Dizziness", "Nausea"], discomfortLevel: 8 });
      expect(res.body.log.guidance.alerts.length).toBeGreaterThan(0);
      const notif = sqlite
        .prepare(`SELECT title FROM notifications WHERE user_id = 'usr_therapist_001' AND title LIKE 'Wellness alert%'`)
        .get() as { title: string } | undefined;
      expect(notif?.title).toContain("Arun Sharma");
    });

    it("should allow the assigned therapist but forbid an unassigned therapist (403)", async () => {
      const ok = await request(app).get("/api/wellness-logs/patient/pat_001").set("Authorization", `Bearer ${therapist1Token}`);
      expect(ok.status).toBe(200);
      expect(ok.body.logs.length).toBeGreaterThanOrEqual(4);
      const denied = await request(app).get("/api/wellness-logs/patient/pat_001").set("Authorization", `Bearer ${therapist3Token}`);
      expect(denied.status).toBe(403);
    });

    it("should reject an invalid Agni status (400)", async () => {
      const res = await request(app).post("/api/wellness-logs").set("Authorization", `Bearer ${patient1Token}`).send({ ...entry, agniStatus: "STRONG" });
      expect(res.status).toBe(400);
    });
  });

  // ---------------- Task 2: Disruption rescheduling ----------------
  describe("Task 2: Disruption Rescheduling", () => {
    it("should reassign Days 3-5 to a qualified therapist and keep the order of all remaining days", async () => {
      await createCourse("pat_004", "2027-03-01"); // Monday 1 March 2027, 7 days
      const res = await request(app)
        .post("/api/admin/disruptions/preview")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ therapistId: "thp_001", startDate: "2027-03-03", endDate: "2027-03-05", reason: "Medical leave" });

      expect(res.status).toBe(200);
      expect(res.body.affectedSessions).toBe(3);
      expect(res.body.unresolved).toBe(0);
      const items = res.body.courses[0].items;
      expect(items.map((i: any) => i.dayNumber)).toEqual([3, 4, 5, 6, 7]);
      for (const i of items.filter((x: any) => x.dayNumber <= 5)) {
        expect(i.to.therapistId).toBe("thp_003"); // only other therapist qualified for Basti
        expect(i.to.date).toBe(i.from.date);
      }
      // After the leave the original therapist continues
      expect(items.find((i: any) => i.dayNumber === 6).to.therapistId).toBe("thp_001");
      const dates = items.map((i: any) => i.to.date);
      expect([...dates].sort()).toEqual(dates);
    });

    it("should never assign a therapist who is not qualified for the procedure", async () => {
      const res = await request(app)
        .post("/api/admin/disruptions/preview")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ therapistId: "thp_001", startDate: "2027-03-03", endDate: "2027-03-05", reason: "Medical leave" });
      const basti = res.body.courses[0].items.filter((i: any) => i.procedure === "Basti");
      expect(basti.every((i: any) => i.to.therapistId !== "thp_002")).toBe(true);
    });

    it("should shift a day forward when no qualified therapist is free, keeping the sequence", async () => {
      await createCourse("pat_003", "2027-04-05"); // Monday 5 April 2027
      // Dr. Vikram Joshi (the other Basti therapist) is already on leave 7-9 April
      await request(app).post("/api/admin/therapists/thp_003/leaves").set("Authorization", `Bearer ${adminToken}`)
        .send({ startDate: "2027-04-07", endDate: "2027-04-09", reason: "Conference" });

      const res = await request(app)
        .post("/api/admin/disruptions/preview")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ therapistId: "thp_001", startDate: "2027-04-07", endDate: "2027-04-07", reason: "Personal leave" });

      expect(res.body.unresolved).toBe(0);
      const items = res.body.courses.find((c: any) => c.patientId === "pat_003").items;
      const day3 = items.find((i: any) => i.dayNumber === 3);
      expect(day3.from.date).toBe("2027-04-07");
      expect(day3.to.date).toBe("2027-04-08");
      expect(day3.changes).toContain("DATE");
      const dates = items.map((i: any) => i.to.date);
      expect(new Set(dates).size).toBe(dates.length);
      expect([...dates].sort()).toEqual(dates);
      expect(items[items.length - 1].to.date).toBe("2027-04-12");
    });

    it("should apply the plan atomically with leave, audit logs and notifications", async () => {
      const res = await request(app)
        .post("/api/admin/disruptions/apply")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ therapistId: "thp_001", startDate: "2027-03-03", endDate: "2027-03-05", reason: "Medical leave" });
      expect(res.status).toBe(200);

      const moved = sqlite
        .prepare(`SELECT COUNT(*) AS n FROM therapy_sessions WHERE patient_id = 'pat_004' AND session_date BETWEEN '2027-03-03' AND '2027-03-05' AND therapist_id = 'thp_003'`)
        .get() as { n: number };
      expect(moved.n).toBe(3);
      const leave = sqlite.prepare(`SELECT COUNT(*) AS n FROM therapist_leaves WHERE therapist_id = 'thp_001' AND start_date = '2027-03-03'`).get() as { n: number };
      expect(leave.n).toBe(1);
      const audits = sqlite.prepare(`SELECT COUNT(*) AS n FROM audit_logs WHERE reason = 'Disruption: Medical leave'`).get() as { n: number };
      expect(audits.n).toBe(3);

      // Running the preview again finds nothing left to move
      const again = await request(app)
        .post("/api/admin/disruptions/preview")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ therapistId: "thp_001", startDate: "2027-03-03", endDate: "2027-03-05", reason: "Medical leave" });
      expect(again.body.affectedSessions).toBe(0);
    });

    it("should forbid non-admin users from running the rescheduler (403)", async () => {
      const res = await request(app)
        .post("/api/admin/disruptions/preview")
        .set("Authorization", `Bearer ${therapist1Token}`)
        .send({ therapistId: "thp_001", startDate: "2027-03-03", endDate: "2027-03-05", reason: "Leave" });
      expect(res.status).toBe(403);
    });
  });
});
