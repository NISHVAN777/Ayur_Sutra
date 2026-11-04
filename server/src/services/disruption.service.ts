import { sqlite } from "../db/index.js";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { calculateEndTime } from "../utils/dateUtils.js";
import { AppError, SchedulingConflictError } from "../middleware/errorHandler.js";
import { SchedulingService } from "./scheduling.service.js";

export interface DisruptionRequest {
  therapistId: string; // therapist who becomes unavailable
  startDate: string; // YYYY-MM-DD (inclusive)
  endDate: string; // YYYY-MM-DD (inclusive)
  reason: string;
}

interface SessionRow {
  id: string;
  course_id: string;
  patient_id: string;
  therapist_id: string;
  room_id: string;
  day_number: number;
  session_date: string;
  start_time: string;
  end_time: string;
  procedure: string | null;
  phase: string | null;
}

interface Booking {
  therapistId: string;
  roomId: string;
  date: string;
  start: string;
  end: string;
}

export interface PlanItem {
  sessionId: string;
  courseId: string;
  dayNumber: number;
  procedure: string;
  phase: string | null;
  from: { date: string; startTime: string; therapistId: string; therapistName: string; roomId: string; roomName: string };
  to: { date: string; startTime: string; endTime: string; therapistId: string; therapistName: string; roomId: string; roomName: string } | null;
  changes: Array<"THERAPIST" | "ROOM" | "TIME" | "DATE">;
  status: "UNCHANGED" | "REASSIGNED" | "UNRESOLVED";
}

export interface CoursePlan {
  courseId: string;
  therapyName: string;
  patientId: string;
  patientName: string;
  items: PlanItem[];
}

const SLOT_HOURS = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
const MAX_DAY_SHIFT = 7;
const overlaps = (s1: string, e1: string, s2: string, e2: string) => s1 < e2 && e1 > s2;

export class DisruptionService {
  /**
   * Builds a rescheduling plan for every active course affected by a therapist's absence.
   * All remaining sessions of each affected course are re-planned in day order so that
   * the Purvakarma -> Pradhana Karma -> Paschat Karma sequence is never broken.
   */
  static async buildPlan(req: DisruptionRequest): Promise<{ courses: CoursePlan[]; affectedSessions: number; unresolved: number }> {
    if (req.endDate < req.startDate) throw new AppError("End date must be on or after the start date.", 400);
    const therapist = sqlite.prepare(`SELECT id FROM therapists WHERE id = ?`).get(req.therapistId);
    if (!therapist) throw new AppError("Therapist not found", 404);

    const affected = sqlite
      .prepare(`SELECT s.* FROM therapy_sessions s JOIN therapy_courses c ON s.course_id = c.id
                WHERE s.therapist_id = ? AND s.status = 'SCHEDULED' AND c.status = 'ACTIVE'
                  AND s.session_date BETWEEN ? AND ?
                ORDER BY s.session_date, s.start_time`)
      .all(req.therapistId, req.startDate, req.endDate) as SessionRow[];

    const courseIds = [...new Set(affected.map((s) => s.course_id))];

    // Every remaining session of an affected course is re-planned, so its old slot is released
    const remainingByCourse = new Map<string, SessionRow[]>();
    for (const courseId of courseIds) {
      const firstDay = Math.min(...affected.filter((s) => s.course_id === courseId).map((s) => s.day_number));
      remainingByCourse.set(courseId, sqlite
        .prepare(`SELECT * FROM therapy_sessions WHERE course_id = ? AND status = 'SCHEDULED' AND day_number >= ?
                  ORDER BY day_number`)
        .all(courseId, firstDay) as SessionRow[]);
    }
    const movedIds = new Set([...remainingByCourse.values()].flat().map((s) => s.id));
    const planned: Booking[] = [];

    const courses: CoursePlan[] = [];
    for (const courseId of courseIds) {
      const course = sqlite
        .prepare(`SELECT c.therapy_name, c.patient_id, u.name AS patient_name FROM therapy_courses c
                  JOIN patients p ON c.patient_id = p.id JOIN users u ON p.user_id = u.id WHERE c.id = ?`)
        .get(courseId) as { therapy_name: string; patient_id: string; patient_name: string };
      const remaining = remainingByCourse.get(courseId)!;

      // The last fixed (earlier) session of the course: re-planned sessions must come after it
      const lastFixed = sqlite
        .prepare(`SELECT MAX(session_date) AS d FROM therapy_sessions WHERE course_id = ? AND status != 'CANCELLED' AND day_number < ?`)
        .get(courseId, remaining[0].day_number) as { d: string | null };

      let prevDate: string | null = lastFixed.d;
      let dayShift = 0;
      let substitute: string | null = null;
      const items: PlanItem[] = [];

      for (const s of remaining) {
        let target = format(addDays(parseISO(s.session_date), dayShift), "yyyy-MM-dd");
        if (prevDate && target <= prevDate) target = format(addDays(parseISO(prevDate), 1), "yyyy-MM-dd");

        let slot: Booking | null = null;
        for (let extra = 0; extra <= MAX_DAY_SHIFT && !slot; extra++) {
          const date = format(addDays(parseISO(target), extra), "yyyy-MM-dd");
          slot = await this.findSlot(s, date, req, substitute, movedIds, planned);
        }

        if (!slot) {
          items.push(this.item(s, null, "UNRESOLVED"));
          continue;
        }

        planned.push(slot);
        dayShift = differenceInCalendarDays(parseISO(slot.date), parseISO(s.session_date));
        prevDate = slot.date;
        if (slot.therapistId !== s.therapist_id) substitute = slot.therapistId; // prefer the same substitute next day

        const changed = slot.therapistId !== s.therapist_id || slot.roomId !== s.room_id || slot.start !== s.start_time || slot.date !== s.session_date;
        items.push(this.item(s, slot, changed ? "REASSIGNED" : "UNCHANGED"));
      }

      courses.push({ courseId, therapyName: course.therapy_name, patientId: course.patient_id, patientName: course.patient_name, items });
    }

    const all = courses.flatMap((c) => c.items);
    return { courses, affectedSessions: affected.length, unresolved: all.filter((i) => i.status === "UNRESOLVED").length };
  }

  /** Finds the best (therapist, room, time) for one session on a given date, or null. */
  private static async findSlot(s: SessionRow, date: string, req: DisruptionRequest, substitute: string | null,
    movedIds: Set<string>, planned: Booking[]): Promise<Booking | null> {
    const procedure = s.procedure || "";
    const onLeave = (thId: string) => thId === req.therapistId && date >= req.startDate && date <= req.endDate;

    // Candidate therapists: the original one first (continuity), then the substitute already used, then other qualified staff
    const qualified = this.qualifiedTherapists(procedure);
    const loadOf = (thId: string) =>
      (sqlite.prepare(`SELECT COUNT(*) AS n FROM therapy_sessions WHERE therapist_id = ? AND session_date = ? AND status != 'CANCELLED'`).get(thId, date) as { n: number }).n;
    const others = qualified.filter((t) => t !== s.therapist_id && t !== substitute).sort((a, b) => loadOf(a) - loadOf(b));
    const therapists = [...new Set([s.therapist_id, ...(substitute ? [substitute] : []), ...others])]
      .filter((t) => !onLeave(t) && (t === s.therapist_id || qualified.includes(t)));

    const rooms = this.compatibleRooms(procedure, s.room_id); // original room first
    const times = this.nearestSlots(s.start_time); // original time first

    for (const start of times) {
      const end = calculateEndTime(start, 60);
      for (const th of therapists) {
        const rule = await SchedulingService.checkTherapistAvailabilityRule(th, date, start, end);
        if (!rule.available || this.isBusy("therapist_id", th, date, start, end, movedIds, planned)) continue;
        for (const room of rooms) {
          if (this.isBusy("room_id", room, date, start, end, movedIds, planned)) continue;
          return { therapistId: th, roomId: room, date, start, end };
        }
      }
    }
    return null;
  }

  /** Active rooms suitable for the procedure, with the session's own room first. */
  private static compatibleRooms(procedure: string, originalRoom: string): string[] {
    const compatible = (sqlite.prepare(`SELECT room_id FROM procedure_room_compatibility WHERE procedure_name = ?`).all(procedure) as Array<{ room_id: string }>).map((r) => r.room_id);
    const activeRooms = (sqlite.prepare(`SELECT id FROM treatment_rooms WHERE status = 'ACTIVE'`).all() as Array<{ id: string }>).map((r) => r.id);
    return [...new Set([originalRoom, ...activeRooms])]
      .filter((r) => activeRooms.includes(r) && (compatible.length === 0 || compatible.includes(r)));
  }

  /** The original start time first, then the other hourly slots nearest to it. */
  private static nearestSlots(original: string): string[] {
    const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    const byDistance = [...SLOT_HOURS].sort((a, b) => Math.abs(toMin(a) - toMin(original)) - Math.abs(toMin(b) - toMin(original)));
    return [...new Set([original, ...byDistance])];
  }

  private static qualifiedTherapists(procedure: string): string[] {
    const rows = sqlite.prepare(`SELECT therapist_id FROM therapist_qualifications WHERE procedure_name = ?`).all(procedure) as Array<{ therapist_id: string }>;
    if (rows.length > 0) return rows.map((r) => r.therapist_id);
    // No qualification rule defined for this procedure: every therapist may perform it
    return (sqlite.prepare(`SELECT id FROM therapists`).all() as Array<{ id: string }>).map((r) => r.id);
  }

  private static isBusy(column: "therapist_id" | "room_id", id: string, date: string, start: string, end: string,
    movedIds: Set<string>, planned: Booking[]): boolean {
    const rows = sqlite
      .prepare(`SELECT id, start_time, end_time FROM therapy_sessions WHERE ${column} = ? AND session_date = ? AND status != 'CANCELLED'`)
      .all(id, date) as Array<{ id: string; start_time: string; end_time: string }>;
    if (rows.some((r) => !movedIds.has(r.id) && overlaps(r.start_time, r.end_time, start, end))) return true;
    return planned.some((p) => p.date === date && (column === "therapist_id" ? p.therapistId : p.roomId) === id && overlaps(p.start, p.end, start, end));
  }

  private static item(s: SessionRow, slot: Booking | null, status: PlanItem["status"]): PlanItem {
    const thName = (id: string) => (sqlite.prepare(`SELECT u.name FROM therapists t JOIN users u ON t.user_id = u.id WHERE t.id = ?`).get(id) as { name: string } | undefined)?.name || id;
    const roomName = (id: string) => {
      const r = sqlite.prepare(`SELECT room_name, room_number FROM treatment_rooms WHERE id = ?`).get(id) as { room_name: string; room_number: string } | undefined;
      return r ? `${r.room_name} (${r.room_number})` : id;
    };
    const changes: PlanItem["changes"] = [];
    if (slot) {
      if (slot.therapistId !== s.therapist_id) changes.push("THERAPIST");
      if (slot.roomId !== s.room_id) changes.push("ROOM");
      if (slot.date !== s.session_date) changes.push("DATE");
      if (slot.start !== s.start_time) changes.push("TIME");
    }
    return {
      sessionId: s.id,
      courseId: s.course_id,
      dayNumber: s.day_number,
      procedure: s.procedure || "",
      phase: s.phase,
      from: { date: s.session_date, startTime: s.start_time, therapistId: s.therapist_id, therapistName: thName(s.therapist_id), roomId: s.room_id, roomName: roomName(s.room_id) },
      to: slot ? { date: slot.date, startTime: slot.start, endTime: slot.end, therapistId: slot.therapistId, therapistName: thName(slot.therapistId), roomId: slot.roomId, roomName: roomName(slot.roomId) } : null,
      changes,
      status,
    };
  }

  /** Records the leave and applies the whole plan atomically (all sessions or none). */
  static async applyPlan(req: DisruptionRequest, performedByUserId: string) {
    const plan = await this.buildPlan(req);
    if (plan.unresolved > 0) {
      throw new SchedulingConflictError(
        `${plan.unresolved} session(s) could not be placed within ${MAX_DAY_SHIFT} days. No changes were made.`,
        { code: "DISRUPTION_UNRESOLVED", resourceType: "THERAPIST", resourceId: req.therapistId });
    }

    const uid = () => `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const notify = (userId: string, title: string, message: string, sessionId: string | null = null) =>
      sqlite.prepare(`INSERT INTO notifications (id, user_id, session_id, title, message, type, is_read, created_at)
                      VALUES (?, ?, ?, ?, ?, 'ALERT', 0, CURRENT_TIMESTAMP)`).run(`notif_${uid()}`, userId, sessionId, title, message);
    const userOfTherapist = (id: string) => (sqlite.prepare(`SELECT user_id FROM therapists WHERE id = ?`).get(id) as { user_id: string }).user_id;

    sqlite.transaction(() => {
      sqlite.prepare(`INSERT INTO therapist_leaves (id, therapist_id, start_date, end_date, reason, created_at)
                      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).run(`lv_${uid()}`, req.therapistId, req.startDate, req.endDate, req.reason);

      for (const course of plan.courses) {
        const changed = course.items.filter((i) => i.status === "REASSIGNED");
        for (const i of changed) {
          sqlite.prepare(`UPDATE therapy_sessions SET session_date = ?, start_time = ?, end_time = ?, therapist_id = ?, room_id = ?,
                            reschedule_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
            .run(i.to!.date, i.to!.startTime, i.to!.endTime, i.to!.therapistId, i.to!.roomId, `Disruption: ${req.reason}`, i.sessionId);
          sqlite.prepare(`INSERT INTO audit_logs (id, entity_type, entity_id, action, performed_by_user_id, original_value, new_value, reason, created_at)
                          VALUES (?, 'SESSION', ?, 'SESSION_RESCHEDULED', ?, ?, ?, ?, CURRENT_TIMESTAMP)`)
            .run(`aud_${uid()}`, i.sessionId, performedByUserId, JSON.stringify(i.from), JSON.stringify(i.to), `Disruption: ${req.reason}`);
          if (i.to!.therapistId !== i.from.therapistId) {
            notify(userOfTherapist(i.to!.therapistId), "New Session Assigned",
              `You have been assigned Day ${i.dayNumber} (${i.procedure}) for ${course.patientName} on ${i.to!.date} at ${i.to!.startTime} in ${i.to!.roomName}.`, i.sessionId);
          }
        }
        if (changed.length > 0) {
          const patientUser = (sqlite.prepare(`SELECT user_id FROM patients WHERE id = ?`).get(course.patientId) as { user_id: string }).user_id;
          notify(patientUser, "Schedule Updated",
            `Due to a practitioner's leave, ${changed.length} session(s) of your ${course.therapyName} were updated. The order of your treatment is unchanged. Please check Upcoming Sessions.`);
        }
      }
      notify(userOfTherapist(req.therapistId), "Leave Recorded",
        `Your leave from ${req.startDate} to ${req.endDate} is recorded and your sessions have been reassigned.`);
    })();

    return plan;
  }
}
