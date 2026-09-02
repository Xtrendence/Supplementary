import { dateFromKey, dateKey } from "./supplements";
import {
  convertWeight,
  getMonthSets,
  getMonths,
  getPainEntries,
  getPainMonths,
  monthKey,
  PAIN_MAX,
  type WeightUnit,
  weightKg,
} from "./workouts";

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export type MetricKey = "volume" | "weight" | "pain";

export interface DayMetrics {
  date: string;
  /** Days since the start of the window, so the x axis stays linear in time. */
  dayIndex: number;
  /** Reps × weight, summed over the day, in the display unit. */
  volume: number;
  reps: number;
  sets: number;
  /** Heaviest single set of the day. */
  topWeight: number;
  /** Volume ÷ reps — the mean load per rep. */
  avgWeight: number;
  /** Worst reading of the day. */
  pain: number | null;
}

export interface MetricWindow {
  from: string;
  to: string;
  /** Total days spanned. */
  days: number;
  unit: WeightUnit;
  exerciseId?: string;
  byDay: DayMetrics[];
  /** Day indexes holding at least one set. */
  sessionDays: number[];
}

export function daysBetween(from: string, to: string): number {
  // Rounded because a DST boundary makes a calendar day 23 or 25 hours long.
  return Math.round(
    (dateFromKey(to).getTime() - dateFromKey(from).getTime()) / DAY_MS
  );
}

/** Aggregates a rolling window of whole months into one row per day that holds
 *  anything. Pain is left out when a single exercise is being examined, since a
 *  reading isn't attributable to one movement. */
export function buildMetricWindow({
  months = 12,
  exerciseId,
  unit,
  now = new Date(),
}: {
  months?: number;
  exerciseId?: string;
  unit: WeightUnit;
  now?: Date;
}): MetricWindow {
  const to = dateKey(now);
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const from = dateKey(start);

  const inWindow = new Set<string>();
  for (let i = 0; i < months; i++) {
    inWindow.add(monthKey(new Date(start.getFullYear(), start.getMonth() + i, 1)));
  }

  const byDate = new Map<string, DayMetrics>();
  const ensure = (date: string): DayMetrics => {
    const existing = byDate.get(date);
    if (existing) return existing;
    const fresh: DayMetrics = {
      date,
      dayIndex: daysBetween(from, date),
      volume: 0,
      reps: 0,
      sets: 0,
      topWeight: 0,
      avgWeight: 0,
      pain: null,
    };
    byDate.set(date, fresh);
    return fresh;
  };

  for (const month of getMonths()) {
    if (!inWindow.has(month)) continue;
    for (const set of getMonthSets(month)) {
      if (exerciseId && set.exerciseId !== exerciseId) continue;
      if (set.date < from || set.date > to) continue;
      const day = ensure(set.date);
      const kg = weightKg(set);
      // Accumulated in kg so mixed-unit entries add up, converted once below.
      day.volume += set.reps * kg;
      day.reps += set.reps;
      day.sets += 1;
      day.topWeight = Math.max(day.topWeight, kg);
    }
  }

  if (!exerciseId) {
    for (const month of getPainMonths()) {
      if (!inWindow.has(month)) continue;
      for (const entry of getPainEntries(month)) {
        if (entry.date < from || entry.date > to) continue;
        const day = ensure(entry.date);
        day.pain = day.pain === null ? entry.level : Math.max(day.pain, entry.level);
      }
    }
  }

  const byDay = [...byDate.values()]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((day) => ({
      ...day,
      volume: convertWeight(day.volume, "kg", unit),
      topWeight: convertWeight(day.topWeight, "kg", unit),
      avgWeight:
        day.reps > 0 ? convertWeight(day.volume / day.reps, "kg", unit) : 0,
    }));

  return {
    from,
    to,
    days: daysBetween(from, to) + 1,
    unit,
    exerciseId,
    byDay,
    sessionDays: byDay.filter((d) => d.sets > 0).map((d) => d.dayIndex),
  };
}

export interface SeriesPoint {
  x: number;
  y: number;
  date: string;
}

export function metricPoints(
  window: MetricWindow,
  key: MetricKey
): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  for (const day of window.byDay) {
    if (key === "volume") {
      if (day.volume > 0) {
        points.push({ x: day.dayIndex, y: day.volume, date: day.date });
      }
      continue;
    }
    if (key === "weight") {
      // Within one exercise the top set is the honest measure. Across different
      // exercises only the mean load per rep can be compared — summing a bench
      // press and a curl, or taking the max of them, says nothing.
      const value = window.exerciseId ? day.topWeight : day.avgWeight;
      if (value > 0) points.push({ x: day.dayIndex, y: value, date: day.date });
      continue;
    }
    if (day.pain !== null) {
      points.push({ x: day.dayIndex, y: day.pain, date: day.date });
    }
  }
  return points;
}

export function metricLabel(key: MetricKey): string {
  return key === "volume" ? "Volume" : key === "weight" ? "Weight" : "Pain";
}

export function metricDescription(
  key: MetricKey,
  window: MetricWindow
): string {
  if (key === "volume") return `Reps × weight per day (${window.unit})`;
  if (key === "weight") {
    return window.exerciseId
      ? `Heaviest set per day (${window.unit})`
      : `Average weight per rep (${window.unit})`;
  }
  return `Worst reading per day (0–${PAIN_MAX})`;
}

/** 12.4k, 940, 47.5 — short enough for an axis label. */
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 10000) return `${Math.round(value / 1000)}k`;
  if (abs >= 1000) return `${(value / 1000).toFixed(1)}k`;
  if (abs >= 100) return String(Math.round(value));
  return String(Math.round(value * 10) / 10);
}

export function formatMetricValue(
  key: MetricKey,
  value: number,
  unit: WeightUnit
): string {
  if (key === "pain") return `${Math.round(value)}/${PAIN_MAX}`;
  return `${formatCompact(value)} ${unit}`;
}

/** First-of-month positions for the x axis. */
export function monthTicks(
  window: MetricWindow
): { x: number; label: string }[] {
  const ticks: { x: number; label: string }[] = [];
  const start = dateFromKey(window.from);
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (true) {
    const key = dateKey(cursor);
    if (key > window.to) break;
    const x = daysBetween(window.from, key);
    if (x >= 0) ticks.push({ x, label: MONTH_SHORT[cursor.getMonth()] });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return ticks;
}

export interface WindowSummary {
  sessions: number;
  totalVolume: number;
  bestWeight: number;
  painRecords: number;
  worstPain: number | null;
}

export function summarise(window: MetricWindow): WindowSummary {
  let totalVolume = 0;
  let bestWeight = 0;
  let painRecords = 0;
  let worstPain: number | null = null;
  for (const day of window.byDay) {
    totalVolume += day.volume;
    bestWeight = Math.max(bestWeight, day.topWeight);
    if (day.pain !== null) {
      painRecords += 1;
      worstPain = worstPain === null ? day.pain : Math.max(worstPain, day.pain);
    }
  }
  return {
    sessions: window.sessionDays.length,
    totalVolume,
    bestWeight,
    painRecords,
    worstPain,
  };
}
