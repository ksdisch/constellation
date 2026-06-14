import { PLANETS } from '../planets/registry';
import type { PowerId } from '../../shared/protocol';

/**
 * Pure, versioned, framework-free progression persistence.
 *
 * The persisted shape is plain JSON: `unlockedPlanets` is an ARRAY (not a Set)
 * so it serializes cleanly. Scenes convert to/from `Set<string>` at the
 * boundary. Nothing here imports Phaser; everything is unit-testable.
 *
 * loadProgress/saveProgress NEVER throw — they guard `typeof window` and wrap
 * all storage access in try/catch, falling back to a sane default.
 *
 * SCHEMA v2 (M10) adds `telemetry`: a per-planet record of how THIS pair plays
 * (the wedge of "The Planet That Knows You Two"). Upgrades from v1 are lossless
 * via migrate() — a v1 save simply gains an empty telemetry map.
 */

export const CURRENT_SCHEMA_VERSION = 2;
export const STORAGE_KEY = 'constellation:progress';

/**
 * Per-power solve-rhythm for the PHONE player, accumulated across clears.
 * `bestMs` is the single fastest solve seen; `totalMs / count` is the average.
 */
export type PowerSolveStat = { count: number; totalMs: number; bestMs: number };

/**
 * A portrait of how this pair cleared one planet, updated on EVERY clear (not
 * just the first) so it tracks the relationship over time. `lastSolveMs` is the
 * sum of the phone player's solve durations in the most recent clear; the
 * laptop's "explore" time is derived as `lastClearMs - lastSolveMs`.
 */
export type PlanetTelemetry = {
  attempts: number;       // clears recorded for this planet
  lastClearMs: number;    // scene-clock elapsed of the most recent clear
  bestClearMs: number;    // fastest clear seen
  lastRespawns: number;   // astronaut deaths in the most recent clear
  lastSolveMs: number;    // sum of phone solve durations in the most recent clear
  solves: Partial<Record<PowerId, PowerSolveStat>>;
};

export type Telemetry = Record<string, PlanetTelemetry>;

export type ProgressState = {
  schemaVersion: number;
  unlockedPlanets: string[];
  completed: Record<string, boolean>;
  telemetry: Telemetry;
};

/** A fresh, sane default. Returns a NEW object every call (no shared refs). */
export function defaultProgress(): ProgressState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    unlockedPlanets: ['planet-1'],
    completed: {},
    telemetry: {},
  };
}

/**
 * Minimal structural check: is `value` shaped like a ProgressState we can use?
 * We only require the fields we read; missing/wrong-typed -> not valid.
 */
function isProgressShape(value: unknown): value is ProgressState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.schemaVersion !== 'number') return false;
  if (!Array.isArray(v.unlockedPlanets)) return false;
  if (!v.unlockedPlanets.every((p) => typeof p === 'string')) return false;
  if (typeof v.completed !== 'object' || v.completed === null) return false;
  return true;
}

/**
 * Normalize a salvageable blob into a fresh, well-typed ProgressState at the
 * current schema version. Pulls forward any string-array unlockedPlanets and
 * boolean-valued completed map; everything else falls back to defaults.
 */
function normalize(value: unknown): ProgressState {
  const base = defaultProgress();
  if (typeof value !== 'object' || value === null) return base;
  const v = value as Record<string, unknown>;

  if (Array.isArray(v.unlockedPlanets)) {
    const unlocked = v.unlockedPlanets.filter(
      (p): p is string => typeof p === 'string',
    );
    // De-dupe, and always guarantee planet-1 is unlocked.
    base.unlockedPlanets = Array.from(new Set(['planet-1', ...unlocked]));
  }

  if (typeof v.completed === 'object' && v.completed !== null) {
    const completed: Record<string, boolean> = {};
    for (const [key, val] of Object.entries(v.completed as Record<string, unknown>)) {
      if (typeof val === 'boolean') completed[key] = val;
    }
    base.completed = completed;
  }

  // Telemetry is v2+; a v1 blob simply has none, so this leaves base.telemetry
  // at the default {}. A salvageable telemetry map is pulled forward, malformed
  // entries dropped — never throws.
  base.telemetry = normalizeTelemetry(v.telemetry);

  return base;
}

/** A finite, non-negative number, else the fallback. Coerces NaN/±Inf/garbage. */
function safeNum(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** Sanitize one planet's telemetry entry; returns null if unsalvageable. */
function sanitizePlanetTelemetry(value: unknown): PlanetTelemetry | null {
  if (typeof value !== 'object' || value === null) return null;
  const v = value as Record<string, unknown>;
  const solves: Partial<Record<PowerId, PowerSolveStat>> = {};
  if (typeof v.solves === 'object' && v.solves !== null) {
    for (const [power, stat] of Object.entries(v.solves as Record<string, unknown>)) {
      if (typeof stat !== 'object' || stat === null) continue;
      const s = stat as Record<string, unknown>;
      const count = safeNum(s.count);
      if (count <= 0) continue;
      solves[power as PowerId] = {
        count,
        totalMs: safeNum(s.totalMs),
        bestMs: safeNum(s.bestMs),
      };
    }
  }
  return {
    attempts: safeNum(v.attempts),
    lastClearMs: safeNum(v.lastClearMs),
    bestClearMs: safeNum(v.bestClearMs),
    lastRespawns: safeNum(v.lastRespawns),
    lastSolveMs: safeNum(v.lastSolveMs),
    solves,
  };
}

/**
 * Coerce an arbitrary blob into a well-formed Telemetry map. Non-objects become
 * {}; each entry is sanitized and dropped if unsalvageable. Pure, never throws —
 * this is the load-path guard that keeps a corrupt telemetry blob from poisoning
 * recordPlanetRun / the portrait.
 */
export function normalizeTelemetry(value: unknown): Telemetry {
  if (typeof value !== 'object' || value === null) return {};
  const out: Telemetry = {};
  for (const [planetId, entry] of Object.entries(value as Record<string, unknown>)) {
    const clean = sanitizePlanetTelemetry(entry);
    if (clean) out[planetId] = clean;
  }
  return out;
}

/**
 * Best-effort upgrade of an older/unknown-version blob to the current version.
 * Pure, never throws. The version switch is the extension seam for future v2.
 */
export function migrate(legacy: unknown): ProgressState {
  const normalized = normalize(legacy);
  normalized.schemaVersion = CURRENT_SCHEMA_VERSION;
  return normalized;
}

/**
 * Read persisted progress. Returns defaultProgress() on missing/corrupt/
 * parse-error/wrong-shape, and routes wrong-version blobs through migrate().
 * Guarded for non-browser environments (e.g. SSR/tests without jsdom).
 * NEVER throws.
 */
export function loadProgress(): ProgressState {
  if (typeof window === 'undefined') return defaultProgress();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return defaultProgress();
    const parsed: unknown = JSON.parse(raw);
    if (!isProgressShape(parsed)) return defaultProgress();
    if (parsed.schemaVersion !== CURRENT_SCHEMA_VERSION) return migrate(parsed);
    // Current version: shape is trusted, but normalize() anyway so the same-
    // version path salvages exactly like migrate (de-dupes unlockedPlanets,
    // re-guarantees planet-1, drops non-boolean completed values, and sanitizes
    // telemetry — which isn't part of isProgressShape). One consistent load path.
    return normalize(parsed);
  } catch {
    return defaultProgress();
  }
}

/**
 * Persist progress. Guarded + try/catch; swallows quota/serialization errors
 * silently. Does not mutate `state`. NEVER throws.
 */
export function saveProgress(state: ProgressState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded / serialization failure — nothing we can do; stay silent.
  }
}

/**
 * Mark a planet complete and unlock the next planet in PLANETS order.
 *
 * PURE: returns a NEW ProgressState; never mutates its input. If `planetId` is
 * the last in the chain (or unknown), only `completed` is updated. The next
 * planet is appended de-duped so repeated calls are idempotent.
 */
export function markPlanetComplete(
  state: ProgressState,
  planetId: string,
): ProgressState {
  const completed = { ...state.completed, [planetId]: true };
  const unlocked = new Set(state.unlockedPlanets);

  // Defensive: an empty registry means the module graph was observed in a
  // half-initialized state (an init-order race). Silently treating that as
  // "no next planet" would corrupt the unlock chain non-deterministically, so
  // we make it a loud failure instead of a quiet wrong answer.
  if (PLANETS.length === 0) {
    throw new Error('markPlanetComplete: PLANETS registry is empty');
  }

  const index = PLANETS.findIndex((p) => p.id === planetId);
  if (index !== -1 && index + 1 < PLANETS.length) {
    unlocked.add(PLANETS[index + 1].id);
  }

  return {
    ...state,
    completed,
    unlockedPlanets: Array.from(unlocked),
  };
}

/** One cleared run of a planet, the raw input to recordPlanetRun. */
export type PlanetRun = {
  clearMs: number;                              // scene-clock elapsed, create→win
  respawns: number;                             // astronaut deaths this run
  solves: { power: PowerId; ms: number }[];     // phone solve durations, in cast order
};

/**
 * Fold one cleared run into the per-planet telemetry. Called on EVERY clear so
 * the portrait tracks the pair over time, not just the first visit.
 *
 * PURE: returns a NEW ProgressState; never mutates input (the prior per-power
 * stat objects are read, never written — touched powers get fresh objects).
 * All inputs are coerced non-negative so a bad timestamp can't corrupt the
 * accumulators. Solo / no-phone runs simply carry an empty `solves` (lastSolveMs
 * = 0), which the portrait reads as "no shared rhythm captured yet".
 */
export function recordPlanetRun(
  state: ProgressState,
  planetId: string,
  run: PlanetRun,
): ProgressState {
  const prev = state.telemetry[planetId];
  const clearMs = safeNum(run.clearMs);

  const solves: Partial<Record<PowerId, PowerSolveStat>> = { ...(prev?.solves ?? {}) };
  let runSolveMs = 0;
  for (const { power, ms } of run.solves) {
    const v = safeNum(ms, -1);
    if (v < 0) continue; // drop NaN/negative timings rather than skew the average
    runSolveMs += v;
    const s = solves[power];
    // Treat a 0 best as "no sample yet" so a corrupt-loaded 0 can't pin bestMs
    // at 0 forever (Math.min(0, real) === 0).
    solves[power] = s
      ? { count: s.count + 1, totalMs: s.totalMs + v, bestMs: s.bestMs > 0 ? Math.min(s.bestMs, v) : v }
      : { count: 1, totalMs: v, bestMs: v };
  }

  const entry: PlanetTelemetry = {
    attempts: (prev?.attempts ?? 0) + 1,
    lastClearMs: clearMs,
    // Same 0-is-no-sample guard for the clear best (recovers after corrupt load).
    bestClearMs: prev && prev.bestClearMs > 0 ? Math.min(prev.bestClearMs, clearMs) : clearMs,
    lastRespawns: safeNum(run.respawns),
    lastSolveMs: runSolveMs,
    solves,
  };

  return { ...state, telemetry: { ...state.telemetry, [planetId]: entry } };
}
