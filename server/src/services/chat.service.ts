import { GoogleGenAI } from "@google/genai";
import { db } from "../db/index.js";
import { therapyCourses, therapySessions, chatMessages, patients, users } from "../db/schema.js";
import { eq, desc, asc } from "drizzle-orm";
import { formatToDisplayTime } from "../utils/dateUtils.js";

export class ChatService {
  private static aiClient: GoogleGenAI | null = null;

  private static getClient(): GoogleGenAI | null {
    if (!this.aiClient && process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "mock_key_for_testing") {
      try {
        this.aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      } catch (e) {
        console.warn("Could not initialize GoogleGenAI client:", e);
      }
    }
    return this.aiClient;
  }

  static async handleMessage(userId: string, userMessage: string) {
    const patient = await db.query.patients.findFirst({
      where: eq(patients.userId, userId),
    });
    return this.processPatientMessage(userId, patient?.id || "", userMessage);
  }

  static async processPatientMessage(userId: string, patientId: string, userMessage: string) {
    const patient = await db.query.patients.findFirst({
      where: eq(patients.id, patientId),
      with: { user: true },
    });

    const activeCourse = await db.query.therapyCourses.findFirst({
      where: eq(therapyCourses.patientId, patientId),
      with: {
        sessions: {
          with: {
            therapist: { with: { user: true } },
            room: true,
          },
          orderBy: (sessions, { asc }) => [asc(sessions.dayNumber)],
        },
      },
      orderBy: (courses, { desc }) => [desc(courses.createdAt)],
    });

    let contextSummary = `Patient Name: ${patient?.user.name || "Patient"}\n`;
    if (patient?.medicalNotes) {
      contextSummary += `Health Notes: ${patient.medicalNotes}\n`;
    }

    if (activeCourse) {
      const completedSessions = activeCourse.sessions.filter((s) => s.status === "COMPLETED").length;
      const totalSessions = activeCourse.durationDays;
      const progressPercent = Math.round((completedSessions / totalSessions) * 100);
      const nextSession = activeCourse.sessions.find((s) => s.status === "SCHEDULED");

      contextSummary += `Active Therapy: ${activeCourse.therapyName} (${totalSessions} Days total)\n`;
      contextSummary += `Course Status: ${activeCourse.status}\n`;
      contextSummary += `Progress: Day ${completedSessions} of ${totalSessions} completed (${progressPercent}%)\n`;

      if (nextSession) {
        contextSummary += `Next Scheduled Session: Day ${nextSession.dayNumber} on ${nextSession.sessionDate} at ${formatToDisplayTime(
          nextSession.startTime
        )} with practitioner Dr. ${nextSession.therapist?.user.name || "Assigned"} in ${
          nextSession.room?.roomName || "Treatment Suite"
        } (Room ${nextSession.room?.roomNumber || "Suite"}).\n`;
      } else {
        contextSummary += `Next Scheduled Session: All scheduled sessions in this course are completed.\n`;
      }
    } else {
      contextSummary += `Active Therapy: No active therapy course currently running.\n`;
    }

    const systemInstruction = `
You are the AyurSutra Ayurveda AI Assistant, an empathetic, knowledgeable Ayurvedic healthcare companion.
You are assisting a verified clinic patient in simple, clear English.

PATIENT'S REAL AUTHENTICATED CLINIC RECORD:
${contextSummary}

STRICT SAFETY AND CLINICAL GUIDELINES:
1. Always respond in clear, accessible, fluent ENGLISH. Do NOT use Hindi or untranslated Sanskrit words. Replace traditional terms with clear English equivalents (e.g. use "Dietary Guidelines / Wholesome Diet", "Doctor / Practitioner", "Digestive Health", "Herbal Oil Massage", etc.).
2. When the patient asks about their next session, therapy progress, or appointment, use the exact authenticated dates, times, practitioner names, and room names provided in their clinic record above.
3. Provide authentic Ayurvedic lifestyle, diet, hydration, rest, and post-therapy recovery guidance.
4. STRICT SAFETY: You must NEVER diagnose medical illnesses, prescribe pharmaceuticals, alter doctor prescriptions, or promise medical cures. For acute pain or severe symptoms, always instruct the patient to contact their doctor immediately.
5. Keep answers warm, encouraging, concise, and structured with bullet points.
`;

    let replyText = "";
    const client = this.getClient();

    if (client) {
      try {
        const response = await client.models.generateContent({
          model: "gemini-2.5-flash",
          contents: userMessage,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.3,
          },
        });
        replyText = response.text || "";
      } catch (err) {
        console.warn("Gemini API call failed, using clinical fallback engine:", err);
        replyText = this.generateEnglishFallback(userMessage, contextSummary, patient?.user.name || "Patient");
      }
    } else {
      replyText = this.generateEnglishFallback(userMessage, contextSummary, patient?.user.name || "Patient");
    }

    const userMsgId = `chat_${Date.now()}_u`;
    const assistantMsgId = `chat_${Date.now()}_a`;

    await db.insert(chatMessages).values([
      {
        id: userMsgId,
        userId,
        role: "USER",
        message: userMessage,
      },
      {
        id: assistantMsgId,
        userId,
        role: "ASSISTANT",
        message: replyText,
      },
    ]);

    return {
      userMessage: { id: userMsgId, userId, role: "USER", message: userMessage, createdAt: new Date().toISOString() },
      assistantMessage: { id: assistantMsgId, userId, role: "ASSISTANT", message: replyText, createdAt: new Date().toISOString() },
    };
  }

  private static generateEnglishFallback(query: string, contextSummary: string, patientName: string): string {
    const lower = query.toLowerCase();

    if (lower.includes("next session") || lower.includes("when is") || lower.includes("appointment") || lower.includes("schedule") || lower.includes("time")) {
      const nextMatch = contextSummary.match(/Next Scheduled Session: (.+)/);
      const nextInfo = nextMatch ? nextMatch[1] : "Please check your patient dashboard for upcoming appointments.";
      return `Hello ${patientName}. Here is your verified schedule information:\n\n• ${nextInfo}\n\nPlease arrive 10 minutes prior to your session. If you need to make changes, please contact the clinic reception.`;
    }

    if (lower.includes("progress") || lower.includes("day") || lower.includes("how many") || lower.includes("status")) {
      const progMatch = contextSummary.match(/Progress: (.+)/);
      const progInfo = progMatch ? progMatch[1] : "You are currently registered in our Panchakarma clinic system.";
      return `Hello ${patientName}. Here is your current therapy progress:\n\n• ${progInfo}\n\nConsistent daily therapy allows your body to gently detoxify and restore balance.`;
    }

    if (lower.includes("diet") || lower.includes("food") || lower.includes("eat") || lower.includes("meal")) {
      return `Hello ${patientName}. During your Panchakarma therapy course, your digestive system requires gentle support. Please follow these dietary guidelines:\n\n• Eat light, freshly prepared warm foods such as warm rice soup, vegetable broth, and boiled grains.\n• Drink warm water throughout the day to support circulation and metabolic balance.\n• Avoid cold, iced, oily, deep-fried, or heavy spicy foods, as well as late-night snacking.\n• Rest quietly for at least 30 minutes after your meals.`;
    }

    return `Hello ${patientName}. Thank you for reaching out to your AyurSutra wellness assistant.\n\n• You can ask about your upcoming session schedule, therapy progress, or recommended dietary guidelines.\n• For personalized medical questions or prescription adjustments, please speak directly with your doctor during your next visit.`;
  }
}
