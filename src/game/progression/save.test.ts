import { beforeEach, describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  STORAGE_KEY,
  defaultProgress,
  loadProgress,
  markPlanetComplete,
  migrate,
  normalizeTelemetry,
  recordPlanetRun,
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
        telemetry: {},
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
        telemetry: {},
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
        telemetry: {},
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

  describe('schema v2 telemetry — migration + load-path robustness', () => {
    it('migrate upgrades a v1 blob losslessly and adds empty telemetry', () => {
      const v1 = {
        schemaVersion: 1,
        unlockedPlanets: ['planet-1', 'planet-2'],
        completed: { 'planet-1': true },
      };
      const result = migrate(v1);
      expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(result.unlockedPlanets).toEqual(['planet-1', 'planet-2']);
      expect(result.completed).toEqual({ 'planet-1': true });
      expect(result.telemetry).toEqual({});
    });

    it('loadProgress upgrades a persisted v1 blob to v2 with telemetry', () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ schemaVersion: 1, unlockedPlanets: ['planet-1'], completed: {} }),
      );
      const loaded = loadProgress();
      expect(loaded.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(loaded.telemetry).toEqual({});
    });

    it('migrate salvages well-shaped telemetry from a versioned blob', () => {
      const blob = {
        schemaVersion: 1,
        unlockedPlanets: ['planet-1'],
        completed: {},
        telemetry: {
          'planet-1': {
            attempts: 2,
            lastClearMs: 41000,
            bestClearMs: 38000,
            lastRespawns: 1,
            lastSolveMs: 9000,
            solves: { 'freeze-stars': { count: 2, totalMs: 8000, bestMs: 3500 } },
          },
        },
      };
      const result = migrate(blob);
      expect(result.telemetry['planet-1'].attempts).toBe(2);
      expect(result.telemetry['planet-1'].solves['freeze-stars']).toEqual({
        count: 2,
        totalMs: 8000,
        bestMs: 3500,
      });
    });

    it('sanitizes completed values and unlockedPlanets on the current-version path', () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          schemaVersion: CURRENT_SCHEMA_VERSION,
          unlockedPlanets: ['planet-2', 'planet-2'], // missing planet-1, duplicated
          completed: { 'planet-1': true, bogus: 'nope' },
          telemetry: {},
        }),
      );
      const loaded = loadProgress();
      expect(loaded.unlockedPlanets).toEqual(['planet-1', 'planet-2']); // planet-1 guaranteed + de-duped
      expect(loaded.completed).toEqual({ 'planet-1': true }); // non-boolean dropped
    });

    it('loadProgress sanitizes a corrupt telemetry blob at the current version', () => {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          schemaVersion: CURRENT_SCHEMA_VERSION,
          unlockedPlanets: ['planet-1'],
          completed: {},
          telemetry: 'not-an-object',
        }),
      );
      expect(() => loadProgress()).not.toThrow();
      expect(loadProgress().telemetry).toEqual({});
    });

    it('normalizeTelemetry drops malformed entries and coerces bad numbers', () => {
      const dirty = {
        'planet-1': { attempts: -5, lastClearMs: NaN, bestClearMs: Infinity, lastRespawns: 'x', lastSolveMs: 100, solves: { 'freeze-stars': { count: 0, totalMs: 1, bestMs: 1 } } },
        'planet-2': 'garbage',
        'planet-3': null,
      };
      const clean = normalizeTelemetry(dirty);
      // planet-2/3 dropped; planet-1 coerced to safe non-negative numbers.
      expect(Object.keys(clean)).toEqual(['planet-1']);
      expect(clean['planet-1'].attempts).toBe(0);
      expect(clean['planet-1'].lastClearMs).toBe(0);
      expect(clean['planet-1'].bestClearMs).toBe(0);
      expect(clean['planet-1'].lastRespawns).toBe(0);
      expect(clean['planet-1'].lastSolveMs).toBe(100);
      // count<=0 solve stat dropped.
      expect(clean['planet-1'].solves['freeze-stars']).toBeUndefined();
    });
  });

  describe('recordPlanetRun', () => {
    it('creates a fresh telemetry entry on the first clear', () => {
      const result = recordPlanetRun(defaultProgress(), 'planet-1', {
        clearMs: 40000,
        respawns: 2,
        solves: [
          { power: 'freeze-stars', ms: 4000 },
          { power: 'illuminate', ms: 12000 },
        ],
      });
      const t = result.telemetry['planet-1'];
      expect(t.attempts).toBe(1);
      expect(t.lastClearMs).toBe(40000);
      expect(t.bestClearMs).toBe(40000);
      expect(t.lastRespawns).toBe(2);
      expect(t.lastSolveMs).toBe(16000);
      expect(t.solves['freeze-stars']).toEqual({ count: 1, totalMs: 4000, bestMs: 4000 });
      expect(t.solves['illuminate']).toEqual({ count: 1, totalMs: 12000, bestMs: 12000 });
    });

    it('merges a second clear: best-clear min, accumulated per-power stats', () => {
      const first = recordPlanetRun(defaultProgress(), 'planet-1', {
        clearMs: 40000,
        respawns: 2,
        solves: [{ power: 'freeze-stars', ms: 4000 }],
      });
      const second = recordPlanetRun(first, 'planet-1', {
        clearMs: 30000,
        respawns: 0,
        solves: [{ power: 'freeze-stars', ms: 3000 }],
      });
      const t = second.telemetry['planet-1'];
      expect(t.attempts).toBe(2);
      expect(t.lastClearMs).toBe(30000); // last reflects the latest run
      expect(t.bestClearMs).toBe(30000); // best is the min across runs
      expect(t.lastRespawns).toBe(0);
      expect(t.solves['freeze-stars']).toEqual({ count: 2, totalMs: 7000, bestMs: 3000 });
    });

    it('keeps a worse clear as last but the prior best as best', () => {
      const first = recordPlanetRun(defaultProgress(), 'planet-1', { clearMs: 30000, respawns: 0, solves: [] });
      const slower = recordPlanetRun(first, 'planet-1', { clearMs: 50000, respawns: 3, solves: [] });
      const t = slower.telemetry['planet-1'];
      expect(t.lastClearMs).toBe(50000);
      expect(t.bestClearMs).toBe(30000);
    });

    it('drops negative / NaN solve timings rather than skewing the average', () => {
      const result = recordPlanetRun(defaultProgress(), 'planet-1', {
        clearMs: 20000,
        respawns: 0,
        solves: [
          { power: 'freeze-stars', ms: 5000 },
          { power: 'freeze-stars', ms: -1 },
          { power: 'freeze-stars', ms: NaN },
        ],
      });
      const t = result.telemetry['planet-1'];
      expect(t.solves['freeze-stars']).toEqual({ count: 1, totalMs: 5000, bestMs: 5000 });
      expect(t.lastSolveMs).toBe(5000);
    });

    it('records a solo run (no solves) with lastSolveMs 0', () => {
      const result = recordPlanetRun(defaultProgress(), 'planet-2', { clearMs: 25000, respawns: 1, solves: [] });
      const t = result.telemetry['planet-2'];
      expect(t.attempts).toBe(1);
      expect(t.lastSolveMs).toBe(0);
      expect(t.solves).toEqual({});
    });

    it('coerces a bad clearMs to 0 (never corrupts the accumulator)', () => {
      const result = recordPlanetRun(defaultProgress(), 'planet-1', { clearMs: NaN, respawns: -4, solves: [] });
      const t = result.telemetry['planet-1'];
      expect(t.lastClearMs).toBe(0);
      expect(t.bestClearMs).toBe(0);
      expect(t.lastRespawns).toBe(0);
    });

    it('recovers a 0 best (from a corrupt load) instead of pinning it at 0', () => {
      const corrupt: ProgressState = {
        ...defaultProgress(),
        telemetry: {
          'planet-1': {
            attempts: 1, lastClearMs: 0, bestClearMs: 0, lastRespawns: 0, lastSolveMs: 0,
            solves: { 'freeze-stars': { count: 1, totalMs: 0, bestMs: 0 } },
          },
        },
      };
      const result = recordPlanetRun(corrupt, 'planet-1', {
        clearMs: 30000,
        respawns: 0,
        solves: [{ power: 'freeze-stars', ms: 4000 }],
      });
      const t = result.telemetry['planet-1'];
      expect(t.bestClearMs).toBe(30000); // recovered, not Math.min(0, 30000)===0
      const fs = t.solves['freeze-stars'];
      expect(fs).toBeDefined();
      expect(fs?.bestMs).toBe(4000); // per-power best recovered too
    });

    it('is pure: does not mutate input state or its nested telemetry', () => {
      const first = recordPlanetRun(defaultProgress(), 'planet-1', {
        clearMs: 40000,
        respawns: 0,
        solves: [{ power: 'freeze-stars', ms: 4000 }],
      });
      const snapshot = structuredClone(first);
      const second = recordPlanetRun(first, 'planet-1', {
        clearMs: 30000,
        respawns: 0,
        solves: [{ power: 'freeze-stars', ms: 3000 }],
      });
      expect(second).not.toBe(first);
      expect(second.telemetry).not.toBe(first.telemetry);
      // The prior per-power stat object must not have been mutated.
      expect(first).toEqual(snapshot);
    });

    it('round-trips telemetry through save/load', () => {
      const recorded = recordPlanetRun(defaultProgress(), 'planet-1', {
        clearMs: 33000,
        respawns: 1,
        solves: [{ power: 'phase-dash', ms: 6000 }],
      });
      saveProgress(recorded);
      expect(loadProgress().telemetry['planet-1']).toEqual(recorded.telemetry['planet-1']);
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
