import { describe, expect, it } from 'vitest';
import { nodeStateFor } from './nodeStateFor';
import { CURRENT_SCHEMA_VERSION, type ProgressState } from './save';

function progress(
  unlockedPlanets: string[],
  completed: Record<string, boolean> = {},
): ProgressState {
  return { schemaVersion: CURRENT_SCHEMA_VERSION, unlockedPlanets, completed, telemetry: {} };
}

describe('nodeStateFor truth table', () => {
  it("returns 'locked' when not unlocked and not completed", () => {
    expect(nodeStateFor(progress(['planet-1']), 'planet-2')).toBe('locked');
  });

  it("returns 'unlocked' when in unlockedPlanets and not completed", () => {
    expect(nodeStateFor(progress(['planet-1', 'planet-2']), 'planet-2')).toBe(
      'unlocked',
    );
  });

  it("returns 'completed' when completed[id] is true (completed precedence)", () => {
    const p = progress(['planet-1', 'planet-2'], { 'planet-2': true });
    expect(nodeStateFor(p, 'planet-2')).toBe('completed');
  });

  it("returns 'locked' for an unknown/garbage planetId", () => {
    expect(nodeStateFor(progress(['planet-1']), 'planet-999')).toBe('locked');
  });
});
