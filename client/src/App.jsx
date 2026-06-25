import { useEffect, useMemo, useState } from "react";
import { api, clearToken, setToken } from "./api.js";

function Login({ onLogin }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ code })
      });
      setToken(data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="logo">✓</div>
        <h1>جدول العمال الأسبوعي</h1>
        <p>ادخل رقم الدخول الخاص فيك. الأدمن يقدر يسوي تشيك، والعامل يشوف أيامه فقط.</p>
        <input inputMode="numeric" autoFocus placeholder="رقم الدخول" value={code} onChange={(event) => setCode(event.target.value)} />
        {error && <div className="alert">{error}</div>}
        <button disabled={loading}>{loading ? "جاري الدخول..." : "دخول"}</button>
      </form>
    </main>
  );
}

function Header({ user, onLogout }) {
  return (
    <header className="header">
      <div>
        <span className="eyebrow">نظام الحضور</span>
        <h1>أهلًا، {user.name}</h1>
      </div>
      <button className="secondary" onClick={onLogout}>تسجيل خروج</button>
    </header>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="stat-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AdminDashboard({ user, onLogout }) {
  const [days, setDays] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [stats, setStats] = useState(null);
  const [cycle, setCycle] = useState("all");
  const [workerId, setWorkerId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingDay, setSavingDay] = useState(null);

  async function loadSchedule() {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (cycle !== "all") params.set("cycle", cycle);
    if (workerId !== "all") params.set("workerId", workerId);

    try {
      const data = await api(`/api/admin/schedule?${params.toString()}`);
      setDays(data.days);
      setWorkers(data.workers);
      setStats(data.stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchedule();
  }, [cycle, workerId]);

  async function updateAttendance(day, nextAttendance) {
    setSavingDay(day.id);
    setError("");

    try {
      const data = await api(`/api/admin/attendance/${day.id}`, {
        method: "PATCH",
        body: JSON.stringify(nextAttendance)
      });
      setDays((items) => items.map((item) => (item.id === day.id ? data.day : item)));
      setStats(data.stats);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingDay(null);
    }
  }

  async function resetAll() {
    const confirmed = window.confirm("هل أنت متأكد؟ سيتم حذف جميع علامات التشيك والملاحظات.");
    if (!confirmed) return;

    try {
      await api("/api/admin/reset", { method: "POST" });
      await loadSchedule();
    } catch (err) {
      setError(err.message);
    }
  }

  const cycles = useMemo(() => {
    const total = stats?.totalCycles ?? 7;
    return Array.from({ length: total }, (_, index) => index + 1);
  }, [stats]);

  return (
    <div className="app-shell">
      <Header user={user} onLogout={onLogout} />
      {stats && (
        <section className="stats-grid">
          <StatCard title="إجمالي الأيام" value={stats.totalDays} />
          <StatCard title="تم التشيك" value={stats.checkedDays} />
          <StatCard title="المتبقي" value={stats.pendingDays} />
          <StatCard title="عدد الدورات" value={stats.totalCycles} />
        </section>
      )}
      <section className="toolbar">
        <label>الدورة<select value={cycle} onChange={(event) => setCycle(event.target.value)}><option value="all">كل الدورات</option>{cycles.map((item) => <option key={item} value={item}>الدورة {item}</option>)}</select></label>
        <label>العامل<select value={workerId} onChange={(event) => setWorkerId(event.target.value)}><option value="all">كل العمال</option>{workers.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}</select></label>
        <button className="danger" onClick={resetAll}>إعادة ضبط التشيك</button>
      </section>
      {error && <div className="alert">{error}</div>}
      {loading ? <div className="empty-state">جاري تحميل الجدول...</div> : (
        <section className="table-card">
          <table>
            <thead><tr><th>تشيك</th><th>العامل</th><th>اليوم</th><th>التاريخ</th><th>الأسبوع</th><th>الدورة</th><th>ملاحظة</th></tr></thead>
            <tbody>
              {days.map((day) => (
                <tr key={day.id} className={day.attendance.checked ? "checked-row" : ""}>
                  <td><input type="checkbox" checked={day.attendance.checked} disabled={savingDay === day.id} onChange={(event) => updateAttendance(day, { checked: event.target.checked, note: day.attendance.note })} /></td>
                  <td>{day.workerName}</td><td>{day.dayName}</td><td>{day.date}</td><td>{day.weekNumber}</td><td>{day.cycleNumber}</td>
                  <td><input className="note-input" placeholder="ملاحظة اختيارية" defaultValue={day.attendance.note} onBlur={(event) => updateAttendance(day, { checked: day.attendance.checked, note: event.target.value })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function WorkerDashboard({ user, onLogout }) {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cycle, setCycle] = useState("all");

  async function loadMySchedule() {
    setLoading(true);
    setError("");
    try {
      const data = await api("/api/worker/schedule");
      setDays(data.days);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMySchedule();
  }, []);

  const cycles = useMemo(() => [...new Set(days.map((day) => day.cycleNumber))], [days]);
  const visibleDays = cycle === "all" ? days : days.filter((day) => String(day.cycleNumber) === cycle);
  const checkedCount = visibleDays.filter((day) => day.attendance.checked).length;

  return (
    <div className="app-shell">
      <Header user={user} onLogout={onLogout} />
      <section className="stats-grid">
        <StatCard title="أيامك المعروضة" value={visibleDays.length} />
        <StatCard title="تم التشيك" value={checkedCount} />
        <StatCard title="المتبقي" value={visibleDays.length - checkedCount} />
      </section>
      <section className="toolbar">
        <label>الدورة<select value={cycle} onChange={(event) => setCycle(event.target.value)}><option value="all">كل الدورات</option>{cycles.map((item) => <option key={item} value={item}>الدورة {item}</option>)}</select></label>
        <button className="secondary" onClick={loadMySchedule}>تحديث</button>
      </section>
      {error && <div className="alert">{error}</div>}
      {loading ? <div className="empty-state">جاري تحميل جدولك...</div> : (
        <section className="cards-list">
          {visibleDays.map((day) => (
            <article key={day.id} className={`day-card ${day.attendance.checked ? "done" : "pending"}`}>
              <div><strong>{day.dayName}</strong><span>{day.date}</span></div>
              <div><small>الأسبوع {day.weekNumber} - الدورة {day.cycleNumber}</small><b>{day.attendance.checked ? "تم التشيك" : "لم يتم التشيك"}</b>{day.attendance.note && <p>{day.attendance.note}</p>}</div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    async function boot() {
      try {
        const data = await api("/api/me");
        setUser(data.user);
      } catch {
        clearToken();
      } finally {
        setBooting(false);
      }
    }
    boot();
  }, []);

  function logout() {
    clearToken();
    setUser(null);
  }

  if (booting) return <div className="boot-screen">جاري التجهيز...</div>;
  if (!user) return <Login onLogin={setUser} />;
  if (user.role === "admin") return <AdminDashboard user={user} onLogout={logout} />;
  return <WorkerDashboard user={user} onLogout={logout} />;
}
