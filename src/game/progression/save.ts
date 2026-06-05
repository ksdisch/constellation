import { PLANETS } from '../planets/registry';

/**
 * Pure, versioned, framework-free progression persistence.
 *
 * The persisted shape is plain JSON: `unlockedPlanets` is an ARRAY (not a Set)
 * so it serializes cleanly. Scenes convert to/from `Set<string>` at the
 * boundary. Nothing here imports Phaser; everything is unit-testable.
 *
 * loadProgress/saveProgress NEVER throw — they guard `typeof window` and wrap
 * all storage access in try/catch, falling back to a sane default.
 */

export const CURRENT_SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'constellation:progress';

export type ProgressState = {
  schemaVersion: number;
  unlockedPlanets: string[];
  completed: Record<string, boolean>;
};

/** A fresh, sane default. Returns a NEW object every call (no shared refs). */
export function defaultProgress(): ProgressState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    unlockedPlanets: ['planet-1'],
    completed: {},
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

  return base;
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
    return parsed;
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
