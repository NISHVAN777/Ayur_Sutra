import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../index.js";
import { db, sqlite, schema } from "../db/index.js";
import { seedDatabase } from "../db/seed.js";

describe("3. Multi-Day Scheduling Engine & Atomic Conflict Rollback Suite", () => {
  let adminToken: string;

  beforeAll(async () => {
    await seedDatabase();
    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@ayursutra.com", password: "Admin@123" });
    adminToken = adminLogin.body.token;
  });

  it("should preview schedule availability across 7 days without conflicts", async () => {
    const res = await request(app)
      .post("/api/courses/check-availability")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        durationDays: 7,
        startDate: "2027-01-10",
        therapistId: "thp_001",
        roomId: "room_101",
        sessionTime: "09:00",
      });

    expect(res.status).toBe(200);
    expect(res.body.isAvailable).toBe(true);
    expect(res.body.sessions.length).toBe(7);
    expect(res.body.conflictCount).toBe(0);
    expect(res.body.sessions[0].sessionDate).toBe("2027-01-10");
    expect(res.body.sessions[6].sessionDate).toBe("2027-01-16");
  });

  it("should automatically generate all 7 daily sessions connected to 1 course", async () => {
    const res = await request(app)
      .post("/api/courses")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        patientId: "pat_004", // Priya Menon
        therapyName: "7-Day Nasya Karma Detox",
        description: "Classical Nasya therapy for sinus clarification and Prana balancing.",
        durationDays: 7,
        startDate: "2027-02-01",
        therapistId: "thp_002", // Dr. Ananya Nair
        roomId: "room_103", // Charaka Haven
        defaultSessionTime: "08:30",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.course).toBeDefined();
    expect(res.body.course.durationDays).toBe(7);
    expect(res.body.course.sessions.length).toBe(7);

    // Verify day numbers and dates
    res.body.course.sessions.forEach((s: any, idx: number) => {
      expect(s.dayNumber).toBe(idx + 1);
      expect(s.status).toBe("SCHEDULED");
      expect(s.startTime).toBe("08:30");
      expect(s.endTime).toBe("09:30");
    });

    expect(res.body.course.sessions[0].sessionDate).toBe("2027-02-01");
    expect(res.body.course.sessions[6].sessionDate).toBe("2027-02-07");
  });

  it("should detect THERAPIST double-booking conflict and return 409 Conflict", async () => {
    const res = await request(app)
      .post("/api/courses")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        patientId: "pat_003",
        therapyName: "5-Day Shirodhara",
        durationDays: 5,
        startDate: "2027-02-03", // Overlaps with Priya's Day 3
        therapistId: "thp_002", // Dr. Ananya Nair
        roomId: "room_101", // Different room, but same therapist
        defaultSessionTime: "08:30",
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("SCHEDULING_CONFLICT");
    expect(res.body.resourceType).toBe("THERAPIST");
    expect(res.body.message).toContain("Dr. Ananya Nair is unavailable");
  });

  it("should detect ROOM double-booking conflict and return 409 Conflict", async () => {
    const res = await request(app)
      .post("/api/courses")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        patientId: "pat_003",
        therapyName: "5-Day Abhyanga",
        durationDays: 5,
        startDate: "2027-02-02",
        therapistId: "thp_001", // Dr. Rajesh Kumar (available)
        roomId: "room_103", // Room 103 is booked for Priya at 08:30
        defaultSessionTime: "08:30",
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("SCHEDULING_CONFLICT");
    expect(res.body.resourceType).toBe("ROOM");
    expect(res.body.message).toContain("Room 103");
  });

  it("MANDATORY TEST: should completely ROLLBACK transaction when Day 4 has conflict (0 residual records)", async () => {
    const obstacleSessionId = "ses_obstacle_test_001";
    const obstacleCourseId = "crs_obstacle_test_001";

    sqlite.prepare(`
      INSERT INTO therapy_courses (id, patient_id, therapy_name, duration_days, start_date, default_session_time, status)
      VALUES (?, 'pat_004', 'Obstacle Course', 1, '2027-03-04', '10:00', 'ACTIVE')
    `).run(obstacleCourseId);

    sqlite.prepare(`
      INSERT INTO therapy_sessions (id, course_id, patient_id, therapist_id, room_id, day_number, session_date, start_time, end_time, status)
      VALUES (?, ?, 'pat_004', 'thp_003', 'room_102', 1, '2027-03-04', '10:00', '11:00', 'SCHEDULED')
    `).run(obstacleSessionId, obstacleCourseId);

    const beforeCount = sqlite.prepare("SELECT count(*) as count FROM therapy_sessions").get() as { count: number };

    const res = await request(app)
      .post("/api/courses")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        patientId: "pat_004",
        therapyName: "7-Day Vamana Detox Course",
        durationDays: 7,
        startDate: "2027-03-01",
        therapistId: "thp_003",
        roomId: "room_101",
        defaultSessionTime: "10:00",
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("SCHEDULING_CONFLICT");
    expect(res.body.dayNumber).toBe(4);

    const afterCount = sqlite.prepare("SELECT count(*) as count FROM therapy_sessions").get() as { count: number };
    expect(afterCount.count).toBe(beforeCount.count);

    sqlite.prepare("DELETE FROM therapy_sessions WHERE id = ?").run(obstacleSessionId);
    sqlite.prepare("DELETE FROM therapy_courses WHERE id = ?").run(obstacleCourseId);
  });

  it("should allow scheduling when prior session on same date was CANCELLED", async () => {
    const cancelledCourseId = "crs_cancelled_test_001";
    const cancelledSessionId = "ses_cancelled_test_001";

    sqlite.prepare(`
      INSERT INTO therapy_courses (id, patient_id, therapy_name, duration_days, start_date, default_session_time, status)
      VALUES (?, 'pat_004', 'Cancelled Course', 1, '2027-04-01', '15:00', 'CANCELLED')
    `).run(cancelledCourseId);

    sqlite.prepare(`
      INSERT INTO therapy_sessions (id, course_id, patient_id, therapist_id, room_id, day_number, session_date, start_time, end_time, status)
      VALUES (?, ?, 'pat_004', 'thp_001', 'room_101', 1, '2027-04-01', '15:00', '16:00', 'CANCELLED')
    `).run(cancelledSessionId, cancelledCourseId);

    const res = await request(app)
      .post("/api/courses")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        patientId: "pat_003",
        therapyName: "5-Day Rejuvenation",
        durationDays: 5,
        startDate: "2027-04-01",
        therapistId: "thp_001",
        roomId: "room_101",
        defaultSessionTime: "15:00",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    sqlite.prepare("DELETE FROM therapy_sessions WHERE id = ?").run(cancelledSessionId);
    sqlite.prepare("DELETE FROM therapy_courses WHERE id = ?").run(cancelledCourseId);
  });
});
