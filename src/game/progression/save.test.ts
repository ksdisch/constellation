import { beforeEach, describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  STORAGE_KEY,
  defaultProgress,
  loadProgress,
  markPlanetComplete,
  migrate,
  saveProgress,
  type ProgressState,
} from './save';

describe('save / progression persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('loadProgress fallback behavior', () => {
    it('returns the default when localStorage is empty', () => {
      expect(loadProgress()).toEqual({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        unlockedPlanets: ['planet-1'],
        completed: {},
      });
    });

    it('returns the default (and does not throw) on a corrupt non-JSON blob', () => {
      window.localStorage.setItem(STORAGE_KEY, '{not valid json');
      expect(() => loadProgress()).not.toThrow();
      expect(loadProgress()).toEqual(defaultProgress());
    });

    it('returns the default on a valid-JSON but malformed-shape blob', () => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ nope: true }));
      expect(loadProgress()).toEqual(defaultProgress());
    });

    it('migrates a wrong-schemaVersion blob to the current version', () => {
      const legacy = {
        schemaVersion: 0,
        unlockedPlanets: ['planet-1', 'planet-2'],
        completed: { 'planet-1': true },
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
      const loaded = loadProgress();
      expect(loaded.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(loaded.unlockedPlanets).toContain('planet-2');
      expect(loaded.completed['planet-1']).toBe(true);
    });
  });

  describe('saveProgress -> loadProgress round-trip', () => {
    it('round-trips a non-default state deep-equal', () => {
      const state: ProgressState = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        unlockedPlanets: ['planet-1', 'planet-2'],
        completed: { 'planet-1': true },
      };
      saveProgress(state);
      expect(loadProgress()).toEqual(state);
    });

    it('does not throw when saving', () => {
      expect(() => saveProgress(defaultProgress())).not.toThrow();
    });
  });

  describe('markPlanetComplete', () => {
    it('marks the planet complete and unlocks the next in the chain', () => {
      const result = markPlanetComplete(defaultProgress(), 'planet-1');
      expect(result.completed['planet-1']).toBe(true);
      expect(result.unlockedPlanets).toContain('planet-2');
    });

    it('is pure: returns a new object and does not mutate its input', () => {
      const input = defaultProgress();
      const snapshot = structuredClone(input);
      const result = markPlanetComplete(input, 'planet-1');
      expect(result).not.toBe(input);
      expect(input).toEqual(snapshot);
      // Nested references must not be shared.
      expect(result.completed).not.toBe(input.completed);
      expect(result.unlockedPlanets).not.toBe(input.unlockedPlanets);
    });

    it('completes the last planet without appending a non-existent next', () => {
      const start: ProgressState = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        unlockedPlanets: ['planet-1', 'planet-2', 'planet-3'],
        completed: {},
      };
      const result = markPlanetComplete(start, 'planet-3');
      expect(result.completed['planet-3']).toBe(true);
      expect(result.unlockedPlanets).not.toContain(undefined);
      expect(result.unlockedPlanets).toEqual(['planet-1', 'planet-2', 'planet-3']);
    });

    it('is idempotent on the next-unlock: calling twice does not duplicate', () => {
      const once = markPlanetComplete(defaultProgress(), 'planet-1');
      const twice = markPlanetComplete(once, 'planet-1');
      const count = twice.unlockedPlanets.filter((p) => p === 'planet-2').length;
      expect(count).toBe(1);
    });

    it('only updates completed for an unknown planetId', () => {
      const result = markPlanetComplete(defaultProgress(), 'planet-unknown');
      expect(result.completed['planet-unknown']).toBe(true);
      expect(result.unlockedPlanets).toEqual(['planet-1']);
    });
  });

  describe('migrate', () => {
    it('stamps the current schema version and salvages well-typed fields', () => {
      const legacy = {
        schemaVersion: 0,
        unlockedPlanets: ['planet-1', 'planet-2', 42],
        completed: { 'planet-1': true, bogus: 'nope' },
      };
      const result = migrate(legacy);
      expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      // Non-string entries dropped; planet-1 always guaranteed present.
      expect(result.unlockedPlanets).toEqual(['planet-1', 'planet-2']);
      // Non-boolean completed values dropped.
      expect(result.completed).toEqual({ 'planet-1': true });
    });

    it('falls back to defaults for an unsalvageable blob', () => {
      expect(migrate(null)).toEqual(defaultProgress());
      expect(migrate('garbage')).toEqual(defaultProgress());
    });
  });

  describe('HEADLINE INTEGRATION: durable unlock across reload', () => {
    it('completes planet-1, saves, and a fresh load shows planet-2 unlocked', () => {
      // Start from the default (only planet-1 unlocked).
      expect(loadProgress().unlockedPlanets).toEqual(['planet-1']);

      // Player finishes planet-1 -> compute + persist next state.
      const next = markPlanetComplete(loadProgress(), 'planet-1');
      saveProgress(next);

      // Simulate a page reload: brand-new read from storage.
      const reloaded = loadProgress();
      expect(reloaded.unlockedPlanets).toContain('planet-2');
      expect(reloaded.completed['planet-1']).toBe(true);
    });
  });
});
