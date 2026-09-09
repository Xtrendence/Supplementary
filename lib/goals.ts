import { dateFromKey, dateKey } from "./supplements";
import {
  PAIN_MAX,
  type WeightUnit,
  type WorkoutSet,
  getPainEntries,
  getPainMonths,
  recentMonthKeys,
  roundWeight,
  setsInMonths,
  weightIn,
} from "./workouts";

/** Long enough to see whether a weight has actually been established, short
 *  enough that half-forgotten form doesn't anchor the suggestion. */
const WINDOW_DAYS = 56;
const SESSIONS_CONSIDERED = 8;
/** Sessions at a weight before it counts as yours rather than a trial. */
const SESSIONS_TO_ESTABLISH = 2;
/** Sessions at a weight before it may be stepped up from. Establishing a
 *  weight and having earned the right to leave it are different bars. */
const SESSIONS_TO_PROGRESS = 3;
/** Only recent sessions can establish a weight. Without this, a weight you
 *  deliberately deloaded away from weeks ago would still read as your working
 *  weight, and every suggestion would be anchored above where you are. */
const ESTABLISH_LOOKBACK = 4;
/** The rep range spans this fraction of your best at the weight. */
const RANGE_FLOOR_RATIO = 0.65;
const MIN_RANGE_SPAN = 2;
const FALLBACK_TOP_REPS = 12;
/** Days after a session in which pain is treated as caused by it. */
const PAIN_LAG_DAYS = 2;
/** A reading this recent counts on its own, not only in an average. */
const PAIN_RECENT_DAYS = 3;
/** How far above your resting level counts as a warning, even when the
 *  absolute number still looks tolerable. Scales with sensitivity: at the
 *  default of 6 a rise of 2 matters, at 10 a single point does. */
function painRiseLimit(sensitivity: number): number {
  return Math.max(1, 4 - Math.round(sensitivity / 3));
}
const LAYOFF_MIN_DAYS = 14;
const LAYOFF_GAP_MULTIPLE = 2.5;
const DEFAULT_STEP = { kg: 2.5, lbs: 5 };

export const DEFAULT_PAIN_SENSITIVITY = 6;
export const MAX_PAIN_SENSITIVITY = 10;

export interface PainThresholds {
  /** Stop adding weight; work the same range. */
  caution: number;
  /** Stop progressing; less work, not more. */
  backOff: number;
  /** Don't train this today. */
  stop: number;
}

/** Higher sensitivity lowers the bar at which pain starts steering the
 *  suggestion; 0 ignores pain entirely. The default of 6 puts the bands at
 *  3 / 4 / 5, which suits a dull ache worth respecting long before it turns
 *  into a flare-up. */
export function painThresholds(sensitivity: number): PainThresholds | null {
  if (sensitivity <= 0) return null;
  const caution = Math.min(8, Math.max(1, 9 - Math.round(sensitivity)));
  return { caution, backOff: caution + 1, stop: caution + 2 };
}

export type GoalKind =
  | "baseline"
  | "build"
  | "step-up"
  | "consolidate"
  | "hold"
  | "reduce"
  | "regress"
  | "ease-back"
  | "rest";

export interface Goal {
  kind: GoalKind;
  /** In the display unit. Absent when the suggestion is not to train. */
  weight?: number;
  /** The target is a range, not a single number — sets naturally descend, and
   *  a range is what tells you when the weight has become too light. */
  repsLow?: number;
  repsHigh?: number;
  /** Sets to aim for, when it's worth saying. */
  sets?: number;
  reason: string;
  unit: WeightUnit;
}

interface Session {
  date: string;
  /** Time of the last set, for pain ordering. */
  at: number;
  sets: WorkoutSet[];
  /** The weight most of the session's sets were done at, ties going heavier. */
  primaryWeight: number;
  maxWeight: number;
}

interface RepRange {
  low: number;
  high: number;
}

function sameWeight(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01;
}

function oneRepMax(weight: number, reps: number): number {
  return weight * (1 + reps / 30);
}

function repsForSameEffort(target: number, weight: number): number {
  return Math.round((target / weight - 1) * 30);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/** Newest first. */
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
    .map(([date, group]) => {
      const counts = new Map<number, number>();
      for (const set of group) {
        const weight = roundWeight(weightIn(set, unit));
        counts.set(weight, (counts.get(weight) ?? 0) + 1);
      }
      let primaryWeight = 0;
      let bestCount = 0;
      for (const [weight, count] of counts) {
        if (count > bestCount || (count === bestCount && weight > primaryWeight)) {
          primaryWeight = weight;
          bestCount = count;
        }
      }
      return {
        date,
        at: group.reduce((max, set) => Math.max(max, set.at), 0),
        sets: group,
        primaryWeight,
        maxWeight: group.reduce(
          (max, set) => Math.max(max, roundWeight(weightIn(set, unit))),
          0
        ),
      };
    })
    .slice(0, SESSIONS_CONSIDERED);
}

function setsAt(session: Session, unit: WeightUnit, weight: number): WorkoutSet[] {
  return session.sets.filter((set) =>
    sameWeight(roundWeight(weightIn(set, unit)), weight)
  );
}

/** The weight you've actually settled at: the heaviest that has been a
 *  session's main weight often enough to count. A single heavier set is a
 *  trial, not a new working weight — which is the whole point. */
function establishedWeight(sessions: Session[]): number {
  const recent = sessions.slice(0, ESTABLISH_LOOKBACK);
  const primaryCounts = new Map<number, number>();
  for (const session of recent) {
    primaryCounts.set(
      session.primaryWeight,
      (primaryCounts.get(session.primaryWeight) ?? 0) + 1
    );
  }

  // What you're on now, if you've been on it long enough to count.
  const current = recent[0].primaryWeight;
  if ((primaryCounts.get(current) ?? 0) >= SESSIONS_TO_ESTABLISH) return current;

  // Otherwise whatever you've spent the most sessions on, and when that's a
  // tie the lighter one — a heavier weight has to earn its place.
  let best = current;
  let bestCount = 0;
  for (const [weight, count] of primaryCounts) {
    if (count > bestCount || (count === bestCount && weight < best)) {
      best = weight;
      bestCount = count;
    }
  }
  return best;
}

/** Anything heavier than the working weight that hasn't earned its place yet. */
function findProbe(
  sessions: Session[],
  unit: WeightUnit,
  working: number
): { weight: number; session: Session } | null {
  for (const session of sessions.slice(0, 2)) {
    if (session.maxWeight > working + 0.01) {
      return { weight: session.maxWeight, session };
    }
  }
  return null;
}

/** Aim for every set to reach the top of the range; the top is your best at
 *  this weight, so the bar rises with you rather than sitting at a constant. */
/** Reps to expect at a heavier weight, carrying the same effort across. */
function carriedReps(from: number, reps: number, to: number): number {
  const epley = repsForSameEffort(oneRepMax(from, reps), to);
  const step = from > 0 ? (to - from) / from : 1;
  if (step <= 0 || step > 0.35) return epley;
  // Empirically a modest jump costs less than Epley suggests once the sets run
  // long: ~20% more weight takes roughly a third off the reps, not two thirds.
  const ratio = Math.min(0.75, Math.max(0.45, 1 - 1.6 * step));
  return Math.max(epley, Math.round(reps * ratio));
}

function repRangeAt(
  sessions: Session[],
  unit: WeightUnit,
  weight: number
): RepRange {
  // Whatever you were managing at the weight below, carried across by effort:
  // a stable bar to clear that doesn't move every time you have a good day.
  let lighter = 0;
  let lighterBest = 0;
  for (const session of sessions) {
    for (const set of session.sets) {
      const w = roundWeight(weightIn(set, unit));
      if (w < weight - 0.01 && w > lighter) {
        lighter = w;
        lighterBest = 0;
      }
      if (sameWeight(w, lighter)) lighterBest = Math.max(lighterBest, set.reps);
    }
  }

  let top = 0;
  if (lighter > 0 && lighterBest > 0 && weight > 0) {
    top = carriedReps(lighter, lighterBest, weight);
  }
  if (top < 3) {
    // No lighter weight to inherit from, so the bar is your own best here and
    // holding it for consecutive sessions is what proves it.
    top = 0;
    for (const session of sessions) {
      for (const set of setsAt(session, unit, weight)) {
        top = Math.max(top, set.reps);
      }
    }
    if (top === 0) {
      for (const session of sessions) {
        for (const set of session.sets) top = Math.max(top, set.reps);
      }
      top = top || FALLBACK_TOP_REPS;
    }
  }
  const low = Math.max(3, Math.round(top * RANGE_FLOOR_RATIO));
  return { low, high: Math.max(low + MIN_RANGE_SPAN, top) };
}

function sessionsAtWeight(
  sessions: Session[],
  unit: WeightUnit,
  weight: number
): Session[] {
  return sessions.filter((session) => setsAt(session, unit, weight).length > 0);
}

/** Best set of each session at a weight, oldest first. */
function repTrend(
  sessions: Session[],
  unit: WeightUnit,
  weight: number
): number[] {
  return sessionsAtWeight(sessions, unit, weight)
    .slice(0, 4)
    .reverse()
    .map((session) =>
      setsAt(session, unit, weight).reduce(
        (max, set) => Math.max(max, set.reps),
        0
      )
    );
}

interface PainSignal {
  /** Mean worst reading in the days following recent sessions. */
  after: number | null;
  /** Mean worst reading on days not shadowed by a session — your resting level. */
  resting: number | null;
  /** Worst reading in the last few days. */
  now: number;
  /** How far training is pushing you above resting. */
  rise: number;
}

function readPain(sessions: Session[], now: Date): PainSignal | null {
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

  const shadowed = new Set<string>();
  for (const session of sessions) {
    const start = dateFromKey(session.date);
    for (let offset = 0; offset <= PAIN_LAG_DAYS; offset++) {
      const day = new Date(start);
      day.setDate(day.getDate() + offset);
      shadowed.add(dateKey(day));
    }
  }

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - WINDOW_DAYS);
  const from = dateKey(cutoff);

  const afterReadings: number[] = [];
  const restingReadings: number[] = [];
  for (const [date, level] of worstByDate) {
    if (date < from || date > dateKey(now)) continue;
    if (shadowed.has(date)) afterReadings.push(level);
    else restingReadings.push(level);
  }

  let recent = 0;
  for (let offset = 0; offset < PAIN_RECENT_DAYS; offset++) {
    const day = new Date(now);
    day.setDate(day.getDate() - offset);
    recent = Math.max(recent, worstByDate.get(dateKey(day)) ?? 0);
  }

  const mean = (values: number[]) =>
    values.length === 0
      ? null
      : values.reduce((sum, n) => sum + n, 0) / values.length;
  const after = mean(afterReadings);
  const resting = mean(restingReadings);

  return {
    after,
    resting,
    now: recent,
    rise: after !== null && resting !== null ? after - resting : 0,
  };
}

function nextWeightUp(
  current: number,
  available: number[],
  sessions: Session[],
  unit: WeightUnit
): number | null {
  const higher = available.filter((w) => w > current + 0.01);
  if (higher.length > 0) return Math.min(...higher);
  if (available.length > 0) return null;

  const weights = [
    ...new Set(
      sessions.flatMap((s) =>
        s.sets.map((set) => roundWeight(weightIn(set, unit)))
      )
    ),
  ].sort((a, b) => a - b);
  let smallest = Number.POSITIVE_INFINITY;
  for (let i = 1; i < weights.length; i++) {
    const gap = weights[i] - weights[i - 1];
    if (gap > 0.01) smallest = Math.min(smallest, gap);
  }
  const step = Number.isFinite(smallest) ? smallest : DEFAULT_STEP[unit];
  return roundWeight(current + step);
}

function nextWeightDown(current: number, available: number[]): number | null {
  const lower = available.filter((w) => w < current - 0.01);
  return lower.length > 0 ? Math.max(...lower) : null;
}

function grindingIn(session: Session, unit: WeightUnit, weight: number): boolean {
  const relevant = setsAt(session, unit, weight);
  if (relevant.length === 0) return false;
  const slow = relevant.filter((set) => set.speed === 1).length;
  return slow * 2 >= relevant.length;
}

function effortlessIn(session: Session, unit: WeightUnit, weight: number): boolean {
  const relevant = setsAt(session, unit, weight);
  return relevant.length > 0 && relevant.every((set) => set.speed === 3);
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

/** Suggests what to aim for next.
 *
 *  The shape of it: a weight you've established, a rep range whose top is your
 *  own best at that weight, and an action. Weight only goes up once every set
 *  reaches the top of the range and the weight has been held for more than one
 *  session — a single heavier set is treated as a trial to repeat, not as the
 *  new normal. Pain can hold, shrink or cancel the session, and if pain rose
 *  after a heavier trial it sends you back down rather than parking you on the
 *  weight that provoked it. */
export function calculateGoal({
  exerciseId,
  unit,
  availableWeights,
  painSensitivity = DEFAULT_PAIN_SENSITIVITY,
  now = new Date(),
}: GoalInput): Goal | null {
  const sessions = buildSessions(exerciseId, unit, now);
  if (sessions.length === 0) return null;

  const working = establishedWeight(sessions);
  const range = repRangeAt(sessions, unit, working);
  const atWorking = sessionsAtWeight(sessions, unit, working);
  const probe = findProbe(sessions, unit, working);
  const pain = readPain(sessions, now);
  const thresholds = painThresholds(painSensitivity);

  const painWord = (): string => {
    if (!pain) return "";
    if (pain.after !== null && pain.resting !== null && pain.rise >= riseLimit) {
      return `pain is running ${pain.after.toFixed(1)}/${PAIN_MAX} after sessions against ${pain.resting.toFixed(1)} at rest`;
    }
    return `pain hit ${pain.now}/${PAIN_MAX} in the last few days`;
  };
  const riseLimit = painRiseLimit(painSensitivity);
  const elevated =
    pain !== null &&
    thresholds !== null &&
    (pain.now >= thresholds.caution || pain.rise >= riseLimit);

  const gaps: number[] = [];
  for (let i = 1; i < sessions.length; i++) {
    gaps.push(
      Math.round(
        (dateFromKey(sessions[i - 1].date).getTime() -
          dateFromKey(sessions[i].date).getTime()) /
          86400000
      )
    );
  }
  const usualGap = gaps.length > 0 ? median(gaps) : 0;
  const daysSince = Math.round(
    (dateFromKey(dateKey(now)).getTime() -
      dateFromKey(sessions[0].date).getTime()) /
      86400000
  );

  // --- not training is a valid answer, and comes before anything else
  if (pain !== null && thresholds !== null && pain.now >= thresholds.stop) {
    return {
      kind: "rest",
      unit,
      reason: `${painWord()} — leave this one alone until it settles.`,
    };
  }

  // --- a heavier trial plus rising pain means go back down, not stay up there
  if (probe && elevated) {
    return {
      kind: "regress",
      weight: working,
      repsLow: range.low,
      repsHigh: range.high,
      unit,
      reason: `${roundWeight(probe.weight)} ${unit} went on the bar and ${painWord()} — back to ${roundWeight(working)} ${unit} until it's quiet again.`,
    };
  }

  if (pain !== null && thresholds !== null && pain.now >= thresholds.backOff) {
    // Backing off means taking load off the bar, not doing the same weight for
    // fewer sets. Only when there's nothing lighter to drop to does the
    // shorter session become the whole answer.
    const lighter = working > 0 ? nextWeightDown(working, availableWeights) : null;
    return {
      kind: "reduce",
      weight: lighter ?? working,
      repsLow: range.low,
      repsHigh: range.low,
      sets: 2,
      unit,
      reason:
        lighter !== null
          ? `${painWord()} — drop to ${roundWeight(lighter)} ${unit} for a couple of easy sets.`
          : `${painWord()} — keep it short, a couple of easy sets at most.`,
    };
  }

  if (elevated) {
    return {
      kind: "hold",
      weight: working,
      repsLow: range.low,
      repsHigh: range.high,
      unit,
      reason: `${painWord()} — hold ${roundWeight(working)} ${unit} and don't add anything.`,
    };
  }

  // --- coming back from a break
  const layoffLimit = Math.max(LAYOFF_MIN_DAYS, usualGap * LAYOFF_GAP_MULTIPLE);
  if (daysSince > layoffLimit) {
    return {
      kind: "ease-back",
      weight: working,
      repsLow: range.low,
      repsHigh: Math.max(range.low, range.high - 2),
      unit,
      reason: `${daysSince} days since the last session — start at the bottom of the range and rebuild.`,
    };
  }

  if (sessions.length === 1 && sessions[0].sets.length < 2) {
    const only = sessions[0].sets[0];
    return {
      kind: "baseline",
      weight: roundWeight(weightIn(only, unit)),
      repsLow: only.reps,
      repsHigh: only.reps,
      unit,
      reason: "One set logged — repeat it to set a baseline worth measuring.",
    };
  }

  // --- a heavier weight that hasn't earned its place yet
  if (probe) {
    const probeSets = setsAt(probe.session, unit, probe.weight);
    const probeBest = probeSets.reduce((max, set) => Math.max(max, set.reps), 0);
    const probeGround = grindingIn(probe.session, unit, probe.weight);
    const expected = Math.max(3, carriedReps(working, range.high, probe.weight));
    const wentWell =
      !probeGround && probeBest >= Math.max(3, Math.round(expected * 0.6));
    const probeSessionCount = sessions
      .slice(0, ESTABLISH_LOOKBACK)
      .filter((session) => setsAt(session, unit, probe.weight).length > 0).length;
    // A single set at a heavier weight is a toe in the water; a normal-length
    // session where every set was heavier is actually moving up.
    const usualSets = median(
      atWorking.map((session) => setsAt(session, unit, working).length)
    );
    const carriedSession =
      probeSets.length === probe.session.sets.length &&
      probeSets.length >= Math.max(2, Math.floor(usualSets));

    if (!wentWell) {
      return {
        kind: "regress",
        weight: working,
        repsLow: range.low,
        repsHigh: range.high,
        unit,
        reason: probeGround
          ? `${roundWeight(probe.weight)} ${unit} was a grind — build back up at ${roundWeight(working)} ${unit} first.`
          : `${roundWeight(probe.weight)} ${unit} only managed ${probeBest} — stay at ${roundWeight(working)} ${unit} a while longer.`,
      };
    }

    if (probeSessionCount >= 2 || carriedSession) {
      return {
        kind: "consolidate",
        weight: roundWeight(probe.weight),
        repsLow: Math.max(3, Math.round(expected * 0.75)),
        repsHigh: Math.max(probeBest, expected),
        unit,
        reason:
          probeSessionCount >= 2
            ? `${roundWeight(probe.weight)} ${unit} has gone well twice now — hold it for one more session and it's yours.`
            : `A whole session at ${roundWeight(probe.weight)} ${unit} — repeat it before calling the weight yours.`,
      };
    }

    // Tried once and it went fine, but once isn't established, so the goal
    // stays where it is.
    return {
      kind: "build",
      weight: working,
      repsLow: range.low,
      repsHigh: range.high,
      unit,
      reason: `${roundWeight(probe.weight)} ${unit} × ${probeBest} went well once — keep ${roundWeight(working)} ${unit} solid and repeat it before it counts.`,
    };
  }

  // --- performance at the working weight
  const trend = repTrend(sessions, unit, working);
  // Two consecutive non-increases ending clearly below the earlier peak. One
  // off session is noise, and a session that merely finished lower than it
  // opened is fatigue, not regression — the trend only ever compares session
  // bests, so the target snaps back to the opening number next time.
  const peak = Math.max(...trend.slice(0, -1), 0);
  const latest = trend[trend.length - 1] ?? 0;
  const declining =
    trend.length >= 3 &&
    latest < trend[trend.length - 2] &&
    trend[trend.length - 2] <= trend[trend.length - 3] &&
    latest <= peak - 2;
  const lastAtWorking = atWorking[0];
  const lastSets = lastAtWorking ? setsAt(lastAtWorking, unit, working) : [];
  const worstSet = lastSets.reduce(
    (min, set) => Math.min(min, set.reps),
    Number.POSITIVE_INFINITY
  );
  const usualSetCount = median(
    atWorking.map((session) => setsAt(session, unit, working).length)
  );
  const fullSession = lastSets.length >= Math.max(1, Math.floor(usualSetCount));

  if (declining) {
    return {
      kind: "hold",
      weight: working,
      repsLow: range.low,
      repsHigh: range.high,
      unit,
      reason: `Reps have slipped from ${trend[0]} to ${trend[trend.length - 1]} at ${roundWeight(working)} ${unit} — regroup here before pushing on.`,
    };
  }

  if (lastAtWorking && grindingIn(lastAtWorking, unit, working)) {
    return {
      kind: "hold",
      weight: working,
      repsLow: range.low,
      repsHigh: range.high,
      unit,
      reason: `Last session was a grind — stay at ${roundWeight(working)} ${unit} until it feels easier.`,
    };
  }

  const bestSet = lastSets.reduce((max, set) => Math.max(max, set.reps), 0);
  const wholeSessionInRange =
    fullSession && Number.isFinite(worstSet) && worstSet >= range.low;
  // The top has to have been held, not just touched once — a single good day
  // is a personal best, not a reason to load the bar.
  const heldTop =
    trend.length >= 2 &&
    trend[trend.length - 1] >= range.high &&
    trend[trend.length - 2] >= range.high;
  const earnedIt =
    atWorking.length >= SESSIONS_TO_PROGRESS && wholeSessionInRange && heldTop;
  const cruising =
    atWorking.length >= 2 &&
    atWorking
      .slice(0, 2)
      .every((session) => effortlessIn(session, unit, working));
  const readyForMore =
    earnedIt || (cruising && atWorking.length >= SESSIONS_TO_ESTABLISH);

  if (readyForMore) {
    // A working weight of zero is a bodyweight movement; there's nothing to
    // load, so the reps carry the progression.
    const next =
      working > 0
        ? nextWeightUp(working, availableWeights, sessions, unit)
        : null;
    if (next !== null) {
      const carried = Math.max(3, carriedReps(working, range.high, next));
      const low = Math.max(3, Math.round(carried * 0.75));
      return {
        kind: "step-up",
        weight: next,
        repsLow: low,
        repsHigh: Math.max(carried, low + MIN_RANGE_SPAN),
        unit,
        reason: cruising
          ? `Two sessions of ${roundWeight(working)} ${unit} marked as fast as possible — it's ready to go up.`
          : `Hit ${bestSet} at ${roundWeight(working)} ${unit} with every set inside ${range.low}–${range.high} — the weight has stopped being the limit.`,
      };
    }
    return {
      kind: "build",
      weight: working,
      repsLow: range.high,
      repsHigh: range.high + 2,
      unit,
      reason: `${roundWeight(working)} ${unit} is the heaviest you have — keep taking the reps up instead.`,
    };
  }

  return {
    kind: "build",
    weight: working,
    repsLow: range.low,
    repsHigh: range.high,
    unit,
    reason: Number.isFinite(worstSet)
      ? `Opened at ${bestSet} and finished at ${worstSet} last time — get the whole session inside ${range.low}–${range.high} before the weight moves.`
      : `Work every set into ${range.low}–${range.high} at ${roundWeight(working)} ${unit}.`,
  };
}

export function goalLabel(kind: GoalKind): string {
  switch (kind) {
    case "rest":
      return "Rest";
    case "regress":
      return "Back off";
    case "reduce":
      return "Keep it light";
    case "hold":
      return "Hold";
    case "consolidate":
      return "Consolidate";
    case "step-up":
      return "Step up";
    case "ease-back":
      return "Ease back in";
    case "baseline":
      return "Baseline";
    default:
      return "Goal";
  }
}
