import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../index.js";
import { signToken, verifyToken } from "../utils/jwt.js";

describe("1. Authentication & Security Suite", () => {
  it("should hash and verify passwords correctly using bcrypt", async () => {
    const rawPassword = "TestPassword@123";
    const hashed = await bcrypt.hash(rawPassword, 10);
    expect(hashed).not.toBe(rawPassword);
    
    const isMatch = await bcrypt.compare(rawPassword, hashed);
    expect(isMatch).toBe(true);

    const isWrong = await bcrypt.compare("WrongPassword", hashed);
    expect(isWrong).toBe(false);
  });

  it("should successfully log in Admin with valid credentials and return JWT & cookie", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "admin@ayursutra.com",
        password: "Admin@123",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe("ADMIN");
    expect(res.body.token).toBeDefined();
    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"][0]).toContain("token=");
    expect(res.headers["set-cookie"][0]).toContain("HttpOnly");
  });

  it("should successfully log in Therapist with valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "therapist@ayursutra.com",
        password: "Therapist@123",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe("THERAPIST");
    expect(res.body.user.therapistId).toBeDefined();
  });

  it("should successfully log in Patient with valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "patient@ayursutra.com",
        password: "Patient@123",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe("PATIENT");
    expect(res.body.user.patientId).toBeDefined();
  });

  it("should reject login with invalid password (401 Unauthorized)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "admin@ayursutra.com",
        password: "IncorrectPassword999",
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("INVALID_CREDENTIALS");
  });

  it("should reject login with non-existent email (401 Unauthorized)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "nonexistent.user@ayursutra.com",
        password: "Admin@123",
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should clear cookie on logout", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should reject unauthenticated request to /api/auth/me (401)", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHORIZED");
  });

  it("should return authenticated user profile on /api/auth/me with valid Bearer token", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@ayursutra.com", password: "Admin@123" });

    const token = loginRes.body.token;

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe("admin@ayursutra.com");
    expect(meRes.body.user.role).toBe("ADMIN");
  });
});
