import { GoogleGenAI } from "@google/genai";
import { sqlite } from "../db/index.js";
import { format } from "date-fns";
import { AppError } from "../middleware/errorHandler.js";

export type AgniStatus = "SAMA" | "VISHAMA" | "TIKSHNA" | "MANDA";
export type BowelStatus = "NORMAL" | "CONSTIPATED" | "LOOSE";

export interface WellnessEntry {
  logDate?: string;
  breakfast?: string;
  lunch?: string;
  dinner?: string;
  agniStatus: AgniStatus;
  bowelStatus: BowelStatus;
  reactions: string[];
  energyLevel: number; // 1..5
  discomfortLevel: number; // 0..10
  notes?: string;
}

export interface WellnessGuidance {
  source: "gemini" | "rule-based";
  summary: string;
  preTreatment: string[];
  postTreatment: string[];
  alerts: string[];
}

// Reactions that must be reported to the practitioner before the next session
const WARNING_REACTIONS = ["Nausea", "Vomiting", "Dizziness", "Fever", "Severe pain", "Breathlessness", "Rash"];

const AGNI_LABEL: Record<AgniStatus, string> = {
  SAMA: "balanced digestion (Sama Agni)",
  VISHAMA: "irregular digestion (Vishama Agni)",
  TIKSHNA: "sharp, excessive hunger (Tikshna Agni)",
  MANDA: "weak, slow digestion (Manda Agni)",
};

export class WellnessService {
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

  /**
   * Saves (or updates) the patient's log for the day, reviews it and stores the guidance.
   * The active course and next scheduled session are read on the server, never from the client.
   */
  static async submitLog(patientId: string, entry: WellnessEntry) {
    const logDate = entry.logDate || format(new Date(), "yyyy-MM-dd");

    const course = sqlite
      .prepare(`SELECT id, therapy_name, duration_days FROM therapy_courses
                WHERE patient_id = ? AND status IN ('ACTIVE', 'PAUSED') ORDER BY created_at DESC LIMIT 1`)
      .get(patientId) as { id: string; therapy_name: string; duration_days: number } | undefined;

    const daySession = course
      ? (sqlite
          .prepare(`SELECT day_number FROM therapy_sessions WHERE course_id = ? AND session_date <= ?
                    ORDER BY session_date DESC, day_number DESC LIMIT 1`)
          .get(course.id, logDate) as { day_number: number } | undefined)
      : undefined;

    const nextSession = course
      ? (sqlite
          .prepare(`SELECT s.day_number, s.session_date, s.start_time, s.phase, s.procedure, s.therapist_id, u.name AS therapist_name
                    FROM therapy_sessions s JOIN therapists t ON s.therapist_id = t.id JOIN users u ON t.user_id = u.id
                    WHERE s.course_id = ? AND s.status = 'SCHEDULED' AND s.session_date >= ?
                    ORDER BY s.session_date, s.start_time LIMIT 1`)
          .get(course.id, logDate) as NextSession | undefined)
      : undefined;

    const recent = sqlite
      .prepare(`SELECT log_date, agni_status, discomfort_level FROM wellness_logs
                WHERE patient_id = ? AND log_date < ? ORDER BY log_date DESC LIMIT 3`)
      .all(patientId, logDate) as Array<{ log_date: string; agni_status: string; discomfort_level: number }>;

    const guidance = await this.reviewEntry(entry, course?.therapy_name, nextSession, recent);

    const id = `wl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    sqlite
      .prepare(`
        INSERT INTO wellness_logs (id, patient_id, course_id, day_number, log_date, breakfast, lunch, dinner,
          agni_status, bowel_status, reactions, energy_level, discomfort_level, notes, ai_guidance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(patient_id, log_date) DO UPDATE SET
          breakfast = excluded.breakfast, lunch = excluded.lunch, dinner = excluded.dinner,
          agni_status = excluded.agni_status, bowel_status = excluded.bowel_status, reactions = excluded.reactions,
          energy_level = excluded.energy_level, discomfort_level = excluded.discomfort_level, notes = excluded.notes,
          ai_guidance = excluded.ai_guidance, updated_at = CURRENT_TIMESTAMP
      `)
      .run(id, patientId, course?.id || null, daySession?.day_number || null, logDate,
        entry.breakfast || null, entry.lunch || null, entry.dinner || null, entry.agniStatus, entry.bowelStatus,
        JSON.stringify(entry.reactions || []), entry.energyLevel, entry.discomfortLevel, entry.notes || null,
        JSON.stringify(guidance));

    // Warning signs are forwarded to the practitioner of the next session
    if (guidance.alerts.length > 0 && nextSession) {
      const therapistUser = sqlite.prepare(`SELECT user_id FROM therapists WHERE id = ?`).get(nextSession.therapist_id) as { user_id: string } | undefined;
      const patientName = (sqlite.prepare(`SELECT u.name FROM patients p JOIN users u ON p.user_id = u.id WHERE p.id = ?`).get(patientId) as { name: string } | undefined)?.name;
      if (therapistUser) {
        sqlite
          .prepare(`INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at)
                    VALUES (?, ?, ?, ?, 'ALERT', 0, CURRENT_TIMESTAMP)`)
          .run(`notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, therapistUser.user_id,
            `Wellness alert: ${patientName || "Patient"}`,
            `${patientName || "Your patient"} reported on ${logDate}: ${guidance.alerts.join(" ")} Please review before the Day ${nextSession.day_number} session.`);
      }
    }

    return this.getLogByDate(patientId, logDate);
  }

  static getLogByDate(patientId: string, logDate: string) {
    const row = sqlite.prepare(`SELECT * FROM wellness_logs WHERE patient_id = ? AND log_date = ?`).get(patientId, logDate);
    return row ? this.toDto(row) : null;
  }

  static getLogs(patientId: string) {
    const rows = sqlite.prepare(`SELECT * FROM wellness_logs WHERE patient_id = ? ORDER BY log_date DESC`).all(patientId);
    return rows.map((r) => this.toDto(r));
  }

  /** Therapists may read logs only for patients they treat; admins may read all. */
  static assertCanRead(role: string, therapistId: string | undefined, patientId: string) {
    if (role === "ADMIN") return;
    if (role === "THERAPIST") {
      const assigned = sqlite.prepare(`SELECT 1 FROM therapy_sessions WHERE therapist_id = ? AND patient_id = ? LIMIT 1`).get(therapistId, patientId);
      if (assigned) return;
    }
    throw new AppError("Access denied. You can only view wellness logs of your own patients.", 403, "FORBIDDEN");
  }

  private static toDto(r: any) {
    return {
      id: r.id,
      patientId: r.patient_id,
      courseId: r.course_id,
      dayNumber: r.day_number,
      logDate: r.log_date,
      breakfast: r.breakfast,
      lunch: r.lunch,
      dinner: r.dinner,
      agniStatus: r.agni_status,
      bowelStatus: r.bowel_status,
      reactions: JSON.parse(r.reactions || "[]") as string[],
      energyLevel: r.energy_level,
      discomfortLevel: r.discomfort_level,
      notes: r.notes,
      guidance: r.ai_guidance ? (JSON.parse(r.ai_guidance) as WellnessGuidance) : null,
      createdAt: r.created_at,
    };
  }

  /** Asks Gemini for guidance; falls back to the rule-based engine when the API is unavailable. */
  static async reviewEntry(entry: WellnessEntry, therapyName: string | undefined, next: NextSession | undefined,
    recent: Array<{ log_date: string; agni_status: string; discomfort_level: number }>): Promise<WellnessGuidance> {
    const fallback = this.ruleBasedGuidance(entry, next);
    const client = this.getClient();
    if (!client) return fallback;

    const prompt = `
You are the AyurSutra Ayurveda assistant reviewing a patient's daily wellness log during a Panchakarma course.
Course: ${therapyName || "None"}.
Next session: ${next ? `Day ${next.day_number}, ${next.procedure} (${next.phase}) on ${next.session_date} at ${next.start_time}` : "No upcoming session"}.
Today's log: meals = ${entry.breakfast || "-"} / ${entry.lunch || "-"} / ${entry.dinner || "-"}; digestion = ${AGNI_LABEL[entry.agniStatus]};
bowel = ${entry.bowelStatus}; reactions = ${entry.reactions.join(", ") || "none"}; energy ${entry.energyLevel}/5; discomfort ${entry.discomfortLevel}/10; notes = ${entry.notes || "-"}.
Previous days: ${recent.map((r) => `${r.log_date}: ${r.agni_status}, discomfort ${r.discomfort_level}`).join("; ") || "none"}.
Reply ONLY with JSON: {"summary": string, "preTreatment": string[3], "postTreatment": string[3]}.
Give simple English diet, rest and routine advice for before and after the next session.
NEVER diagnose, prescribe medicines or change the doctor's plan.`;

    try {
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { temperature: 0.3, responseMimeType: "application/json" },
      });
      const parsed = JSON.parse(response.text || "{}");
      if (!Array.isArray(parsed.preTreatment) || !Array.isArray(parsed.postTreatment)) return fallback;
      return {
        source: "gemini",
        summary: String(parsed.summary || fallback.summary),
        preTreatment: parsed.preTreatment.slice(0, 4).map(String),
        postTreatment: parsed.postTreatment.slice(0, 4).map(String),
        alerts: fallback.alerts, // safety alerts are always decided by fixed rules
      };
    } catch (err) {
      console.warn("Gemini wellness review failed, using rule-based guidance:", err);
      return fallback;
    }
  }

  static ruleBasedGuidance(entry: WellnessEntry, next: NextSession | undefined): WellnessGuidance {
    const pre: string[] = [];
    const post: string[] = [];
    const alerts: string[] = [];

    switch (entry.agniStatus) {
      case "MANDA":
        pre.push("Your digestion is slow. Take only a light, warm meal such as rice kanji or moong soup before the session.");
        pre.push("Sip warm water or ginger-infused water through the morning; avoid curd, sweets and fried food.");
        post.push("Keep the next meal small and warm, and eat only when you feel hungry.");
        break;
      case "VISHAMA":
        pre.push("Your appetite is irregular. Eat at fixed times and choose freshly cooked, warm food.");
        pre.push("Avoid raw salads, cold drinks and long gaps between meals.");
        post.push("Have a simple, warm meal like khichdi at a regular time after the session.");
        break;
      case "TIKSHNA":
        pre.push("Your hunger is very sharp. Do not skip meals; take a light meal with a little ghee before the session.");
        pre.push("Avoid very spicy, sour and fried food today.");
        post.push("Choose cooling, soothing food such as rice with ghee or buttermilk after the session.");
        break;
      default:
        pre.push("Your digestion is balanced. Continue the light, warm diet advised by your doctor.");
        post.push("Continue simple, freshly cooked meals and drink warm water.");
    }

    if (entry.bowelStatus === "CONSTIPATED") pre.push("Drink enough warm water and include cooked vegetables to ease bowel movement.");
    if (entry.bowelStatus === "LOOSE") pre.push("Take rice kanji or buttermilk to stay hydrated and avoid oily food.");

    if (next) {
      const proc = (next.procedure || "").toLowerCase();
      if (proc.includes("basti")) {
        pre.push(`Day ${next.day_number} is ${next.procedure}. Have a light, warm meal about two hours before your ${next.start_time} session unless your doctor advised otherwise.`);
        post.push("After Basti, lie down and rest for some time, and avoid travel, cold water and heavy food for the day.");
      } else if (proc.includes("shirodhara")) {
        pre.push(`Day ${next.day_number} is ${next.procedure}. Come with a calm mind and avoid strong tea or coffee before the session.`);
        post.push("After Shirodhara, keep your head covered, avoid washing your hair until evening and get good sleep.");
      } else if (proc.includes("abhyanga") || proc.includes("swedana") || proc.includes("snehana")) {
        pre.push(`Day ${next.day_number} is ${next.procedure}. Avoid a heavy meal just before the oil and steam therapy.`);
        post.push("After the oil and steam therapy, bathe with warm water only and stay away from cold wind.");
      } else {
        pre.push(`Your next session is Day ${next.day_number} (${next.procedure}) at ${next.start_time}. Arrive 10 minutes early.`);
        post.push("Rest well after the session and avoid strenuous work.");
      }
    }

    if (entry.energyLevel <= 2) post.push("Your energy is low; take extra rest and avoid exercise today.");

    const warnings = entry.reactions.filter((r) => WARNING_REACTIONS.includes(r));
    if (warnings.length > 0) alerts.push(`Reported ${warnings.join(", ").toLowerCase()}.`);
    if (entry.discomfortLevel >= 7) alerts.push(`Discomfort level is high (${entry.discomfortLevel}/10).`);
    if (alerts.length > 0) alerts.push("Please inform your doctor before the next session.");

    const summary = `Today you reported ${AGNI_LABEL[entry.agniStatus]}, energy ${entry.energyLevel}/5 and discomfort ${entry.discomfortLevel}/10.`;
    return { source: "rule-based", summary, preTreatment: pre.slice(0, 4), postTreatment: post.slice(0, 4), alerts };
  }
}

interface NextSession {
  day_number: number;
  session_date: string;
  start_time: string;
  phase: string | null;
  procedure: string | null;
  therapist_id: string;
  therapist_name: string;
}
