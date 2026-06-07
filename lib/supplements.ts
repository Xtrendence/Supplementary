import { useSyncExternalStore } from "react";
import { storage } from "./storage";

export type SupplementUnit = "g" | "mg" | "iu" | "pill";

export interface TakenEntry {
  date: string;
  at: number;
}

export interface Supplement {
  id: string;
  name: string;
  unit: SupplementUnit;
  servingSize: number;
  days: number[];
  containerAmount: number;
  amountLeft: number;
  pricePerContainer: number;
  takenLog: TakenEntry[];
  createdAt: number;
}

export const UNIT_OPTIONS: { value: SupplementUnit; label: string }[] = [
  { value: "g", label: "g" },
  { value: "mg", label: "mg" },
  { value: "iu", label: "IU" },
  { value: "pill", label: "Pills" },
];

export function formatAmount(amount: number, unit: SupplementUnit): string {
  const rounded = Math.round(amount * 100) / 100;
  switch (unit) {
    case "g":
      return `${rounded} g`;
    case "mg":
      return `${rounded} mg`;
    case "iu":
      return `${rounded} IU`;
    case "pill":
      return `${rounded} ${rounded === 1 ? "pill" : "pills"}`;
  }
}

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_LABELS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isScheduledOn(supplement: Supplement, date: Date = new Date()): boolean {
  return supplement.days.includes(date.getDay());
}

export function isTakenOn(supplement: Supplement, date: Date = new Date()): boolean {
  const key = dateKey(date);
  return supplement.takenLog.some((entry) => entry.date === key);
}

export function dateFromKey(key: string): Date {
  const [y, m, d] = key.split("-").map((n) => Number.parseInt(n, 10));
  return new Date(y, m - 1, d);
}

export interface TakenRecord {
  supplement: Supplement;
  at: number;
  amount: number;
  unit: SupplementUnit;
}

export function takenDateKeys(list: Supplement[]): Set<string> {
  const keys = new Set<string>();
  for (const s of list) {
    for (const entry of s.takenLog) keys.add(entry.date);
  }
  return keys;
}

export function takenOnDate(list: Supplement[], key: string): TakenRecord[] {
  const records: TakenRecord[] = [];
  for (const s of list) {
    for (const entry of s.takenLog) {
      if (entry.date === key) {
        records.push({
          supplement: s,
          at: entry.at,
          amount: s.servingSize,
          unit: s.unit,
        });
      }
    }
  }
  return records.sort((a, b) => a.at - b.at);
}

export function earliestTakenKey(list: Supplement[]): string | null {
  let earliest: string | null = null;
  for (const s of list) {
    for (const entry of s.takenLog) {
      if (earliest === null || entry.date < earliest) earliest = entry.date;
    }
  }
  return earliest;
}

export function dosesLeft(supplement: Supplement): number {
  if (supplement.servingSize <= 0) return 0;
  return Math.floor(supplement.amountLeft / supplement.servingSize);
}

export interface SupplyProjection {
  doses: number;
  calendarDays: number | null;
  runOutDate: Date | null;
}

export function projectSupply(supplement: Supplement, from: Date = new Date()): SupplyProjection {
  const doses = dosesLeft(supplement);
  if (doses <= 0) return { doses: 0, calendarDays: 0, runOutDate: null };
  if (supplement.days.length === 0) {
    return { doses, calendarDays: null, runOutDate: null };
  }

  let remaining = doses;
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let calendarDays = 0;
  let lastDoseDay = new Date(cursor);

  for (let i = 0; i < 365 * 5 && remaining > 0; i++) {
    if (supplement.days.includes(cursor.getDay())) {
      remaining -= 1;
      lastDoseDay = new Date(cursor);
      if (remaining === 0) break;
    }
    cursor.setDate(cursor.getDate() + 1);
    calendarDays += 1;
  }

  return { doses, calendarDays, runOutDate: lastDoseDay };
}

export function costPerDose(supplement: Supplement): number | null {
  if (supplement.containerAmount <= 0 || supplement.servingSize <= 0) return null;
  const dosesPerContainer = supplement.containerAmount / supplement.servingSize;
  if (dosesPerContainer <= 0) return null;
  return supplement.pricePerContainer / dosesPerContainer;
}

const WEEKS_PER_MONTH = 365.25 / 7 / 12;

export function monthlyCost(supplement: Supplement): number {
  const perDose = costPerDose(supplement);
  if (perDose === null || supplement.days.length === 0) return 0;
  return perDose * supplement.days.length * WEEKS_PER_MONTH;
}

export function totalMonthlyCost(list: Supplement[] = getSupplements()): number {
  return list.reduce((sum, s) => sum + monthlyCost(s), 0);
}

const KEY = "supplements";
const listeners = new Set<() => void>();
let cache: Supplement[] | null = null;

function migrate(raw: Supplement & { takenDates?: string[] }): Supplement {
  if (Array.isArray(raw.takenLog)) return raw;
  const takenLog: TakenEntry[] = Array.isArray(raw.takenDates)
    ? raw.takenDates.map((date) => ({
        date,
        at: dateFromKey(date).getTime() + 12 * 60 * 60 * 1000,
      }))
    : [];
  const { takenDates: _ignored, ...rest } = raw;
  return { ...rest, takenLog };
}

function readFromDisk(): Supplement[] {
  const raw = storage.getString(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(migrate) : [];
  } catch {
    return [];
  }
}

function getSnapshot(): Supplement[] {
  if (cache === null) cache = readFromDisk();
  return cache;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function commit(next: Supplement[]): void {
  cache = next;
  storage.set(KEY, JSON.stringify(next));
  for (const listener of listeners) listener();
}

export function useSupplements(): Supplement[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getSupplements(): Supplement[] {
  return getSnapshot();
}

let idCounter = 0;
function makeId(): string {
  idCounter += 1;
  return `s_${Date.now().toString(36)}_${idCounter}`;
}

export type SupplementDraft = Omit<Supplement, "id" | "takenLog" | "createdAt">;

export function addSupplement(draft: SupplementDraft): Supplement {
  const supplement: Supplement = {
    ...draft,
    id: makeId(),
    takenLog: [],
    createdAt: Date.now(),
  };
  commit([...getSnapshot(), supplement]);
  return supplement;
}

export function updateSupplement(id: string, draft: SupplementDraft): void {
  commit(getSnapshot().map((s) => (s.id === id ? { ...s, ...draft } : s)));
}

export function deleteSupplement(id: string): void {
  commit(getSnapshot().filter((s) => s.id !== id));
}

export function toggleTaken(id: string, date: Date = new Date()): void {
  const key = dateKey(date);
  commit(
    getSnapshot().map((s) => {
      if (s.id !== id) return s;
      const entriesForDay = s.takenLog.filter((e) => e.date === key).length;
      if (entriesForDay > 0) {
        return {
          ...s,
          takenLog: s.takenLog.filter((e) => e.date !== key),
          amountLeft: Math.min(
            s.containerAmount > 0 ? s.containerAmount : Number.POSITIVE_INFINITY,
            s.amountLeft + s.servingSize * entriesForDay
          ),
        };
      }
      return {
        ...s,
        takenLog: [...s.takenLog, { date: key, at: Date.now() }],
        amountLeft: Math.max(0, s.amountLeft - s.servingSize),
      };
    })
  );
}

export function refillSupplement(id: string): void {
  commit(
    getSnapshot().map((s) =>
      s.id === id ? { ...s, amountLeft: s.containerAmount } : s
    )
  );
}

export function clearAllSupplements(): void {
  commit([]);
}

const MOCK_PRESETS: {
  name: string;
  unit: SupplementUnit;
  serving: number;
  container: number;
  price: number;
}[] = [
  { name: "Vitamin D3", unit: "iu", serving: 5000, container: 360000, price: 11.99 },
  { name: "Vitamin C", unit: "mg", serving: 1000, container: 120000, price: 9.5 },
  { name: "Magnesium Glycinate", unit: "mg", serving: 400, container: 48000, price: 18.0 },
  { name: "Omega-3 Fish Oil", unit: "pill", serving: 2, container: 120, price: 22.95 },
  { name: "Zinc Picolinate", unit: "mg", serving: 30, container: 3000, price: 7.25 },
  { name: "Creatine Monohydrate", unit: "g", serving: 5, container: 500, price: 24.99 },
  { name: "Probiotic", unit: "pill", serving: 1, container: 60, price: 29.99 },
  { name: "Ashwagandha", unit: "mg", serving: 600, container: 54000, price: 15.49 },
  { name: "Turmeric Curcumin", unit: "mg", serving: 1000, container: 90000, price: 16.0 },
  { name: "Iron Bisglycinate", unit: "mg", serving: 25, container: 2250, price: 8.99 },
  { name: "Calcium Citrate", unit: "mg", serving: 600, container: 72000, price: 12.5 },
  { name: "Vitamin E", unit: "iu", serving: 400, container: 36000, price: 10.75 },
  { name: "Collagen Peptides", unit: "g", serving: 11, container: 567, price: 27.0 },
  { name: "Whey Protein", unit: "g", serving: 30, container: 2270, price: 54.99 },
  { name: "L-Theanine", unit: "mg", serving: 200, container: 18000, price: 13.99 },
  { name: "CoQ10", unit: "mg", serving: 100, container: 6000, price: 19.95 },
  { name: "Biotin", unit: "mg", serving: 10, container: 1200, price: 6.49 },
  { name: "Melatonin", unit: "mg", serving: 3, container: 180, price: 5.99 },
  { name: "Multivitamin", unit: "pill", serving: 2, container: 120, price: 21.0 },
  { name: "Vitamin B Complex", unit: "pill", serving: 1, container: 90, price: 14.25 },
];

const MOCK_DAY_PATTERNS: number[][] = [
  [0, 1, 2, 3, 4, 5, 6],
  [1, 2, 3, 4, 5],
  [0, 6],
  [1, 3, 5],
  [2, 4],
  [0, 2, 4, 6],
  [1],
  [3],
  [5, 6],
  [0, 3],
];

const MOCK_FILL_FACTORS = [1, 0.85, 0.6, 0.42, 0.25, 0.08, 0];

export function generateMockData(): number {
  const now = Date.now();

  const list: Supplement[] = MOCK_PRESETS.map((preset, i) => {
    const days = MOCK_DAY_PATTERNS[i % MOCK_DAY_PATTERNS.length];
    const fill = MOCK_FILL_FACTORS[i % MOCK_FILL_FACTORS.length];
    const amountLeft = Math.round(preset.container * fill * 100) / 100;

    const takenLog: TakenEntry[] = [];
    for (let back = 150; back >= 0; back--) {
      const d = new Date();
      d.setDate(d.getDate() - back);
      if (!days.includes(d.getDay())) continue;
      if (Math.random() > 0.8) continue;
      d.setHours(7 + (i % 4), (i * 13) % 60, 0, 0);
      takenLog.push({ date: dateKey(d), at: d.getTime() });
    }

    return {
      id: `mock_${now}_${i}`,
      name: preset.name,
      unit: preset.unit,
      servingSize: preset.serving,
      days,
      containerAmount: preset.container,
      amountLeft,
      pricePerContainer: preset.price,
      takenLog,
      createdAt: now + i,
    };
  });

  commit(list);
  return list.length;
}

export interface ExportPayload {
  app: "Supplementary";
  version: 1;
  exportedAt: string;
  supplements: Supplement[];
}

export function buildExportPayload(): ExportPayload {
  return {
    app: "Supplementary",
    version: 1,
    exportedAt: new Date().toISOString(),
    supplements: getSnapshot(),
  };
}

export interface ImportResult {
  ok: boolean;
  count: number;
  error?: string;
}

function coerceSupplement(raw: unknown): Supplement | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.name !== "string") return null;
  const num = (v: unknown, fallback = 0) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return {
    id: typeof r.id === "string" ? r.id : makeId(),
    name: r.name,
    unit: (UNIT_OPTIONS.some((u) => u.value === r.unit)
      ? r.unit
      : "pill") as SupplementUnit,
    servingSize: num(r.servingSize, 1),
    days: Array.isArray(r.days)
      ? r.days.filter((d) => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6)
      : [],
    containerAmount: num(r.containerAmount),
    amountLeft: num(r.amountLeft),
    pricePerContainer: num(r.pricePerContainer),
    takenLog: coerceTakenLog(r),
    createdAt: num(r.createdAt, Date.now()),
  };
}

function coerceTakenLog(r: Record<string, unknown>): TakenEntry[] {
  if (Array.isArray(r.takenLog)) {
    return r.takenLog
      .filter(
        (e): e is { date: string; at: number } =>
          !!e &&
          typeof e === "object" &&
          typeof (e as { date: unknown }).date === "string" &&
          typeof (e as { at: unknown }).at === "number"
      )
      .map((e) => ({ date: e.date, at: e.at }));
  }
  if (Array.isArray(r.takenDates)) {
    return r.takenDates
      .filter((d): d is string => typeof d === "string")
      .map((date) => ({ date, at: dateFromKey(date).getTime() + 12 * 60 * 60 * 1000 }));
  }
  return [];
}

export function importFromJson(json: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, count: 0, error: "The file isn't valid JSON." };
  }

  const nested =
    parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>).supplements
      : undefined;
  const list: unknown[] | null = Array.isArray(parsed)
    ? parsed
    : Array.isArray(nested)
      ? nested
      : null;

  if (!list) {
    return {
      ok: false,
      count: 0,
      error: "No supplements found in that file.",
    };
  }

  const cleaned = list
    .map(coerceSupplement)
    .filter((s): s is Supplement => s !== null);

  commit(cleaned);
  return { ok: true, count: cleaned.length };
}
