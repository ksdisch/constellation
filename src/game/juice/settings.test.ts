import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadSettings,
  saveSettings,
  defaultSettings,
  SETTINGS_STORAGE_KEY,
  SETTINGS_SCHEMA_VERSION,
} from './settings';

/**
 * Pure persistence twin of progression/save.ts. jsdom provides localStorage, so
 * we exercise the real round-trip; the contract is "never throws, always returns
 * a sane GameSettings" on every corrupt / missing / wrong-version input.
 */
describe('game settings persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to unmuted at the current schema version', () => {
    const d = defaultSettings();
    expect(d.muted).toBe(false);
    expect(d.schemaVersion).toBe(SETTINGS_SCHEMA_VERSION);
    // Fresh object each call (no shared ref).
    expect(defaultSettings()).not.toBe(d);
  });

  it('returns the default when nothing is stored', () => {
    expect(loadSettings()).toEqual(defaultSettings());
  });

  it('round-trips a saved muted=true', () => {
    saveSettings({ schemaVersion: SETTINGS_SCHEMA_VERSION, muted: true });
    expect(loadSettings().muted).toBe(true);
  });

  it('round-trips a saved muted=false', () => {
    saveSettings({ schemaVersion: SETTINGS_SCHEMA_VERSION, muted: false });
    expect(loadSettings().muted).toBe(false);
  });

  it('falls back to default on corrupt JSON (never throws)', () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, '{not valid json');
    expect(() => loadSettings()).not.toThrow();
    expect(loadSettings()).toEqual(defaultSettings());
  });

  it('falls back to default on a wrong-shaped blob', () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ muted: 'yes' }));
    expect(loadSettings()).toEqual(defaultSettings());
  });

  it('migrates a wrong-version blob, preserving a salvageable muted', () => {
    window.localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 0, muted: true }),
    );
    const loaded = loadSettings();
    expect(loaded.muted).toBe(true);
    expect(loaded.schemaVersion).toBe(SETTINGS_SCHEMA_VERSION);
  });

  it('saveSettings does not mutate its input', () => {
    const state = { schemaVersion: SETTINGS_SCHEMA_VERSION, muted: true };
    saveSettings(state);
    expect(state).toEqual({ schemaVersion: SETTINGS_SCHEMA_VERSION, muted: true });
  });
});
