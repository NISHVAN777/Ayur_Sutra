import { sqlite } from "./index.js";
import { runMigrations } from "./migrate.js";
import { seedDatabase } from "./seed.js";
import dotenv from "dotenv";

dotenv.config();

export async function resetDatabase() {
  console.log("Resetting database...");
  
  try {
    sqlite.exec(`
      PRAGMA foreign_keys = OFF;
      DROP TABLE IF EXISTS wellness_logs;
      DROP TABLE IF EXISTS therapist_qualifications;
      DROP TABLE IF EXISTS reminder_logs;
      DROP TABLE IF EXISTS procedure_room_compatibility;
      DROP TABLE IF EXISTS therapist_leaves;
      DROP TABLE IF EXISTS therapist_availability;
      DROP TABLE IF EXISTS session_requests;
      DROP TABLE IF EXISTS audit_logs;
      DROP TABLE IF EXISTS chat_messages;
      DROP TABLE IF EXISTS notifications;
      DROP TABLE IF EXISTS therapy_sessions;
      DROP TABLE IF EXISTS therapy_courses;
      DROP TABLE IF EXISTS treatment_rooms;
      DROP TABLE IF EXISTS therapists;
      DROP TABLE IF EXISTS patients;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS __drizzle_migrations;
      PRAGMA foreign_keys = ON;
    `);

    console.log("All tables dropped.");
    await runMigrations();
    await seedDatabase();
    console.log("Database successfully reset and seeded.");
  } catch (error) {
    console.error("Database reset failed:", error);
    throw error;
  }
}

if (process.argv[1] && process.argv[1].endsWith("reset.ts")) {
  resetDatabase()
    .then(() => {
      sqlite.close();
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      sqlite.close();
      process.exit(1);
    });
}
