import { dateFromKey, dateKey } from "./supplements";
import {
  PAIN_MAX,
  type SetSpeed,
  type WeightUnit,
  type WorkoutSet,
  getPainEntries,
  getPainMonths,
  monthKeyOfDate,
  recentMonthKeys,
  roundWeight,
  setsInMonths,
  weightIn,
} from "./workouts";

/** How far back to look. Long enough to see a trend, short enough that a
 *  layoff doesn't anchor the suggestion to old form. */
const WINDOW_DAYS = 42;
/** Sessions considered when deciding whether progress has stalled. */
const SESSIONS_CONSIDERED = 5;
/** Rep target when there's no history to infer one from. */
const FALLBACK_REP_CEILING = 15;
const REP_CEILING_BOUNDS = { min: 10, max: 30 };
/** Never suggest fewer reps than this after a weight step. */
const MIN_REPS_AFTER_STEP = 5;
/** Days after a session in which pain is treated as caused by it. */
const PAIN_LAG_DAYS = 2;
/** A reading this recent counts on its own, not just in the average — a spike
 *  shouldn't be diluted by a fortnight of good days. */
const PAIN_RECENT_DAYS = 3;
/** Used only when neither the equipment list nor the history offers a step. */
const DEFAULT_STEP = { kg: 2.5, lbs: 5 };

export const DEFAULT_PAIN_SENSITIVITY = 6;
export const MAX_PAIN_SENSITIVITY = 10;

export interface PainThresholds {
	/** Stop adding weight; reps only. */
	caution: number;
	/** Stop progressing at all. */
	backOff: number;
	/** Drop the weight and let it settle. */
	stop: number;
}

/** Higher sensitivity lowers the bar at which pain starts steering the
 *  suggestion; 0 ignores pain entirely. The default of 6 puts the bands at
 *  3 / 4 / 5, which suits a dull ache that's worth respecting long before it
 *  turns into a flare-up. A sharper, more occasional pain wants a lower
 *  setting. */
export function painThresholds(sensitivity: number): PainThresholds | null {
	if (sensitivity <= 0) return null;
	const caution = Math.min(8, Math.max(1, 9 - Math.round(sensitivity)));
	return { caution, backOff: caution + 1, stop: caution + 2 };
}

export type GoalKind =
  | "baseline"
  | "progress-reps"
  | "progress-weight"
  | "hold"
  | "deload";

export interface Goal {
  kind: GoalKind;
  /** In the display unit. */
  weight: number;
  reps: number;
  /** One line explaining why, so the number isn't mysterious. */
  reason: string;
  unit: WeightUnit;
}

interface Session {
  date: string;
  sets: WorkoutSet[];
  /** Heaviest set, ties broken by reps. */
  top: WorkoutSet;
}

/** Epley: a rough one-rep-max, used only to carry effort across a weight step
 *  so the rep target drops by a sensible amount rather than a guessed one. */
function oneRepMax(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

function repsForSameEffort(target: number, weight: number): number {
  return Math.round(((target / weight - 1) * 30 * 10) / 10);
}

function sameWeight(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01;
}

function buildSessions(
  exerciseId: string,
  unit: WeightUnit,
  now: Date
): Session[] {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - WINDOW_DAYS);
  const from = dateKey(cutoff);

  const sets = setsInMonths(recentMonthKeys(3, now), exerciseId).filter(
    (set) => set.date >= from
  );

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
      sets: group,
      top: group.reduce((best, set) =>
        weightIn(set, unit) > weightIn(best, unit) ||
        (sameWeight(weightIn(set, unit), weightIn(best, unit)) &&
          set.reps > best.reps)
          ? set
          : best
      ),
    }));
}

/** Worst reading on each of the days following recent sessions, averaged.
 *  Soreness shows up a day or two later, so same-day readings alone would miss
 *  what a session actually cost. */
interface PainSignal {
	/** Mean of the worst readings in the days following recent sessions. */
	average: number;
	/** Worst reading in the last few days, whenever it happened. */
	recent: number;
	/** Whichever of the two is higher — what the thresholds are tested on. */
	effective: number;
}

function painAfterSessions(sessions: Session[], now: Date): PainSignal | null {
  const worstByDate = new Map<string, number>();
  for (const month of getPainMonths()) {
    for (const entry of getPainEntries(month)) {
      const current = worstByDate.get(entry.date);
      if (current === undefined || entry.level > current) {
        worstByDate.set(entry.date, entry.level);
      }
    }
  }
  if (worstByDate.size === 0) return null;

  const readings: number[] = [];
  for (const session of sessions) {
    const start = dateFromKey(session.date);
    for (let offset = 0; offset <= PAIN_LAG_DAYS; offset++) {
      const day = new Date(start);
      day.setDate(day.getDate() + offset);
      if (day > now) break;
      const level = worstByDate.get(dateKey(day));
      if (level !== undefined) readings.push(level);
    }
  }

  let recent = 0;
  for (let offset = 0; offset < PAIN_RECENT_DAYS; offset++) {
    const day = new Date(now);
    day.setDate(day.getDate() - offset);
    recent = Math.max(recent, worstByDate.get(dateKey(day)) ?? 0);
  }

  if (readings.length === 0 && recent === 0) return null;
  const average =
    readings.length > 0
      ? readings.reduce((sum, n) => sum + n, 0) / readings.length
      : 0;
  return { average, recent, effective: Math.max(average, recent) };
}

/** The rep count to reach before adding weight. Inferred from the last time
 *  they stepped up: whatever they were managing at the previous weight is the
 *  bar to clear at this one. */
function repCeilingFor(
  sessions: Session[],
  unit: WeightUnit,
  current: number
): number {
  let previousWeight = 0;
  for (const session of sessions) {
    for (const set of session.sets) {
      const weight = weightIn(set, unit);
      if (weight < current - 0.01 && weight > previousWeight) {
        previousWeight = weight;
      }
    }
  }
  if (previousWeight === 0) return FALLBACK_REP_CEILING;

  let bestAtPrevious = 0;
  for (const session of sessions) {
    for (const set of session.sets) {
      if (sameWeight(weightIn(set, unit), previousWeight)) {
        bestAtPrevious = Math.max(bestAtPrevious, set.reps);
      }
    }
  }
  return Math.min(
    REP_CEILING_BOUNDS.max,
    Math.max(REP_CEILING_BOUNDS.min, bestAtPrevious || FALLBACK_REP_CEILING)
  );
}

/** Next loadable weight up. Prefers the equipment list, falls back to the
 *  smallest step the history shows, then to a plate-sized default. */
function stepUp(
  current: number,
  available: number[],
  sessions: Session[],
  unit: WeightUnit
): number | null {
  const higher = available.filter((w) => w > current + 0.01);
  if (higher.length > 0) return Math.min(...higher);
  if (available.length > 0) return null; // at the top of what they own

  const weights = [
    ...new Set(
      sessions.flatMap((s) => s.sets.map((set) => roundWeight(weightIn(set, unit))))
    ),
  ].sort((a, b) => a - b);
  let smallestGap = Number.POSITIVE_INFINITY;
  for (let i = 1; i < weights.length; i++) {
    const gap = weights[i] - weights[i - 1];
    if (gap > 0.01) smallestGap = Math.min(smallestGap, gap);
  }
  const step = Number.isFinite(smallestGap) ? smallestGap : DEFAULT_STEP[unit];
  return roundWeight(current + step);
}

function stepDown(current: number, available: number[]): number | null {
  const lower = available.filter((w) => w < current - 0.01);
  return lower.length > 0 ? Math.max(...lower) : null;
}

export interface GoalInput {
  exerciseId: string;
  unit: WeightUnit;
  /** Loadable weights in the display unit; empty means unknown. */
  availableWeights: number[];
  /** 0 ignores pain, 10 treats the faintest ache as a reason to ease off. */
  painSensitivity?: number;
  now?: Date;
}

/** Suggests the next single set to beat.
 *
 *  Double progression at heart: add reps at the current weight until reaching
 *  the rep target, then take the smallest loadable step up and let reps fall
 *  back. Pain and the recorded speed of the last top set can override that —
 *  pain by holding or deloading, a grinding set by refusing to add weight, an
 *  effortless one by allowing the step early. */
export function calculateGoal({
  exerciseId,
  unit,
  availableWeights,
  painSensitivity = DEFAULT_PAIN_SENSITIVITY,
  now = new Date(),
}: GoalInput): Goal | null {
  const sessions = buildSessions(exerciseId, unit, now);
  if (sessions.length === 0) return null;

  const considered = sessions.slice(0, SESSIONS_CONSIDERED);
  const current = roundWeight(weightIn(considered[0].top, unit));
  const lastSpeed: SetSpeed | undefined = considered[0].top.speed;

  const atCurrent = considered.flatMap((session) =>
    session.sets.filter((set) => sameWeight(weightIn(set, unit), current))
  );
  const bestReps = atCurrent.reduce((max, set) => Math.max(max, set.reps), 0);

  // A single session is a baseline, not a trend: repeat it and see.
  if (considered.length === 1 && atCurrent.length < 2) {
    return {
      kind: "baseline",
      weight: current,
      reps: bestReps,
      unit,
      reason: "First session logged — repeat it to set a baseline.",
    };
  }

  const pain = painAfterSessions(considered, now);
  const thresholds = painThresholds(painSensitivity);
  // Quote whichever reading is driving the decision, so the card explains
  // itself rather than just asserting a level.
  const painNote = pain
    ? pain.recent > pain.average
      ? `Pain hit ${pain.recent}/${PAIN_MAX} in the last few days`
      : `Pain averaged ${pain.average.toFixed(1)}/${PAIN_MAX} after recent sessions`
    : "";

  if (pain !== null && thresholds !== null) {
    if (pain.effective >= thresholds.stop) {
      const lighter = stepDown(current, availableWeights);
      return {
        kind: "deload",
        weight: lighter ?? current,
        reps: lighter ? bestReps : Math.max(MIN_REPS_AFTER_STEP, bestReps - 2),
        unit,
        reason: `${painNote} — let it settle before training this again, and come back lighter.`,
      };
    }
    if (pain.effective >= thresholds.backOff) {
      return {
        kind: "hold",
        weight: current,
        reps: bestReps,
        unit,
        reason: `${painNote} — repeat this at most, don't push it.`,
      };
    }
    if (pain.effective >= thresholds.caution) {
      return {
        kind: "progress-reps",
        weight: current,
        reps: bestReps + 1,
        unit,
        reason: `${painNote} — one more rep at ${current} ${unit}, no extra weight.`,
      };
    }
  }

  // Stalled when the best reps at this weight haven't improved across the last
  // two sessions at it.
  const atCurrentBySession = considered
    .filter((session) =>
      session.sets.some((set) => sameWeight(weightIn(set, unit), current))
    )
    .map((session) =>
      session.sets
        .filter((set) => sameWeight(weightIn(set, unit), current))
        .reduce((max, set) => Math.max(max, set.reps), 0)
    );
  const stalled =
    atCurrentBySession.length >= 2 &&
    atCurrentBySession[0] <= atCurrentBySession[1];

  const ceiling = repCeilingFor(considered, unit, current);
  const effortless = lastSpeed === 3;
  const grinding = lastSpeed === 1;
  const readyForWeight =
    !grinding && (effortless || stalled || bestReps >= ceiling);

  if (readyForWeight) {
    const next = stepUp(current, availableWeights, considered, unit);
    if (next !== null) {
      const carried = repsForSameEffort(oneRepMax(current, bestReps), next);
      const reps = Math.max(
        MIN_REPS_AFTER_STEP,
        Math.min(bestReps, carried > 0 ? carried : MIN_REPS_AFTER_STEP)
      );
      const reason = effortless
        ? `Last top set was marked as fast as possible — ${current} ${unit} has more room.`
        : stalled
          ? `${bestReps} reps at ${current} ${unit} two sessions running — time to load up.`
          : `${bestReps} reps clears the ${ceiling}-rep mark at ${current} ${unit}.`;
      return { kind: "progress-weight", weight: next, reps, unit, reason };
    }
  }

  const reason = grinding
    ? `Last top set was a grind — stay at ${current} ${unit} and add a rep.`
    : readyForWeight
      ? `Ready to load up, but ${current} ${unit} is the heaviest you have — add reps instead.`
      : `${bestReps} reps at ${current} ${unit}, aiming for ${ceiling} before adding weight.`;

  return {
    kind: "progress-reps",
    weight: current,
    reps: bestReps + 1,
    unit,
    reason,
  };
}

export function goalLabel(kind: GoalKind): string {
  switch (kind) {
    case "deload":
      return "Back off";
    case "hold":
      return "Hold";
    case "baseline":
      return "Baseline";
    default:
      return "Goal";
  }
}
