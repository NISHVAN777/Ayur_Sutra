import crypto from "crypto";
import { db, sqlite, schema } from "../db/index.js";
import { eq, and, sql } from "drizzle-orm";
import { format, addDays, parseISO } from "date-fns";

export class ReminderService {
  /**
   * Scans sessions on target date (default tomorrow relative to referenceDate)
   * and generates deduplicated notifications for patients and therapists.
   * Suppresses reminders for PAUSED and CANCELLED courses.
   */
  static async generateUpcomingSessionReminders(referenceDate?: string | Date): Promise<number> {
    let baseDate = new Date();
    if (referenceDate) {
      baseDate = typeof referenceDate === "string" ? parseISO(referenceDate) : referenceDate;
    }
    const targetDate = format(addDays(baseDate, 1), "yyyy-MM-dd");
    let generatedCount = 0;

    const targetSessions = await db.query.therapySessions.findMany({
      where: and(
        eq(schema.therapySessions.sessionDate, targetDate),
        eq(schema.therapySessions.status, "SCHEDULED")
      ),
      with: {
        patient: { with: { user: true } },
        therapist: { with: { user: true } },
        room: true,
        course: true,
      },
    });

    for (const session of targetSessions) {
      // Suppress reminders if the therapy course is PAUSED or CANCELLED
      if (!session.course || session.course.status === "PAUSED" || session.course.status === "CANCELLED") {
        continue;
      }

      // 1. Patient Reminder with Deduplication Log
      const patientDedupeKey = `rem_pat_${session.id}_${targetDate}`;
      const existingPatientLog = sqlite
        .prepare(`SELECT id FROM reminder_logs WHERE dedupe_key = ?`)
        .get(patientDedupeKey);

      if (!existingPatientLog) {
        const notifId = `notif_${crypto.randomUUID()}`;
        const logId = `remlog_${crypto.randomUUID()}`;

        sqlite.transaction(() => {
          sqlite.prepare(`
            INSERT INTO notifications (
              id, user_id, session_id, title, message, type, is_read, scheduled_for, created_at
            ) VALUES (?, ?, ?, ?, ?, 'REMINDER', 0, ?, CURRENT_TIMESTAMP)
          `).run(
            notifId,
            session.patient.userId,
            session.id,
            `Upcoming ${session.course.therapyName} (Day ${session.dayNumber})`,
            `Reminder: Your Day ${session.dayNumber} session is tomorrow (${targetDate}) at ${session.startTime} in ${session.room.roomName} (Room ${session.room.roomNumber}) with ${session.therapist.user.name}.`,
            `${targetDate} ${session.startTime}`
          );

          sqlite.prepare(`
            INSERT INTO reminder_logs (
              id, dedupe_key, user_id, session_id, reminder_type, scheduled_occurrence, sent_at
            ) VALUES (?, ?, ?, ?, 'UPCOMING_SESSION', ?, CURRENT_TIMESTAMP)
          `).run(logId, patientDedupeKey, session.patient.userId, session.id, targetDate);
        })();

        generatedCount++;
      }

      // 2. Therapist Reminder with Deduplication Log
      const therapistDedupeKey = `rem_thp_${session.id}_${targetDate}`;
      const existingTherapistLog = sqlite
        .prepare(`SELECT id FROM reminder_logs WHERE dedupe_key = ?`)
        .get(therapistDedupeKey);

      if (!existingTherapistLog) {
        const notifId = `notif_${crypto.randomUUID()}`;
        const logId = `remlog_${crypto.randomUUID()}`;

        sqlite.transaction(() => {
          sqlite.prepare(`
            INSERT INTO notifications (
              id, user_id, session_id, title, message, type, is_read, scheduled_for, created_at
            ) VALUES (?, ?, ?, ?, ?, 'REMINDER', 0, ?, CURRENT_TIMESTAMP)
          `).run(
            notifId,
            session.therapist.userId,
            session.id,
            `Tomorrow's Assigned Session: ${session.patient.user.name}`,
            `Scheduled: ${session.course.therapyName} (Day ${session.dayNumber}) for ${session.patient.user.name} tomorrow at ${session.startTime} in ${session.room.roomName}.`,
            `${targetDate} ${session.startTime}`
          );

          sqlite.prepare(`
            INSERT INTO reminder_logs (
              id, dedupe_key, user_id, session_id, reminder_type, scheduled_occurrence, sent_at
            ) VALUES (?, ?, ?, ?, 'UPCOMING_SESSION', ?, CURRENT_TIMESTAMP)
          `).run(logId, therapistDedupeKey, session.therapist.userId, session.id, targetDate);
        })();

        generatedCount++;
      }
    }

    return generatedCount;
  }
}

