import { BASE_WORKERS } from "./workers.js";

const START_DATE = "2026-06-27";
const TOTAL_WEEKS = 52;
const WORK_DAYS = [
  { offset: 0, name: "السبت" },
  { offset: 1, name: "الأحد" },
  { offset: 2, name: "الاثنين" },
  { offset: 3, name: "الثلاثاء" },
  { offset: 4, name: "الأربعاء" },
  { offset: 5, name: "الخميس" }
];

function addDays(dateText, days) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildSchedule() {
  const days = [];

  for (let weekIndex = 0; weekIndex < TOTAL_WEEKS; weekIndex += 1) {
    const worker = BASE_WORKERS[weekIndex % BASE_WORKERS.length];
    const weekNumber = weekIndex + 1;
    const cycleNumber = Math.floor(weekIndex / BASE_WORKERS.length) + 1;
    const weekStart = addDays(START_DATE, weekIndex * 7);

    for (const workDay of WORK_DAYS) {
      const date = addDays(weekStart, workDay.offset);
      days.push({
        id: `week-${weekNumber}-${date}`,
        weekNumber,
        cycleNumber,
        workerId: worker.id,
        workerName: worker.name,
        date,
        dayName: workDay.name
      });
    }
  }

  return days;
}

export function groupStats(days, attendance) {
  const totalDays = days.length;
  const checkedDays = days.filter((day) => attendance[day.id]?.checked).length;

  return {
    totalDays,
    checkedDays,
    pendingDays: totalDays - checkedDays,
    totalWeeks: TOTAL_WEEKS,
    totalCycles: Math.ceil(TOTAL_WEEKS / BASE_WORKERS.length),
    startDate: START_DATE,
    endDate: days.at(-1)?.date ?? START_DATE
  };
}
