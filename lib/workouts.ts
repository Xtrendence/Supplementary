/* eslint-disable react-hooks/exhaustive-deps */
import { type DependencyList, useMemo, useSyncExternalStore } from "react";
import { storage } from "./storage";
import { dateFromKey, dateKey } from "./supplements";

export type WeightUnit = "kg" | "lbs";

export const WEIGHT_UNIT_OPTIONS: { value: WeightUnit; label: string }[] = [
	{ value: "kg", label: "kg" },
	{ value: "lbs", label: "lbs" },
];

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

/** "Today" / "Yesterday" / "Sat. 8 Aug 2026" */
export function dayLabel(key: string, today: string = dateKey()): string {
	if (key === today) return "Today";
	const yesterday = dateFromKey(today);
	yesterday.setDate(yesterday.getDate() - 1);
	if (key === dateKey(yesterday)) return "Yesterday";
	const d = dateFromKey(key);
	return `${WEEKDAY_LABELS[d.getDay()]}. ${d.getDate()} ${
		MONTH_LABELS[d.getMonth()]
	} ${d.getFullYear()}`;
}

const EXERCISES_KEY = "workout:exercises";
const MONTHS_KEY = "workout:months";
const setsKey = (month: string) => `workout:sets:${month}`;

const listeners = new Set<() => void>();
let version = 0;

let exercisesCache: Exercise[] | null = null;
let monthsCache: string[] | null = null;
const setsCache = new Map<string, WorkoutSet[]>();

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
		...(draft.note?.trim() ? { note: draft.note.trim() } : {}),
	};
	const month = monthKeyOfDate(date);
	commitMonthSets(month, [...getMonthSets(month), set]);
	notify();
	return set;
}

export type SetPatch = Partial<
	Pick<WorkoutSet, "reps" | "weight" | "unit" | "note">
>;

export function updateSet(id: string, month: string, patch: SetPatch): void {
	commitMonthSets(
		month,
		getMonthSets(month).map((s) => {
			if (s.id !== id) return s;
			const { note: _previous, ...rest } = { ...s, ...patch };
			const note =
				patch.note === undefined ? s.note?.trim() : patch.note.trim();
			return note ? { ...rest, note } : rest;
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
	heaviestId: string | null;
	mostRepsId: string | null;
	bothId: string | null;
}

/** Picks the best set by each measure, always landing on three different sets
 *  so all three markers stay visible.
 *
 *  The set that tops both weight and reps is claimed first, then the heaviest
 *  of whatever is left, then the highest-rep set of what remains after that.
 *  Ties go to the most recent set. */
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
	const both = best(
		sets.filter((s) => weightKg(s) === peakWeight && s.reps === peakReps),
		byWeight,
	);

	const afterBoth = sets.filter((s) => s.id !== both?.id);
	const heaviest = best(afterBoth, byWeight);
	const afterHeaviest = afterBoth.filter((s) => s.id !== heaviest?.id);
	const mostReps = best(afterHeaviest, byReps);

	return {
		bothId: both?.id ?? null,
		heaviestId: heaviest?.id ?? null,
		mostRepsId: mostReps?.id ?? null,
	};
}

/** Plain-text summary of a day's workout, for the clipboard. */
export function formatDayForClipboard(key: string, unit: WeightUnit): string {
	const groups = groupByExercise(setsOnDate(key));
	const lines: string[] = [dayLabel(key)];
	if (groups.length === 0) {
		lines.push("", "No sets recorded.");
		return lines.join("\n");
	}
	for (const group of groups) {
		lines.push("", group.name);
		group.sets.forEach((set, i) => {
			const note = set.note ? ` — ${set.note}` : "";
			lines.push(
				`  Set ${i + 1} · ${formatReps(set.reps)} · ${formatSetWeight(set, unit)}${note}`,
			);
		});
	}
	return lines.join("\n");
}

export function clearAllWorkouts(): void {
	for (const month of getMonths()) {
		storage.remove(setsKey(month));
		setsCache.delete(month);
	}
	commitMonths([]);
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

export interface WorkoutExportPayload {
	app: "Supplementary";
	type: "workouts";
	version: 1;
	exportedAt: string;
	range: ExportRange;
	exercises: Exercise[];
	sets: WorkoutSet[];
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
	};
}

const CSV_COLUMNS = [
	"date",
	"time",
	"exercise",
	"reps",
	"weight",
	"unit",
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
				set.date,
				time,
				names.get(set.exerciseId) ?? "Deleted exercise",
				String(set.reps),
				String(set.weight),
				set.unit,
				set.note ?? "",
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
	error?: string;
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

interface PendingSet {
	exerciseId: string;
	at: number;
	reps: number;
	weight: number;
	unit: WeightUnit;
	note?: string;
}

/** Imports merge rather than replace, so a ranged export can be restored
 *  without wiping months it never contained. */
function mergeSets(
	pending: PendingSet[],
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
			...(item.note ? { note: item.note } : {}),
		});
		added += 1;
	}

	for (const [month, sets] of byMonth) commitMonthSets(month, sets);
	notify();
	return { ok: true, added, skipped, exercisesAdded };
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
		return {
			ok: false,
			added: 0,
			skipped: 0,
			exercisesAdded: 0,
			error: "The file isn't valid JSON.",
		};
	}

	const root = (parsed ?? {}) as Record<string, unknown>;
	const rawSets = Array.isArray(parsed) ? parsed : root.sets;
	if (!Array.isArray(rawSets)) {
		return {
			ok: false,
			added: 0,
			skipped: 0,
			exercisesAdded: 0,
			error: "No workout sets found in that file.",
		};
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

	const pending: PendingSet[] = [];
	for (const raw of rawSets) {
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
			note:
				typeof r.note === "string" && r.note.trim() ? r.note.trim() : undefined,
		});
	}

	if (pending.length === 0 && createdIds.size === 0) {
		return {
			ok: false,
			added: 0,
			skipped: 0,
			exercisesAdded: 0,
			error: "No usable workout sets found in that file.",
		};
	}

	return mergeSets(pending, createdIds.size);
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
		return {
			ok: false,
			added: 0,
			skipped: 0,
			exercisesAdded: 0,
			error: "That CSV has no rows to import.",
		};
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

	if (dateCol < 0 || exerciseCol < 0 || repsCol < 0 || weightCol < 0) {
		return {
			ok: false,
			added: 0,
			skipped: 0,
			exercisesAdded: 0,
			error: "CSV needs at least date, exercise, reps and weight columns.",
		};
	}

	const timeCol = col("time");
	const unitCol = col("unit");
	const noteCol = col("note", "comment");
	// Falls back to the unit named in the weight header, e.g. "Weight (kg)".
	const headerUnit = unitFromLabel(header[weightCol]) ?? "kg";

	const createdIds = new Set<string>();
	const pending: PendingSet[] = [];

	for (const row of rows.slice(1)) {
		const dateValue = parseCsvDate(row[dateCol] ?? "");
		if (!dateValue) continue;

		const exercise = findOrCreateExercise(row[exerciseCol] ?? "", createdIds);
		if (!exercise) continue;

		const reps = toNumber(row[repsCol]);
		const weight = toNumber(row[weightCol]);
		if (reps === null || weight === null) continue;

		const base = dateFromKey(dateValue);
		const time = timeCol >= 0 ? (row[timeCol] ?? "").trim() : "";
		const [h, m, s] = time.split(":").map((n) => Number.parseInt(n, 10));
		base.setHours(
			Number.isFinite(h) ? h : 12,
			Number.isFinite(m) ? m : 0,
			Number.isFinite(s) ? s : 0,
			0,
		);

		const unitCell =
			unitCol >= 0 ? (row[unitCol] ?? "").trim().toLowerCase() : "";
		const note = noteCol >= 0 ? (row[noteCol] ?? "").trim() : "";
		pending.push({
			exerciseId: exercise.id,
			at: base.getTime(),
			reps,
			weight,
			unit: unitCell ? toUnit(unitCell) : headerUnit,
			note: note || undefined,
		});
	}

	if (pending.length === 0) {
		return {
			ok: false,
			added: 0,
			skipped: 0,
			exercisesAdded: 0,
			error: "No usable rows found in that CSV.",
		};
	}

	return mergeSets(pending, createdIds.size);
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

const MOCK_NOTES = [
	"",
	"",
	"",
	"Felt strong",
	"Last rep was a grind",
	"Dropped a plate, form was off",
];

/** Replaces all workout data with ~4 months of plausible history. */
export function generateMockWorkouts(): { exercises: number; sets: number } {
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

		let minute = 0;
		for (const { preset, exercise } of todays) {
			// Slow progressive overload over the 4 months.
			const progress = Math.floor((120 - back) / 30) * 2.5;
			preset.reps.forEach((reps, i) => {
				const at = new Date(day);
				at.setHours(18, minute, 0, 0);
				minute += 4;
				addSetSilently({
					exerciseId: exercise.id,
					reps: Math.max(1, reps + (Math.random() > 0.7 ? 1 : 0)),
					weight: preset.weight + progress + i * 0,
					unit: "kg",
					note: MOCK_NOTES[Math.floor(Math.random() * MOCK_NOTES.length)],
					at: at.getTime(),
				});
				sets += 1;
			});
		}
	}

	notify();
	return { exercises: exercises.length, sets };
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
			...(draft.note?.trim() ? { note: draft.note.trim() } : {}),
		},
	]);
}
