import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite, ensureHackathonTables } from "./index.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations() {
  console.log("Running database migrations...");
  const migrationsFolder = path.resolve(__dirname, "../../../migrations");
  
  if (!fs.existsSync(migrationsFolder)) {
    console.error(`Migrations folder not found at: ${migrationsFolder}`);
    process.exit(1);
  }

  try {
    migrate(db, { migrationsFolder });
    ensureHackathonTables();
    console.log("Database migrations applied successfully.");
  } catch (error) {
    console.error("Failed to run migrations:", error);
    throw error;
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
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
