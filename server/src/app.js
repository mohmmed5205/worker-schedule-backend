import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import { groupStats } from "./schedule.js";
import { ensureDatabase, readDatabase, resetDatabase, writeDatabase } from "./store.js";
import { configuredWorkers, publicWorkers } from "./workers.js";

const app = express();
const authKey = String(process.env.JWT_SECRET ?? "").trim() || "local-development-key";
const adminPin = String(process.env.ADMIN_PIN ?? "").trim();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

function createToken(user) {
  return jwt.sign(user, authKey, { expiresIn: "30d" });
}

function withAttendance(days, attendance) {
  return days.map((day) => ({
    ...day,
    attendance: {
      checked: Boolean(attendance[day.id]?.checked),
      checkedAt: attendance[day.id]?.checkedAt ?? null,
      checkedBy: attendance[day.id]?.checkedBy ?? null,
      note: attendance[day.id]?.note ?? ""
    }
  }));
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "تسجيل الدخول مطلوب" });
  }

  try {
    req.user = jwt.verify(token, authKey);
    return next();
  } catch {
    return res.status(401).json({ message: "جلسة الدخول غير صالحة" });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "هذه الصفحة للأدمن فقط" });
  }

  return next();
}

app.get("/api/health", async (_req, res) => {
  const database = await readDatabase();
  res.json({ ok: true, updatedAt: database.updatedAt });
});

app.post("/api/auth/login", async (req, res) => {
  const code = String(req.body?.code ?? "").trim();

  if (!code) {
    return res.status(400).json({ message: "اكتب رقم الدخول" });
  }

  if (adminPin && code === adminPin) {
    const user = { id: "admin", name: "الأدمن", role: "admin" };
    return res.json({ token: createToken(user), user });
  }

  const worker = configuredWorkers().find((item) => item.pin && item.pin === code);

  if (!worker) {
    return res.status(401).json({ message: "رقم الدخول غير صحيح" });
  }

  const user = { id: worker.id, name: worker.name, role: "worker" };
  return res.json({ token: createToken(user), user });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.get("/api/admin/workers", requireAuth, requireAdmin, async (_req, res) => {
  res.json({ workers: publicWorkers() });
});

app.get("/api/admin/schedule", requireAuth, requireAdmin, async (req, res) => {
  const database = await readDatabase();
  const cycle = req.query.cycle ? Number(req.query.cycle) : null;
  const workerId = req.query.workerId ? String(req.query.workerId) : null;

  let days = database.schedule;
  if (cycle) days = days.filter((day) => day.cycleNumber === cycle);
  if (workerId) days = days.filter((day) => day.workerId === workerId);

  res.json({
    days: withAttendance(days, database.attendance),
    stats: groupStats(database.schedule, database.attendance),
    workers: publicWorkers()
  });
});

app.patch("/api/admin/attendance/:dayId", requireAuth, requireAdmin, async (req, res) => {
  const dayId = String(req.params.dayId);
  const database = await readDatabase();
  const day = database.schedule.find((item) => item.id === dayId);

  if (!day) {
    return res.status(404).json({ message: "اليوم غير موجود في الجدول" });
  }

  const previous = database.attendance[dayId] ?? {};
  const checked = typeof req.body?.checked === "boolean" ? req.body.checked : Boolean(previous.checked);
  const note = typeof req.body?.note === "string" ? req.body.note : previous.note ?? "";

  database.attendance[dayId] = {
    checked,
    note,
    checkedAt: checked ? new Date().toISOString() : null,
    checkedBy: checked ? req.user.name : null
  };

  const nextDatabase = await writeDatabase(database);
  res.json({
    day: withAttendance([day], nextDatabase.attendance)[0],
    stats: groupStats(nextDatabase.schedule, nextDatabase.attendance)
  });
});

app.get("/api/worker/schedule", requireAuth, async (req, res) => {
  if (req.user?.role !== "worker") {
    return res.status(403).json({ message: "هذه الصفحة للعمال فقط" });
  }

  const database = await readDatabase();
  const days = database.schedule.filter((day) => day.workerId === req.user.id);
  res.json({ days: withAttendance(days, database.attendance) });
});

app.post("/api/admin/reset", requireAuth, requireAdmin, async (_req, res) => {
  const database = await resetDatabase();
  res.json({ message: "تمت إعادة ضبط الجدول", stats: groupStats(database.schedule, database.attendance) });
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ message: "المسار غير موجود" });
  }
  return next();
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "صار خطأ في السيرفر" });
});

await ensureDatabase();

export default app;
