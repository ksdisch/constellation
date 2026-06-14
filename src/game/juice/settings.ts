/**
 * Pure, versioned, framework-free game-settings persistence.
 *
 * A tiny twin of {@link ../progression/save} for game-side options. Today it
 * holds exactly one field — `muted`, the master audio mute — but it's versioned
 * + normalized so it can grow without a migration scramble. Same hard contract
 * as the progression save:
 *
 *   - `loadSettings` / `saveSettings` NEVER throw. They guard `typeof window`
 *     and wrap every storage/parse access in try/catch, falling back to a sane
 *     default on missing / corrupt / wrong-shape / wrong-version blobs.
 *   - Nothing here imports the engines, Phaser, or WebAudio — everything is
 *     unit-testable under jsdom.
 *
 * It uses its OWN key (`constellation:settings`) so it can never collide with
 * the progression save (`constellation:progress`).
 */

export const SETTINGS_SCHEMA_VERSION = 1;
export const SETTINGS_STORAGE_KEY = 'constellation:settings';

export type GameSettings = {
  schemaVersion: number;
  muted: boolean;
};

/** A fresh, sane default (unmuted). Returns a NEW object every call. */
export function defaultSettings(): GameSettings {
  return { schemaVersion: SETTINGS_SCHEMA_VERSION, muted: false };
}

/** Minimal structural check: is `value` a GameSettings we can trust as-is? */
function isSettingsShape(value: unknown): value is GameSettings {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.schemaVersion === 'number' && typeof v.muted === 'boolean';
}

/**
 * Normalize a salvageable blob into a fresh, well-typed GameSettings at the
 * current schema version. Pulls forward a boolean `muted`; everything else
 * falls back to the default. Never throws.
 */
function normalize(value: unknown): GameSettings {
  const base = defaultSettings();
  if (typeof value !== 'object' || value === null) return base;
  const v = value as Record<string, unknown>;
  if (typeof v.muted === 'boolean') base.muted = v.muted;
  return base;
}

/**
 * Best-effort upgrade of an older/unknown-version blob to the current version.
 * Pure, never throws. The version stamp is the extension seam for future fields.
 */
function migrate(legacy: unknown): GameSettings {
  const normalized = normalize(legacy);
  normalized.schemaVersion = SETTINGS_SCHEMA_VERSION;
  return normalized;
}

/**
 * Read persisted settings. Returns defaultSettings() on missing / corrupt /
 * parse-error / wrong-shape, and routes wrong-version blobs through migrate().
 * Guarded for non-browser environments (SSR / tests without jsdom). NEVER throws.
 */
export function loadSettings(): GameSettings {
  if (typeof window === 'undefined') return defaultSettings();
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw === null) return defaultSettings();
    const parsed: unknown = JSON.parse(raw);
    if (!isSettingsShape(parsed)) return defaultSettings();
    if (parsed.schemaVersion !== SETTINGS_SCHEMA_VERSION) return migrate(parsed);
    // Current version: shape is trusted, but normalize() anyway so the same-
    // version path salvages exactly like migrate. One consistent load path.
    return normalize(parsed);
  } catch {
    return defaultSettings();
  }
}

/**
 * Persist settings. Guarded + try/catch; swallows quota/serialization errors
 * silently. Does not mutate `state`. NEVER throws.
 */
export function saveSettings(state: GameSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded / serialization failure — nothing we can do; stay silent.
  }
}
