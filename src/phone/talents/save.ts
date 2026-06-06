import { talentById, isTalentId, type TalentId } from './talents';

/**
 * Pure, versioned, framework-free talent persistence — the phone-side twin of
 * `src/game/progression/save.ts`.
 *
 * The persisted shape is plain JSON: `unlocked` is an ARRAY (not a Set) so it
 * serializes cleanly. `stardust` is the UNSPENT balance (spending a node
 * subtracts its cost). loadTalents/saveTalents NEVER throw — they guard
 * `typeof window` and wrap all storage access in try/catch, falling back to a
 * sane default.
 */

export const CURRENT_SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'constellation:talents';

export type TalentState = {
  schemaVersion: number;
  /** Unspent stardust available to spend on nodes. */
  stardust: number;
  /** Unlocked node ids. */
  unlocked: TalentId[];
};

/** A fresh, sane default. Returns a NEW object every call (no shared refs). */
export function defaultTalentState(): TalentState {
  return { schemaVersion: CURRENT_SCHEMA_VERSION, stardust: 0, unlocked: [] };
}

/** Minimal structural check: is `value` shaped like a TalentState we can use? */
function isTalentShape(value: unknown): value is TalentState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.schemaVersion !== 'number') return false;
  if (typeof v.stardust !== 'number') return false;
  if (!Array.isArray(v.unlocked)) return false;
  return true;
}

/**
 * Normalize a salvageable blob into a fresh, well-typed TalentState at the
 * current schema version. Pulls forward a non-negative integer stardust and any
 * known, de-duped unlocked ids; everything else falls back to defaults.
 */
function normalize(value: unknown): TalentState {
  const base = defaultTalentState();
  if (typeof value !== 'object' || value === null) return base;
  const v = value as Record<string, unknown>;

  if (typeof v.stardust === 'number' && Number.isFinite(v.stardust)) {
    base.stardust = Math.max(0, Math.floor(v.stardust));
  }

  if (Array.isArray(v.unlocked)) {
    const unlocked = v.unlocked.filter(isTalentId);
    base.unlocked = Array.from(new Set(unlocked));
  }

  return base;
}

/**
 * Best-effort upgrade of an older/unknown-version blob to the current version.
 * Pure, never throws. The version switch is the extension seam for future v2.
 */
export function migrate(legacy: unknown): TalentState {
  const normalized = normalize(legacy);
  normalized.schemaVersion = CURRENT_SCHEMA_VERSION;
  return normalized;
}

/**
 * Read persisted talents. Returns defaultTalentState() on missing/corrupt/
 * parse-error/wrong-shape, and routes wrong-version blobs through migrate().
 * Guarded for non-browser environments. NEVER throws.
 */
export function loadTalents(): TalentState {
  if (typeof window === 'undefined') return defaultTalentState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return defaultTalentState();
    const parsed: unknown = JSON.parse(raw);
    if (!isTalentShape(parsed)) return defaultTalentState();
    if (parsed.schemaVersion !== CURRENT_SCHEMA_VERSION) return migrate(parsed);
    // Still normalize a current-version blob so a hand-edited/corrupt unlocked
    // list or negative stardust can't poison the in-memory state.
    return normalize(parsed);
  } catch {
    return defaultTalentState();
  }
}

/**
 * Persist talents. Guarded + try/catch; swallows quota/serialization errors
 * silently. Does not mutate `state`. NEVER throws.
 */
export function saveTalents(state: TalentState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded / serialization failure — nothing we can do; stay silent.
  }
}

/**
 * Award stardust (default +1, on a puzzle solve). PURE: returns a NEW state;
 * never mutates its input. Non-positive amounts are a no-op (returns a copy).
 */
export function earnStardust(state: TalentState, amount = 1): TalentState {
  return { ...state, stardust: state.stardust + Math.max(0, Math.floor(amount)) };
}

/** Has the node's prerequisite (if any) been unlocked? */
function prereqMet(unlocked: readonly TalentId[], id: TalentId): boolean {
  const node = talentById(id);
  if (!node) return false;
  return node.requires === null || unlocked.includes(node.requires);
}

/**
 * Can this node be unlocked right now? True only if it's a real node, not
 * already unlocked, its prerequisite is met, and there's enough stardust.
 */
export function canUnlock(state: TalentState, id: TalentId): boolean {
  const node = talentById(id);
  if (!node) return false;
  if (state.unlocked.includes(id)) return false;
  if (!prereqMet(state.unlocked, id)) return false;
  return state.stardust >= node.cost;
}

/**
 * Unlock a node: subtract its cost and append its id. PURE: returns a NEW state;
 * never mutates its input. If the unlock isn't currently valid (unaffordable,
 * prereq unmet, already owned, unknown id) the state is returned UNCHANGED, so
 * callers can apply unconditionally — but the UI gates on canUnlock first.
 */
export function unlockTalent(state: TalentState, id: TalentId): TalentState {
  if (!canUnlock(state, id)) return state;
  const node = talentById(id)!;
  return {
    ...state,
    stardust: state.stardust - node.cost,
    unlocked: [...state.unlocked, id],
  };
}
