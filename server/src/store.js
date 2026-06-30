import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildSchedule } from "./schedule.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localDataDir = path.resolve(__dirname, "../data");
const dataDir = process.env.VERCEL ? path.join(os.tmpdir(), "worker-schedule-data") : localDataDir;
const dbPath = path.join(dataDir, "db.json");
let memoryDatabase = null;

function defaultDatabase() {
  return {
    schedule: buildSchedule(),
    attendance: {},
    updatedAt: new Date().toISOString()
  };
}

export async function ensureDatabase() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(dbPath);
    const raw = await fs.readFile(dbPath, "utf8");
    const database = JSON.parse(raw);

    if (!Array.isArray(database.schedule) || database.schedule.length === 0) {
      await writeDatabase(defaultDatabase());
    } else {
      memoryDatabase = database;
    }
  } catch {
    await writeDatabase(memoryDatabase ?? defaultDatabase());
  }
}

export async function readDatabase() {
  if (memoryDatabase) return memoryDatabase;
  await ensureDatabase();
  const raw = await fs.readFile(dbPath, "utf8");
  memoryDatabase = JSON.parse(raw);
  return memoryDatabase;
}

export async function writeDatabase(database) {
  const nextDatabase = {
    ...database,
    updatedAt: new Date().toISOString()
  };

  memoryDatabase = nextDatabase;
  await fs.mkdir(dataDir, { recursive: true });
  const tempPath = `${dbPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(nextDatabase, null, 2), "utf8");
  await fs.rename(tempPath, dbPath);
  return nextDatabase;
}

export async function resetDatabase() {
  return writeDatabase(defaultDatabase());
}
