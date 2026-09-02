/* eslint-disable react-hooks/exhaustive-deps */
import { type DependencyList, useMemo, useSyncExternalStore } from "react";
import { storage } from "./storage";
import { dateFromKey, dateKey } from "./supplements";

export type WeightUnit = "kg" | "lbs";

export const WEIGHT_UNIT_OPTIONS: { value: WeightUnit; label: string }[] = [
	{ value: "kg", label: "kg" },
	{ value: "lbs", label: "lbs" },
];

/** How quickly the set was performed. Left unset for an ordinary pace, which
 *  is the common case and stays out of the data entirely. */
export type SetSpeed = 1 | 2 | 3;

export const SPEED_LABELS: Record<SetSpeed, string> = {
	1: "Slow",
	2: "Fast",
	3: "As fast as possible",
};

export function toSpeed(value: unknown): SetSpeed | undefined {
	const n =
		typeof value === "number"
			? value
			: Number.parseInt(String(value ?? ""), 10);
	return n === 1 || n === 2 || n === 3 ? n : undefined;
}

export interface Exercise {
	id: string;
	name: string;
	createdAt: number;
}

/** A single recorded set. Weight is stored exactly as it was entered, along
 *  with the unit that was active at the time, so switching units later only
 *  changes how it's displayed. */
export interface WorkoutSet {
	id: string;
	exerciseId: string;
	/** YYYY-MM-DD */
	date: string;
	at: number;
	reps: number;
	weight: number;
	unit: WeightUnit;
	speed?: SetSpeed;
	note?: string;
}

const LBS_PER_KG = 2.2046226218;

export function convertWeight(
	value: number,
	from: WeightUnit,
	to: WeightUnit,
): number {
	if (from === to) return value;
	return to === "kg" ? value / LBS_PER_KG : value * LBS_PER_KG;
}

export function weightIn(set: WorkoutSet, unit: WeightUnit): number {
	return convertWeight(set.weight, set.unit, unit);
}

/** Normalised value used purely for comparing sets against each other. */
export function weightKg(set: WorkoutSet): number {
	return convertWeight(set.weight, set.unit, "kg");
}

export function roundWeight(value: number): number {
	return Math.round(value * 100) / 100;
}

export function formatWeight(value: number, unit: WeightUnit): string {
	return `${roundWeight(value)} ${unit}`;
}

export function formatSetWeight(set: WorkoutSet, unit: WeightUnit): string {
	return formatWeight(weightIn(set, unit), unit);
}

export function formatReps(reps: number): string {
	return `${reps} ${reps === 1 ? "rep" : "reps"}`;
}

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** "1w 2d 3h 4m 5s" — units above the largest non-zero one are dropped. */
export function formatElapsed(ms: number): string {
	let seconds = Math.max(0, Math.floor(ms / 1000));

	const weeks = Math.floor(seconds / WEEK);
	seconds -= weeks * WEEK;
	const days = Math.floor(seconds / DAY);
	seconds -= days * DAY;
	const hours = Math.floor(seconds / HOUR);
	seconds -= hours * HOUR;
	const minutes = Math.floor(seconds / MINUTE);
	seconds -= minutes * MINUTE;

	const parts: string[] = [];
	if (weeks > 0) parts.push(`${weeks}w`);
	if (parts.length || days > 0) parts.push(`${days}d`);
	if (parts.length || hours > 0) parts.push(`${hours}h`);
	if (parts.length || minutes > 0) parts.push(`${minutes}m`);
	parts.push(`${seconds}s`);
	return parts.join(" ");
}

const MONTH_LABELS = [
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
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** YYYY-MM */
export function monthKey(date: Date = new Date()): string {
	return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

export function monthKeyOfDate(key: string): string {
	return key.slice(0, 7);
}

export function monthLabel(key: string): string {
	const [y, m] = key.split("-").map((n) => Number.parseInt(n, 10));
	return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
		month: "long",
		year: "numeric",
	});
}

/** "Sat. 8 Aug 2026" — always the full date, never a relative label. */
export function fullDayLabel(key: string): string {
	const d = dateFromKey(key);
	return `${WEEKDAY_LABELS[d.getDay()]}. ${d.getDate()} ${
		MONTH_LABELS[d.getMonth()]
	} ${d.getFullYear()}`;
}

/** "Today" / "Yesterday" / "Sat. 8 Aug 2026" */
export function dayLabel(key: string, today: string = dateKey()): string {
	if (key === today) return "Today";
	const yesterday = dateFromKey(today);
	yesterday.setDate(yesterday.getDate() - 1);
	if (key === dateKey(yesterday)) return "Yesterday";
	return fullDayLabel(key);
}

export const PAIN_MAX = 10;

/** A pain or irritation reading. Recorded independently of any workout so
 *  off-days can be tracked too, which is the point — it's what makes the
 *  after-effects of a given session visible. */
export interface PainEntry {
	id: string;
	/** YYYY-MM-DD in local time. Grouping and bucketing key. */
	date: string;
	/** Full ISO 8601 timestamp of the moment it was recorded. */
	at: string;
	/** 0 to PAIN_MAX. */
	level: number;
	/** Optional — what hurt, or anything else worth remembering. */
	note?: string;
}

export function clampPainLevel(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.min(PAIN_MAX, Math.max(0, Math.round(value)));
}

export function toPainLevel(value: unknown): number | null {
	const n =
		typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
	if (!Number.isFinite(n) || n < 0 || n > PAIN_MAX) return null;
	return Math.round(n);
}

/** "09:12" in local time. */
export function formatPainTime(entry: PainEntry): string {
	return new Date(entry.at).toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit",
	});
}

const EXERCISES_KEY = "workout:exercises";
const MONTHS_KEY = "workout:months";
const setsKey = (month: string) => `workout:sets:${month}`;
const PAIN_MONTHS_KEY = "pain:months";
const painKey = (month: string) => `pain:entries:${month}`;

const listeners = new Set<() => void>();
let version = 0;

let exercisesCache: Exercise[] | null = null;
let monthsCache: string[] | null = null;
const setsCache = new Map<string, WorkoutSet[]>();
let painMonthsCache: string[] | null = null;
const painCache = new Map<string, PainEntry[]>();

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function notify(): void {
	version += 1;
	for (const listener of listeners) listener();
}

function getVersion(): number {
	return version;
}

/** Bumps whenever any workout data changes. */
export function useWorkoutVersion(): number {
	return useSyncExternalStore(subscribe, getVersion, getVersion);
}

/** Reads derived workout data, recomputing whenever the store changes (or when
 *  one of `deps` does). Keeps components off the raw month buckets. */
export function useWorkoutSelector<T>(
	select: () => T,
	deps: DependencyList = [],
): T {
	const version = useWorkoutVersion();
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	return useMemo(select, [version, ...deps]);
}

function readJson<T>(key: string, fallback: T): T {
	const raw = storage.getString(key);
	if (!raw) return fallback;
	try {
		const parsed = JSON.parse(raw);
		return (parsed ?? fallback) as T;
	} catch {
		return fallback;
	}
}

export function getExercises(): Exercise[] {
	if (exercisesCache === null) {
		const list = readJson<Exercise[]>(EXERCISES_KEY, []);
		exercisesCache = Array.isArray(list)
			? list.filter(
					(e) => e && typeof e.id === "string" && typeof e.name === "string",
				)
			: [];
	}
	return exercisesCache;
}

export function getExercise(id: string): Exercise | null {
	return getExercises().find((e) => e.id === id) ?? null;
}

/** Exercise names are unique, ignoring case and surrounding space. */
export function findExerciseByName(
	name: string,
	excludeId?: string,
): Exercise | null {
	const needle = name.trim().toLowerCase();
	return (
		getExercises().find(
			(e) => e.id !== excludeId && e.name.toLowerCase() === needle,
		) ?? null
	);
}

/** Every month that currently holds at least one set, oldest first. */
export function getMonths(): string[] {
	if (monthsCache === null) {
		const list = readJson<string[]>(MONTHS_KEY, []);
		monthsCache = Array.isArray(list)
			? [...new Set(list.filter((m) => typeof m === "string"))].sort()
			: [];
	}
	return monthsCache;
}

export function getMonthSets(month: string): WorkoutSet[] {
	const cached = setsCache.get(month);
	if (cached) return cached;
	const list = readJson<WorkoutSet[]>(setsKey(month), []);
	const clean = Array.isArray(list) ? list.filter(isSet) : [];
	clean.sort((a, b) => a.at - b.at);
	setsCache.set(month, clean);
	return clean;
}

function isSet(value: unknown): value is WorkoutSet {
	if (!value || typeof value !== "object") return false;
	const r = value as Record<string, unknown>;
	return (
		typeof r.id === "string" &&
		typeof r.exerciseId === "string" &&
		typeof r.date === "string" &&
		typeof r.at === "number" &&
		typeof r.reps === "number" &&
		typeof r.weight === "number"
	);
}

/** Every month holding at least one pain reading, oldest first. */
export function getPainMonths(): string[] {
	if (painMonthsCache === null) {
		const list = readJson<string[]>(PAIN_MONTHS_KEY, []);
		painMonthsCache = Array.isArray(list)
			? [...new Set(list.filter((m) => typeof m === "string"))].sort()
			: [];
	}
	return painMonthsCache;
}

export function getPainEntries(month: string): PainEntry[] {
	const cached = painCache.get(month);
	if (cached) return cached;
	const list = readJson<PainEntry[]>(painKey(month), []);
	const clean = Array.isArray(list) ? list.filter(isPainEntry) : [];
	clean.sort((a, b) => a.at.localeCompare(b.at));
	painCache.set(month, clean);
	return clean;
}

function isPainEntry(value: unknown): value is PainEntry {
	if (!value || typeof value !== "object") return false;
	const r = value as Record<string, unknown>;
	return (
		typeof r.id === "string" &&
		typeof r.date === "string" &&
		typeof r.at === "string" &&
		typeof r.level === "number"
	);
}

function commitPainMonths(next: string[]): void {
	painMonthsCache = [...new Set(next)].sort();
	storage.set(PAIN_MONTHS_KEY, JSON.stringify(painMonthsCache));
}

function commitPainEntries(month: string, next: PainEntry[]): void {
	const sorted = [...next].sort((a, b) => a.at.localeCompare(b.at));
	if (sorted.length === 0) {
		painCache.delete(month);
		storage.remove(painKey(month));
		commitPainMonths(getPainMonths().filter((m) => m !== month));
		return;
	}
	painCache.set(month, sorted);
	storage.set(painKey(month), JSON.stringify(sorted));
	if (!getPainMonths().includes(month)) {
		commitPainMonths([...getPainMonths(), month]);
	}
}

export function addPainEntry(
	level: number,
	options: { note?: string; when?: Date } = {},
): PainEntry {
	const when = options.when ?? new Date();
	const date = dateKey(when);
	const note = options.note?.trim();
	const entry: PainEntry = {
		id: makeId("p"),
		date,
		at: when.toISOString(),
		level: clampPainLevel(level),
		...(note ? { note } : {}),
	};
	const month = monthKeyOfDate(date);
	commitPainEntries(month, [...getPainEntries(month), entry]);
	notify();
	return entry;
}

/** A blank or omitted note removes it, the same way set notes behave. */
export function updatePainEntry(
	id: string,
	month: string,
	level: number,
	note?: string,
): void {
	const trimmed = note?.trim();
	commitPainEntries(
		month,
		getPainEntries(month).map((e) => {
			if (e.id !== id) return e;
			const { note: _previous, ...rest } = e;
			return {
				...rest,
				level: clampPainLevel(level),
				...(trimmed ? { note: trimmed } : {}),
			};
		}),
	);
	notify();
}

export function deletePainEntry(id: string, month: string): void {
	commitPainEntries(
		month,
		getPainEntries(month).filter((e) => e.id !== id),
	);
	notify();
}

export function painOnDate(key: string): PainEntry[] {
	return getPainEntries(monthKeyOfDate(key)).filter((e) => e.date === key);
}

export function datesWithPain(month: string): Set<string> {
	const keys = new Set<string>();
	for (const entry of getPainEntries(month)) keys.add(entry.date);
	return keys;
}

function commitExercises(next: Exercise[]): void {
	exercisesCache = next;
	storage.set(EXERCISES_KEY, JSON.stringify(next));
}

function commitMonths(next: string[]): void {
	monthsCache = [...new Set(next)].sort();
	storage.set(MONTHS_KEY, JSON.stringify(monthsCache));
}

function commitMonthSets(month: string, next: WorkoutSet[]): void {
	const sorted = [...next].sort((a, b) => a.at - b.at);
	if (sorted.length === 0) {
		setsCache.delete(month);
		storage.remove(setsKey(month));
		commitMonths(getMonths().filter((m) => m !== month));
		return;
	}
	setsCache.set(month, sorted);
	storage.set(setsKey(month), JSON.stringify(sorted));
	if (!getMonths().includes(month)) commitMonths([...getMonths(), month]);
}

let idCounter = 0;
function makeId(prefix: string): string {
	idCounter += 1;
	return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

export function addExercise(name: string): Exercise {
	const exercise: Exercise = {
		id: makeId("e"),
		name: name.trim(),
		createdAt: Date.now(),
	};
	commitExercises([...getExercises(), exercise]);
	notify();
	return exercise;
}

export function renameExercise(id: string, name: string): void {
	commitExercises(
		getExercises().map((e) => (e.id === id ? { ...e, name: name.trim() } : e)),
	);
	notify();
}

/** Removes the exercise and every set recorded against it. */
export function deleteExercise(id: string): void {
	for (const month of [...getMonths()]) {
		const sets = getMonthSets(month);
		const kept = sets.filter((s) => s.exerciseId !== id);
		if (kept.length !== sets.length) commitMonthSets(month, kept);
	}
	commitExercises(getExercises().filter((e) => e.id !== id));
	notify();
}

export interface SetDraft {
	exerciseId: string;
	reps: number;
	weight: number;
	unit: WeightUnit;
	speed?: SetSpeed;
	note?: string;
	/** Defaults to now — supplied by importers and the mock generator. */
	at?: number;
}

export function addSet(draft: SetDraft): WorkoutSet {
	const at = draft.at ?? Date.now();
	const date = dateKey(new Date(at));
	const set: WorkoutSet = {
		id: makeId("w"),
		exerciseId: draft.exerciseId,
		date,
		at,
		reps: draft.reps,
		weight: draft.weight,
		unit: draft.unit,
		...(draft.speed ? { speed: draft.speed } : {}),
		...(draft.note?.trim() ? { note: draft.note.trim() } : {}),
	};
	const month = monthKeyOfDate(date);
	commitMonthSets(month, [...getMonthSets(month), set]);
	notify();
	return set;
}

export type SetPatch = Partial<
	Pick<WorkoutSet, "reps" | "weight" | "unit" | "note" | "speed">
>;

export function updateSet(id: string, month: string, patch: SetPatch): void {
	commitMonthSets(
		month,
		getMonthSets(month).map((s) => {
			if (s.id !== id) return s;
			const { note: _note, speed: _speed, ...rest } = { ...s, ...patch };
			const note =
				patch.note === undefined ? s.note?.trim() : patch.note.trim();
			// Both fields are absent unless recorded, so passing an explicit
			// undefined is how the editor clears one.
			const speed = "speed" in patch ? patch.speed : s.speed;
			return {
				...rest,
				...(speed ? { speed } : {}),
				...(note ? { note } : {}),
			};
		}),
	);
	notify();
}

export function deleteSet(id: string, month: string): void {
	commitMonthSets(
		month,
		getMonthSets(month).filter((s) => s.id !== id),
	);
	notify();
}

/** The current month plus the `count - 1` months before it. */
export function recentMonthKeys(count = 2, from: Date = new Date()): string[] {
	const keys: string[] = [];
	for (let i = 0; i < count; i++)
		keys.push(monthKey(new Date(from.getFullYear(), from.getMonth() - i, 1)));
	return keys;
}

export function setsInMonths(
	months: string[],
	exerciseId?: string,
): WorkoutSet[] {
	const all: WorkoutSet[] = [];
	for (const month of months) {
		for (const set of getMonthSets(month)) {
			if (!exerciseId || set.exerciseId === exerciseId) all.push(set);
		}
	}
	return all.sort((a, b) => b.at - a.at);
}

/** Walks the month index backwards so it usually only reads one bucket. */
export function lastSetFor(exerciseId: string): WorkoutSet | null {
	const months = getMonths();
	for (let i = months.length - 1; i >= 0; i--) {
		const sets = getMonthSets(months[i]);
		for (let j = sets.length - 1; j >= 0; j--) {
			if (sets[j].exerciseId === exerciseId) return sets[j];
		}
	}
	return null;
}

export function setsOnDate(key: string): WorkoutSet[] {
	return getMonthSets(monthKeyOfDate(key)).filter((s) => s.date === key);
}

export function datesWithSets(month: string): Set<string> {
	const keys = new Set<string>();
	for (const set of getMonthSets(month)) keys.add(set.date);
	return keys;
}

export interface DayGroup {
	date: string;
	sets: WorkoutSet[];
}

/** Newest day first; sets within a day stay in the order they were recorded. */
export function groupByDate(sets: WorkoutSet[]): DayGroup[] {
	const byDate = new Map<string, WorkoutSet[]>();
	for (const set of sets) {
		const bucket = byDate.get(set.date);
		if (bucket) bucket.push(set);
		else byDate.set(set.date, [set]);
	}
	return [...byDate.entries()]
		.sort((a, b) => (a[0] < b[0] ? 1 : -1))
		.map(([date, group]) => ({
			date,
			sets: [...group].sort((a, b) => a.at - b.at),
		}));
}

export interface ExerciseGroup {
	exerciseId: string;
	name: string;
	sets: WorkoutSet[];
}

export function groupByExercise(sets: WorkoutSet[]): ExerciseGroup[] {
	const names = new Map(getExercises().map((e) => [e.id, e.name]));
	const byExercise = new Map<string, WorkoutSet[]>();
	for (const set of sets) {
		const bucket = byExercise.get(set.exerciseId);
		if (bucket) bucket.push(set);
		else byExercise.set(set.exerciseId, [set]);
	}
	return [...byExercise.entries()]
		.map(([exerciseId, group]) => ({
			exerciseId,
			name: names.get(exerciseId) ?? "Deleted exercise",
			sets: [...group].sort((a, b) => a.at - b.at),
		}))
		.sort((a, b) => a.sets[0].at - b.sets[0].at);
}

export interface SetHighlights {
	pbId: string | null;
	bothId: string | null;
	heaviestId: string | null;
	mostRepsId: string | null;
}

/** Picks the best set by each measure, always landing on different sets so
 *  every marker stays visible.
 *
 *  Claimed in order of standing: the personal best (the most reps at the
 *  heaviest weight) outranks everything, then a set tying both peaks, then the
 *  heaviest of whatever is left, then the highest-rep set of what remains. Ties
 *  go to the most recent set.
 *
 *  Because the PB is by definition also the top set on both measures whenever
 *  one exists, `bothId` only lands on a *second* set matching both peaks. */
export function highlightSets(sets: WorkoutSet[]): SetHighlights {
	const best = (
		pool: WorkoutSet[],
		score: (set: WorkoutSet) => number,
	): WorkoutSet | null =>
		pool.reduce<WorkoutSet | null>((winner, set) => {
			if (!winner) return set;
			const diff = score(set) - score(winner);
			return diff > 0 || (diff === 0 && set.at > winner.at) ? set : winner;
		}, null);

	const byWeight = (set: WorkoutSet) => weightKg(set);
	const byReps = (set: WorkoutSet) => set.reps;

	// Compare against the peak values rather than a single winning set, so a set
	// that ties for most reps still counts as topping both.
	const peakWeight = sets.reduce((max, s) => Math.max(max, byWeight(s)), 0);
	const peakReps = sets.reduce((max, s) => Math.max(max, byReps(s)), 0);
	// The best effort at the top load, which is what a personal best on this
	// exercise actually means, and it outranks every other marker.
	const pb = best(
		sets.filter((s) => weightKg(s) === peakWeight),
		byReps,
	);

	const afterPb = sets.filter((s) => s.id !== pb?.id);
	const both = best(
		afterPb.filter(
			(s) => weightKg(s) === peakWeight && s.reps === peakReps,
		),
		byWeight,
	);

	const afterBoth = afterPb.filter((s) => s.id !== both?.id);
	const heaviest = best(afterBoth, byWeight);
	const afterHeaviest = afterBoth.filter((s) => s.id !== heaviest?.id);
	const mostReps = best(afterHeaviest, byReps);

	return {
		pbId: pb?.id ?? null,
		bothId: both?.id ?? null,
		heaviestId: heaviest?.id ?? null,
		mostRepsId: mostReps?.id ?? null,
	};
}

/** Plain-text summary of a day's workout, for the clipboard. */
export function formatDayForClipboard(key: string, unit: WeightUnit): string {
	const groups = groupByExercise(setsOnDate(key));
	const pain = painOnDate(key);
	const lines: string[] = [fullDayLabel(key)];
	if (groups.length === 0 && pain.length === 0) {
		lines.push("", "Nothing recorded.");
		return lines.join("\n");
	}
	if (groups.length === 0) lines.push("", "No sets recorded.");
	for (const group of groups) {
		lines.push("", group.name);
		group.sets.forEach((set, i) => {
			const speed = set.speed ? ` · ${SPEED_LABELS[set.speed]}` : "";
			const note = set.note ? ` — ${set.note}` : "";
			lines.push(
				`  Set ${i + 1} · ${formatReps(set.reps)} · ${formatSetWeight(set, unit)}${speed}${note}`,
			);
		});
	}
	if (pain.length > 0) {
		lines.push("", "Pain / irritation");
		for (const entry of pain) {
			const note = entry.note ? ` — ${entry.note}` : "";
			lines.push(
				`  ${formatPainTime(entry)} · ${entry.level}/${PAIN_MAX}${note}`,
			);
		}
	}
	return lines.join("\n");
}

export function clearAllWorkouts(): void {
	for (const month of getMonths()) {
		storage.remove(setsKey(month));
		setsCache.delete(month);
	}
	for (const month of getPainMonths()) {
		storage.remove(painKey(month));
		painCache.delete(month);
	}
	commitMonths([]);
	commitPainMonths([]);
	commitExercises([]);
	notify();
}

export type ExportRange = "all" | "1m" | "3m" | "6m" | "12m";

export const EXPORT_RANGES: { value: ExportRange; label: string }[] = [
	{ value: "1m", label: "1 month" },
	{ value: "3m", label: "3 months" },
	{ value: "6m", label: "6 months" },
	{ value: "12m", label: "12 months" },
	{ value: "all", label: "All time" },
];

function monthsForRange(range: ExportRange): string[] {
	const all = getMonths();
	if (range === "all") return all;
	const count = { "1m": 1, "3m": 3, "6m": 6, "12m": 12 }[range];
	const window = new Set(recentMonthKeys(count));
	return all.filter((m) => window.has(m));
}

export function setsForRange(range: ExportRange): WorkoutSet[] {
	return monthsForRange(range)
		.flatMap((m) => getMonthSets(m))
		.sort((a, b) => a.at - b.at);
}

export function painForRange(range: ExportRange): PainEntry[] {
	const all = getPainMonths();
	const months =
		range === "all"
			? all
			: (() => {
					const window = new Set(
						recentMonthKeys({ "1m": 1, "3m": 3, "6m": 6, "12m": 12 }[range]),
					);
					return all.filter((m) => window.has(m));
				})();
	return months
		.flatMap((m) => getPainEntries(m))
		.sort((a, b) => a.at.localeCompare(b.at));
}

export interface WorkoutExportPayload {
	app: "Supplementary";
	type: "workouts";
	version: 1;
	exportedAt: string;
	range: ExportRange;
	exercises: Exercise[];
	sets: WorkoutSet[];
	pain: PainEntry[];
}

export function buildWorkoutExport(range: ExportRange): WorkoutExportPayload {
	return {
		app: "Supplementary",
		type: "workouts",
		version: 1,
		exportedAt: new Date().toISOString(),
		range,
		exercises: getExercises(),
		sets: setsForRange(range),
		pain: painForRange(range),
	};
}

/** One flat table for both kinds of record, discriminated by `type`, so a day
 *  can hold any number of pain readings and an off-day can appear with no sets
 *  at all. Spreadsheets open it as a single sheet. */
const CSV_COLUMNS = [
	"type",
	"date",
	"time",
	"exercise",
	"reps",
	"weight",
	"unit",
	"speed",
	"pain",
	"note",
] as const;

function csvEscape(value: string): string {
	return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildWorkoutCsv(range: ExportRange): string {
	const names = new Map(getExercises().map((e) => [e.id, e.name]));
	const rows = [CSV_COLUMNS.join(",")];

	for (const set of setsForRange(range)) {
		const time = new Date(set.at).toTimeString().slice(0, 8);
		rows.push(
			[
				"set",
				set.date,
				time,
				names.get(set.exerciseId) ?? "Deleted exercise",
				String(set.reps),
				String(set.weight),
				set.unit,
				set.speed ? String(set.speed) : "",
				"",
				set.note ?? "",
			]
				.map(csvEscape)
				.join(","),
		);
	}

	for (const entry of painForRange(range)) {
		const time = new Date(entry.at).toTimeString().slice(0, 8);
		rows.push(
			[
				"pain",
				entry.date,
				time,
				"",
				"",
				"",
				"",
				"",
				String(entry.level),
				entry.note ?? "",
			]
				.map(csvEscape)
				.join(","),
		);
	}

	return rows.join("\n");
}

export interface WorkoutImportResult {
	ok: boolean;
	added: number;
	skipped: number;
	exercisesAdded: number;
	painAdded: number;
	painSkipped: number;
	error?: string;
}

function importFailed(error: string): WorkoutImportResult {
	return {
		ok: false,
		added: 0,
		skipped: 0,
		exercisesAdded: 0,
		painAdded: 0,
		painSkipped: 0,
		error,
	};
}

function findOrCreateExercise(
	name: string,
	createdIds: Set<string>,
): Exercise | null {
	const trimmed = name.trim();
	if (!trimmed) return null;
	const existing = findExerciseByName(trimmed);
	if (existing) return existing;
	const created = addExerciseSilently(trimmed);
	createdIds.add(created.id);
	return created;
}

function addExerciseSilently(name: string): Exercise {
	const exercise: Exercise = {
		id: makeId("e"),
		name,
		createdAt: Date.now(),
	};
	commitExercises([...getExercises(), exercise]);
	return exercise;
}

/** Two sets are considered the same recording if they share an exercise,
 *  timestamp, reps and weight — that's what makes re-importing safe. */
function signature(set: {
	exerciseId: string;
	at: number;
	reps: number;
	weight: number;
}): string {
	return `${set.exerciseId}|${set.at}|${set.reps}|${set.weight}`;
}

interface PendingPain {
	/** YYYY-MM-DD in local time. */
	date: string;
	/** ISO 8601. */
	at: string;
	level: number;
	note?: string;
}

interface PendingSet {
	exerciseId: string;
	at: number;
	reps: number;
	weight: number;
	unit: WeightUnit;
	speed?: SetSpeed;
	note?: string;
}

/** Imports merge rather than replace, so a ranged export can be restored
 *  without wiping months it never contained. */
function mergeRecords(
	pending: PendingSet[],
	pendingPain: PendingPain[],
	exercisesAdded: number,
): WorkoutImportResult {
	const byMonth = new Map<string, WorkoutSet[]>();

	// Matching is by count rather than by presence. Identical sets are normal —
	// three sets of 20 reps at 8 kg in one session is a real workout, and a CSV
	// with no time column gives every row that day the same timestamp, so they
	// all share a signature. Only as many incoming sets as are already stored
	// are skipped; the rest are added, which keeps a repeated import idempotent
	// without ever dropping a genuine set.
	const alreadyStored = new Map<string, number>();
	for (const month of getMonths()) {
		for (const set of getMonthSets(month)) {
			const sig = signature(set);
			alreadyStored.set(sig, (alreadyStored.get(sig) ?? 0) + 1);
		}
	}

	let added = 0;
	let skipped = 0;

	for (const item of pending) {
		const sig = signature(item);
		const unmatched = alreadyStored.get(sig) ?? 0;
		if (unmatched > 0) {
			alreadyStored.set(sig, unmatched - 1);
			skipped += 1;
			continue;
		}

		const date = dateKey(new Date(item.at));
		const month = monthKeyOfDate(date);
		let bucket = byMonth.get(month);
		if (!bucket) {
			bucket = [...getMonthSets(month)];
			byMonth.set(month, bucket);
		}
		bucket.push({
			id: makeId("w"),
			exerciseId: item.exerciseId,
			date,
			at: item.at,
			reps: item.reps,
			weight: item.weight,
			unit: item.unit,
			...(item.speed ? { speed: item.speed } : {}),
			...(item.note ? { note: item.note } : {}),
		});
		added += 1;
	}

	// Pain readings dedupe the same way, on their timestamp and level.
	const painByMonth = new Map<string, PainEntry[]>();
	const painStored = new Map<string, number>();
	for (const month of getPainMonths()) {
		for (const entry of getPainEntries(month)) {
			const sig = `${entry.at}|${entry.level}`;
			painStored.set(sig, (painStored.get(sig) ?? 0) + 1);
		}
	}

	let painAdded = 0;
	let painSkipped = 0;

	for (const item of pendingPain) {
		const sig = `${item.at}|${item.level}`;
		const unmatched = painStored.get(sig) ?? 0;
		if (unmatched > 0) {
			painStored.set(sig, unmatched - 1);
			painSkipped += 1;
			continue;
		}

		const month = monthKeyOfDate(item.date);
		let bucket = painByMonth.get(month);
		if (!bucket) {
			bucket = [...getPainEntries(month)];
			painByMonth.set(month, bucket);
		}
		bucket.push({
			id: makeId("p"),
			date: item.date,
			at: item.at,
			level: item.level,
			...(item.note ? { note: item.note } : {}),
		});
		painAdded += 1;
	}

	for (const [month, sets] of byMonth) commitMonthSets(month, sets);
	for (const [month, entries] of painByMonth) commitPainEntries(month, entries);
	notify();
	return { ok: true, added, skipped, exercisesAdded, painAdded, painSkipped };
}

function toUnit(value: unknown): WeightUnit {
	return value === "lbs" || value === "lb" ? "lbs" : "kg";
}

function toNumber(value: unknown): number | null {
	const parsed =
		typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
	return Number.isFinite(parsed) ? parsed : null;
}

export function importWorkoutsFromJson(json: string): WorkoutImportResult {
	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		return importFailed("The file isn't valid JSON.");
	}

	const root = (parsed ?? {}) as Record<string, unknown>;
	const rawSets = Array.isArray(parsed) ? parsed : root.sets;
	const rawPain = Array.isArray(root.pain) ? root.pain : [];
	if (!Array.isArray(rawSets) && rawPain.length === 0) {
		return importFailed("No workout sets or pain records found in that file.");
	}

	const createdIds = new Set<string>();
	// Names from the payload let us resolve ids that don't exist on this device.
	const payloadNames = new Map<string, string>();
	if (Array.isArray(root.exercises)) {
		for (const raw of root.exercises) {
			const e = raw as Record<string, unknown>;
			if (typeof e?.id === "string" && typeof e?.name === "string") {
				payloadNames.set(e.id, e.name);
			}
		}
	}

	const pendingPain: PendingPain[] = [];
	for (const raw of rawPain) {
		if (!raw || typeof raw !== "object") continue;
		const r = raw as Record<string, unknown>;
		const level = toPainLevel(r.level ?? r.pain);
		const at = typeof r.at === "string" ? new Date(r.at) : null;
		if (level === null || !at || Number.isNaN(at.getTime())) continue;
		pendingPain.push({
			date: typeof r.date === "string" ? r.date : dateKey(at),
			at: at.toISOString(),
			level,
			note:
				typeof r.note === "string" && r.note.trim() ? r.note.trim() : undefined,
		});
	}

	const pending: PendingSet[] = [];
	for (const raw of Array.isArray(rawSets) ? rawSets : []) {
		if (!raw || typeof raw !== "object") continue;
		const r = raw as Record<string, unknown>;

		const name =
			typeof r.exercise === "string"
				? r.exercise
				: typeof r.exerciseName === "string"
					? r.exerciseName
					: typeof r.exerciseId === "string"
						? payloadNames.get(r.exerciseId)
						: undefined;

		const existingById =
			typeof r.exerciseId === "string" ? getExercise(r.exerciseId) : null;
		const exercise =
			existingById ?? (name ? findOrCreateExercise(name, createdIds) : null);
		if (!exercise) continue;

		const reps = toNumber(r.reps);
		const weight = toNumber(r.weight);
		if (reps === null || weight === null) continue;

		const at =
			toNumber(r.at) ??
			(typeof r.date === "string"
				? dateFromKey(r.date).getTime() + 12 * HOUR * 1000
				: null);
		if (at === null) continue;

		pending.push({
			exerciseId: exercise.id,
			at,
			reps,
			weight,
			unit: toUnit(r.unit),
			speed: toSpeed(r.speed),
			note:
				typeof r.note === "string" && r.note.trim() ? r.note.trim() : undefined,
		});
	}

	if (pending.length === 0 && pendingPain.length === 0 && createdIds.size === 0) {
		return importFailed("No usable workout sets found in that file.");
	}

	return mergeRecords(pending, pendingPain, createdIds.size);
}

/** Minimal RFC-4180 style parser — handles quoted fields and embedded commas. */
function parseCsv(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let quoted = false;

	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (quoted) {
			if (char === '"') {
				if (text[i + 1] === '"') {
					field += '"';
					i += 1;
				} else quoted = false;
			} else field += char;
			continue;
		}
		if (char === '"') {
			quoted = true;
		} else if (char === ",") {
			row.push(field);
			field = "";
		} else if (char === "\n" || char === "\r") {
			if (char === "\r" && text[i + 1] === "\n") i += 1;
			row.push(field);
			rows.push(row);
			row = [];
			field = "";
		} else field += char;
	}
	if (field.length > 0 || row.length > 0) {
		row.push(field);
		rows.push(row);
	}
	return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Accepts `2026-08-05`, `2026/8/5` and anything with that prefix, returning a
 *  YYYY-MM-DD key. */
function parseCsvDate(value: string): string | null {
	const match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(value.trim());
	if (!match) return null;
	const [, y, m, d] = match;
	return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** Picks the unit out of a header like `Weight (kg)`. */
function unitFromLabel(label: string): WeightUnit | null {
	if (/lbs?\b|pounds?/.test(label)) return "lbs";
	if (/kgs?\b|kilo/.test(label)) return "kg";
	return null;
}

/** Handles both the CSV this app exports (`date,time,exercise,reps,weight,unit,
 *  note`) and the common `Date, Exercise, Weight (kg), Reps, Type` shape, by
 *  resolving columns by name rather than position. Unknown columns — `Type`,
 *  for instance — are ignored. */
export function importWorkoutsFromCsv(text: string): WorkoutImportResult {
	const rows = parseCsv(text);
	if (rows.length < 2) {
		return importFailed("That CSV has no rows to import.");
	}

	const header = rows[0].map((h) => h.trim().toLowerCase());
	const col = (...names: string[]) => {
		for (const name of names) {
			const exact = header.indexOf(name);
			if (exact >= 0) return exact;
		}
		for (const name of names) {
			const prefixed = header.findIndex((h) => h.startsWith(name));
			if (prefixed >= 0) return prefixed;
		}
		return -1;
	};

	const dateCol = col("date");
	const exerciseCol = col("exercise", "workout", "name");
	const repsCol = col("reps", "rep");
	const weightCol = col("weight", "kg", "lbs", "load");
	const typeCol = col("type", "kind");
	const painCol = col("pain", "irritation", "level");

	const canReadSets = exerciseCol >= 0 && repsCol >= 0 && weightCol >= 0;
	if (dateCol < 0 || (!canReadSets && painCol < 0)) {
		return importFailed(
			"CSV needs a date column, plus either exercise/reps/weight or pain.",
		);
	}

	const timeCol = col("time");
	const unitCol = col("unit");
	const speedCol = col("speed", "pace");
	const noteCol = col("note", "comment");
	// Falls back to the unit named in the weight header, e.g. "Weight (kg)".
	const headerUnit = unitFromLabel(header[weightCol]) ?? "kg";

	const createdIds = new Set<string>();
	const pending: PendingSet[] = [];
	const pendingPain: PendingPain[] = [];

	// Rebuilds the recorded instant from a local date plus an optional time,
	// defaulting to midday when the file carries no clock value.
	const timestampFor = (dateValue: string, row: string[]): Date => {
		const base = dateFromKey(dateValue);
		const time = timeCol >= 0 ? (row[timeCol] ?? "").trim() : "";
		const [h, m, sec] = time.split(":").map((n) => Number.parseInt(n, 10));
		base.setHours(
			Number.isFinite(h) ? h : 12,
			Number.isFinite(m) ? m : 0,
			Number.isFinite(sec) ? sec : 0,
			0,
		);
		return base;
	};

	for (const row of rows.slice(1)) {
		const dateValue = parseCsvDate(row[dateCol] ?? "");
		if (!dateValue) continue;

		// A `type` of "pain" marks a reading; anything else (including the "Set"
		// that third-party exports write on every row) is a set.
		const rowType =
			typeCol >= 0 ? (row[typeCol] ?? "").trim().toLowerCase() : "";
		if (rowType === "pain" || rowType === "irritation") {
			const level = painCol >= 0 ? toPainLevel(row[painCol]) : null;
			if (level === null) continue;
			const painNote = noteCol >= 0 ? (row[noteCol] ?? "").trim() : "";
			pendingPain.push({
				date: dateValue,
				at: timestampFor(dateValue, row).toISOString(),
				level,
				note: painNote || undefined,
			});
			continue;
		}
		if (!canReadSets) continue;

		const exercise = findOrCreateExercise(row[exerciseCol] ?? "", createdIds);
		if (!exercise) continue;

		const reps = toNumber(row[repsCol]);
		const weight = toNumber(row[weightCol]);
		if (reps === null || weight === null) continue;

		const unitCell =
			unitCol >= 0 ? (row[unitCol] ?? "").trim().toLowerCase() : "";
		const note = noteCol >= 0 ? (row[noteCol] ?? "").trim() : "";
		pending.push({
			exerciseId: exercise.id,
			at: timestampFor(dateValue, row).getTime(),
			reps,
			weight,
			unit: unitCell ? toUnit(unitCell) : headerUnit,
			speed: speedCol >= 0 ? toSpeed(row[speedCol]) : undefined,
			note: note || undefined,
		});
	}

	if (pending.length === 0 && pendingPain.length === 0) {
		return importFailed("No usable rows found in that CSV.");
	}

	return mergeRecords(pending, pendingPain, createdIds.size);
}

const MOCK_EXERCISES: { name: string; reps: number[]; weight: number }[] = [
	{ name: "Chest Press", reps: [12, 10, 8], weight: 40 },
	{ name: "Lat Pulldown", reps: [12, 12, 10], weight: 45 },
	{ name: "Leg Press", reps: [15, 12, 10], weight: 90 },
	{ name: "Shoulder Press", reps: [12, 10, 8], weight: 22.5 },
	{ name: "Bicep Curl", reps: [14, 12, 10], weight: 12 },
	{ name: "Tricep Pushdown", reps: [15, 12, 12], weight: 20 },
	{ name: "Seated Row", reps: [12, 10, 10], weight: 50 },
	{ name: "Deadlift", reps: [8, 6, 5], weight: 80 },
];

// Mostly unrecorded, matching how it gets used in practice.
const MOCK_SPEEDS: (SetSpeed | undefined)[] = [
	undefined,
	undefined,
	undefined,
	1,
	2,
	3,
];

const MOCK_PAIN_NOTES = [
	"",
	"",
	"",
	"Left knee, dull ache",
	"Right shoulder on overhead work",
	"Lower back tight",
	"Elbow twinge",
];

const MOCK_NOTES = [
	"",
	"",
	"",
	"Felt strong",
	"Last rep was a grind",
	"Dropped a plate, form was off",
];

/** Sample data has to stay in the past. A session stamped later today would
 *  give a negative elapsed time, which the counter clamps to "0s" — so it sits
 *  there reading zero instead of ticking. Returns null when the day is today
 *  and it's too early for the session to have plausibly happened. */
function mockHour(day: Date, preferred: number): number | null {
	const now = new Date();
	if (dateKey(day) !== dateKey(now)) return preferred;
	const latest = now.getHours() - 1;
	return latest < 1 ? null : Math.min(preferred, latest);
}

/** Replaces all workout data with ~4 months of plausible history. */
export function generateMockWorkouts(): {
	exercises: number;
	sets: number;
	pain: number;
} {
	clearAllWorkouts();

	const exercises = MOCK_EXERCISES.map((preset) => ({
		preset,
		exercise: addExerciseSilently(preset.name),
	}));

	let sets = 0;
	for (let back = 120; back >= 0; back--) {
		const day = new Date();
		day.setDate(day.getDate() - back);
		// Roughly a Mon/Wed/Fri split, with the odd session missed.
		if (![1, 3, 5].includes(day.getDay())) continue;
		if (Math.random() > 0.85) continue;

		const half = Math.ceil(exercises.length / 2);
		const offset = day.getDay() === 1 ? 0 : day.getDay() === 3 ? half : 0;
		const todays = exercises.slice(offset, offset + half);

		const hour = mockHour(day, 18);
		if (hour === null) continue;

		let minute = 0;
		for (const { preset, exercise } of todays) {
			// Slow progressive overload over the 4 months.
			const progress = Math.floor((120 - back) / 30) * 2.5;
			preset.reps.forEach((reps, i) => {
				const at = new Date(day);
				at.setHours(hour, minute, 0, 0);
				minute += 4;
				addSetSilently({
					exerciseId: exercise.id,
					reps: Math.max(1, reps + (Math.random() > 0.7 ? 1 : 0)),
					weight: preset.weight + progress + i * 0,
					unit: "kg",
					speed: MOCK_SPEEDS[Math.floor(Math.random() * MOCK_SPEEDS.length)],
					note: MOCK_NOTES[Math.floor(Math.random() * MOCK_NOTES.length)],
					at: at.getTime(),
				});
				sets += 1;
			});
		}
	}

	// Readings land on rest days too, which is the whole point of tracking them
	// separately from sets.
	let pain = 0;
	const painByMonth = new Map<string, PainEntry[]>();
	for (let back = 120; back >= 0; back--) {
		if (Math.random() > 0.55) continue;
		const day = new Date();
		day.setDate(day.getDate() - back);
		const trained = [1, 3, 5].includes(day.getDay());
		const painHour = mockHour(day, trained ? 21 : 9);
		if (painHour === null) continue;
		day.setHours(painHour, Math.floor(Math.random() * 60), 0, 0);
		const base = trained ? 3 : 1;
		const note = MOCK_PAIN_NOTES[
			Math.floor(Math.random() * MOCK_PAIN_NOTES.length)
		];
		const entry: PainEntry = {
			id: makeId("p"),
			date: dateKey(day),
			at: day.toISOString(),
			level: clampPainLevel(base + Math.floor(Math.random() * 5)),
			...(note ? { note } : {}),
		};
		const month = monthKeyOfDate(entry.date);
		const bucket = painByMonth.get(month) ?? [];
		bucket.push(entry);
		painByMonth.set(month, bucket);
		pain += 1;
	}
	for (const [month, entries] of painByMonth) commitPainEntries(month, entries);

	notify();
	return { exercises: exercises.length, sets, pain };
}

function addSetSilently(draft: SetDraft): void {
	const at = draft.at ?? Date.now();
	const date = dateKey(new Date(at));
	const month = monthKeyOfDate(date);
	commitMonthSets(month, [
		...getMonthSets(month),
		{
			id: makeId("w"),
			exerciseId: draft.exerciseId,
			date,
			at,
			reps: draft.reps,
			weight: draft.weight,
			unit: draft.unit,
			...(draft.speed ? { speed: draft.speed } : {}),
			...(draft.note?.trim() ? { note: draft.note.trim() } : {}),
		},
	]);
}
