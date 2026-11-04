import Database, { Database as DatabaseType } from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const dbPathEnv = process.env.DATABASE_PATH || "../data/ayursutra.db";
const dbFilePath = path.isAbsolute(dbPathEnv) 
  ? dbPathEnv 
  : path.resolve(process.cwd(), dbPathEnv);

const dbDir = path.dirname(dbFilePath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const sqlite: DatabaseType = new Database(dbFilePath);

// Enable foreign key enforcement & WAL mode for SQLite
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("journal_mode = WAL");

// Ensure session_requests and additional columns and tables exist idempotently
try {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS session_requests (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      therapist_id TEXT,
      requested_by_user_id TEXT NOT NULL,
      requested_by_role TEXT NOT NULL,
      request_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      reason TEXT NOT NULL,
      preferred_date TEXT,
      preferred_time TEXT,
      admin_notes TEXT,
      resolved_by_user_id TEXT,
      resolved_at TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (session_id) REFERENCES therapy_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES therapy_courses(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS requests_session_id_idx ON session_requests(session_id);
    CREATE INDEX IF NOT EXISTS requests_patient_id_idx ON session_requests(patient_id);
    CREATE INDEX IF NOT EXISTS requests_status_idx ON session_requests(status);
    CREATE INDEX IF NOT EXISTS requests_type_idx ON session_requests(request_type);

    CREATE TABLE IF NOT EXISTS therapist_availability (
      id TEXT PRIMARY KEY,
      therapist_id TEXT NOT NULL UNIQUE,
      working_days TEXT NOT NULL,
      working_hours_start TEXT NOT NULL,
      working_hours_end TEXT NOT NULL,
      weekly_off INTEGER,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (therapist_id) REFERENCES therapists(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS therapist_leaves (
      id TEXT PRIMARY KEY,
      therapist_id TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (therapist_id) REFERENCES therapists(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS leaves_therapist_idx ON therapist_leaves(therapist_id);
    CREATE INDEX IF NOT EXISTS leaves_dates_idx ON therapist_leaves(start_date, end_date);

    CREATE TABLE IF NOT EXISTS procedure_room_compatibility (
      id TEXT PRIMARY KEY,
      procedure_name TEXT NOT NULL,
      room_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (room_id) REFERENCES treatment_rooms(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS proc_room_idx ON procedure_room_compatibility(procedure_name, room_id);

    CREATE TABLE IF NOT EXISTS reminder_logs (
      id TEXT PRIMARY KEY,
      dedupe_key TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      session_id TEXT,
      reminder_type TEXT NOT NULL,
      scheduled_occurrence TEXT NOT NULL,
      sent_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS reminder_user_idx ON reminder_logs(user_id);
  `);

  const courseCols = sqlite.prepare(`PRAGMA table_info(therapy_courses)`).all() as Array<{ name: string }>;
  if (courseCols.length > 0 && !courseCols.some(col => col.name === "paused_at")) {
    sqlite.exec(`ALTER TABLE therapy_courses ADD COLUMN paused_at TEXT;`);
  }

  const sessionCols = sqlite.prepare(`PRAGMA table_info(therapy_sessions)`).all() as Array<{ name: string }>;
  if (sessionCols.length > 0) {
    if (!sessionCols.some(col => col.name === "replacement_for_session_id")) {
      sqlite.exec(`ALTER TABLE therapy_sessions ADD COLUMN replacement_for_session_id TEXT;`);
    }
    if (!sessionCols.some(col => col.name === "phase")) {
      sqlite.exec(`ALTER TABLE therapy_sessions ADD COLUMN phase TEXT;`);
    }
    if (!sessionCols.some(col => col.name === "procedure")) {
      sqlite.exec(`ALTER TABLE therapy_sessions ADD COLUMN procedure TEXT;`);
    }
    if (!sessionCols.some(col => col.name === "blood_pressure")) {
      sqlite.exec(`ALTER TABLE therapy_sessions ADD COLUMN blood_pressure TEXT;`);
    }
    if (!sessionCols.some(col => col.name === "pulse_rate")) {
      sqlite.exec(`ALTER TABLE therapy_sessions ADD COLUMN pulse_rate INTEGER;`);
    }
    if (!sessionCols.some(col => col.name === "temperature")) {
      sqlite.exec(`ALTER TABLE therapy_sessions ADD COLUMN temperature REAL;`);
    }
    if (!sessionCols.some(col => col.name === "weight")) {
      sqlite.exec(`ALTER TABLE therapy_sessions ADD COLUMN weight REAL;`);
    }
    if (!sessionCols.some(col => col.name === "symptom_score")) {
      sqlite.exec(`ALTER TABLE therapy_sessions ADD COLUMN symptom_score INTEGER;`);
    }
    if (!sessionCols.some(col => col.name === "pathya")) {
      sqlite.exec(`ALTER TABLE therapy_sessions ADD COLUMN pathya TEXT;`);
    }
    if (!sessionCols.some(col => col.name === "apathya")) {
      sqlite.exec(`ALTER TABLE therapy_sessions ADD COLUMN apathya TEXT;`);
    }
    if (!sessionCols.some(col => col.name === "lifestyle_instructions")) {
      sqlite.exec(`ALTER TABLE therapy_sessions ADD COLUMN lifestyle_instructions TEXT;`);
    }
  }
} catch (e) {
  // Ignored if table is not yet created (e.g. before initial migration)
}

// Hackathon tables: daily wellness logs and therapist qualifications
export function ensureHackathonTables() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS wellness_logs (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      course_id TEXT,
      day_number INTEGER,
      log_date TEXT NOT NULL,
      breakfast TEXT,
      lunch TEXT,
      dinner TEXT,
      agni_status TEXT NOT NULL,
      bowel_status TEXT NOT NULL,
      reactions TEXT NOT NULL DEFAULT '[]',
      energy_level INTEGER NOT NULL,
      discomfort_level INTEGER NOT NULL,
      notes TEXT,
      ai_guidance TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES therapy_courses(id) ON DELETE SET NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS wellness_patient_date_idx ON wellness_logs(patient_id, log_date);

    CREATE TABLE IF NOT EXISTS therapist_qualifications (
      id TEXT PRIMARY KEY,
      therapist_id TEXT NOT NULL,
      procedure_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      FOREIGN KEY (therapist_id) REFERENCES therapists(id) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX IF NOT EXISTS qual_therapist_proc_idx ON therapist_qualifications(therapist_id, procedure_name);
  `);
}

try {
  ensureHackathonTables();
} catch (e) {
  // Ignored before the initial migration has created the referenced tables
}

export const db = drizzle(sqlite, { schema });
export { schema };
export default db;
