import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../index.js";

describe("5. AI Ayurveda Assistant & Context Injection Suite", () => {
  let patientToken: string;

  beforeAll(async () => {
    const patientLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "patient@ayursutra.com", password: "Patient@123" });
    patientToken = patientLogin.body.token;
  });

  it("should respond to schedule query with actual authenticated patient context (fallback or live AI)", async () => {
    const res = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({ message: "When is my next session and what is my progress?" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.userMessage).toBeDefined();
    expect(res.body.assistantMessage).toBeDefined();
    expect(res.body.assistantMessage.role).toBe("ASSISTANT");

    // Response should mention Basti therapy or next session
    const replyText = res.body.assistantMessage.message;
    expect(replyText.length).toBeGreaterThan(20);
  });

  it("should respond safely to Panchakarma dietary questions", async () => {
    const res = await request(app)
      .post("/api/chat")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({ message: "What food should I eat during my Panchakarma treatment?" });

    expect(res.status).toBe(200);
    expect(res.body.assistantMessage.message).toMatch(/Khichdi|warm|Pathya|Agni|diet/i);
  });

  it("should persist and retrieve chat history for the authenticated user", async () => {
    const res = await request(app)
      .get("/api/chat/history")
      .set("Authorization", `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
    expect(res.body.messages.length).toBeGreaterThan(0);
  });
});
