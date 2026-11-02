import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../index.js";

describe("2. RBAC & Patient Data Isolation Suite", () => {
  let adminToken: string;
  let therapistToken: string;
  let patientToken: string;

  beforeAll(async () => {
    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@ayursutra.com", password: "Admin@123" });
    adminToken = adminLogin.body.token;

    const therapistLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "therapist@ayursutra.com", password: "Therapist@123" });
    therapistToken = therapistLogin.body.token;

    const patientLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "patient@ayursutra.com", password: "Patient@123" });
    patientToken = patientLogin.body.token;
  });

  it("should allow ADMIN to access admin endpoints (/api/admin/dashboard)", async () => {
    const res = await request(app)
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.totalPatients).toBeGreaterThan(0);
  });

  it("should forbid PATIENT from accessing admin endpoints (403 Forbidden)", async () => {
    const res = await request(app)
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("FORBIDDEN");
  });

  it("should forbid THERAPIST from creating patients or rooms (403 Forbidden)", async () => {
    const res = await request(app)
      .post("/api/rooms")
      .set("Authorization", `Bearer ${therapistToken}`)
      .send({
        roomName: "Unauthorized Room",
        roomNumber: "999",
      });

    expect(res.status).toBe(403);
  });

  it("should allow PATIENT to access own dashboard (/api/patient/dashboard)", async () => {
    const res = await request(app)
      .get("/api/patient/dashboard")
      .set("Authorization", `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.patient.email).toBe("patient@ayursutra.com");
    expect(res.body.stats.progressPercentage).toBeDefined();
  });

  it("should prevent a PATIENT from reading another patient's data by ID (/api/patients/pat_002) (403 Forbidden)", async () => {
    // patientToken belongs to pat_001 (Arun Sharma)
    const res = await request(app)
      .get("/api/patients/pat_002") // Meera Patel
      .set("Authorization", `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("FORBIDDEN");
  });

  it("should allow ADMIN to view any patient details (/api/patients/pat_002)", async () => {
    const res = await request(app)
      .get("/api/patients/pat_002")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.patient.id).toBe("pat_002");
  });
});
