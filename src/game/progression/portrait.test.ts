import { describe, expect, it } from 'vitest';
import { buildPortrait, formatDuration, type Portrait } from './portrait';
import type { PlanetTelemetry } from './save';

/** Find a portrait line by its label (undefined if absent). */
function line(p: Portrait, label: string): string | undefined {
  return p.lines.find((l) => l.label === label)?.value;
}

describe('formatDuration', () => {
  it('formats whole minutes and seconds as m:ss', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(8000)).toBe('0:08');
    expect(formatDuration(83000)).toBe('1:23');
    expect(formatDuration(600000)).toBe('10:00');
  });

  it('rounds to the nearest second', () => {
    expect(formatDuration(8400)).toBe('0:08');
    expect(formatDuration(8600)).toBe('0:09');
  });

  it('clamps negative / non-finite to 0:00', () => {
    expect(formatDuration(-5000)).toBe('0:00');
    expect(formatDuration(NaN)).toBe('0:00');
    expect(formatDuration(Infinity)).toBe('0:00');
  });
});

describe('buildPortrait', () => {
  const full: PlanetTelemetry = {
    attempts: 3,
    lastClearMs: 83000,
    bestClearMs: 70000,
    lastRespawns: 2,
    lastSolveMs: 32000,
    solves: {
      'freeze-stars': { count: 3, totalMs: 12600, bestMs: 3800 },
      'illuminate': { count: 1, totalMs: 12100, bestMs: 12100 },
    },
  };

  it('titles the card with the planet name', () => {
    expect(buildPortrait('Nebula Core', full).title).toContain('Nebula Core');
  });

  it('shows clear time with the personal best when it differs', () => {
    expect(line(buildPortrait('X', full), 'Cleared in')).toBe('1:23  ·  best 1:10');
  });

  it('omits the best when the latest run IS the best', () => {
    const best: PlanetTelemetry = { ...full, lastClearMs: 70000, bestClearMs: 70000 };
    expect(line(buildPortrait('X', best), 'Cleared in')).toBe('1:10');
  });

  it('omits the best when it rounds to the same m:ss as the latest clear', () => {
    // 70400ms and 70000ms both render as "1:10" — don't print "1:10 · best 1:10".
    const t: PlanetTelemetry = { ...full, lastClearMs: 70400, bestClearMs: 70000 };
    expect(line(buildPortrait('X', t), 'Cleared in')).toBe('1:10');
  });

  it('shows the per-role explore-vs-solve split when a phone contributed', () => {
    const p = buildPortrait('X', full);
    expect(line(p, 'Starglow solved')).toBe('0:32');
    expect(line(p, 'Astronaut explored')).toBe('0:51'); // 83000 - 32000 = 51000
  });

  it('shows per-power averages in stable order, best only for repeat casts', () => {
    const p = buildPortrait('X', full);
    expect(line(p, 'Freeze Stars')).toBe('avg 0:04  ·  best 0:04');
    expect(line(p, 'Illuminate')).toBe('0:12'); // single cast → no "best"
    // Freeze Stars appears before Illuminate (stable POWER_ORDER).
    const labels = p.lines.map((l) => l.label);
    expect(labels.indexOf('Freeze Stars')).toBeLessThan(labels.indexOf('Illuminate'));
  });

  it('phrases respawns cozily', () => {
    expect(line(buildPortrait('X', full), 'Astronaut')).toBe('2 respawns');
    expect(line(buildPortrait('X', { ...full, lastRespawns: 1 }), 'Astronaut')).toBe('1 respawn');
    expect(line(buildPortrait('X', { ...full, lastRespawns: 0 }), 'Astronaut')).toBe('a clean run');
  });

  it('shows the visit-count footer', () => {
    expect(buildPortrait('X', full).footer).toBe('Your 3rd visit together');
    expect(buildPortrait('X', { ...full, attempts: 1 }).footer).toBe('Your first visit together');
    expect(buildPortrait('X', { ...full, attempts: 5 }).footer).toBe('Your 5th visit together');
  });

  it('degrades gracefully for a solo run (no phone solves)', () => {
    const solo: PlanetTelemetry = {
      attempts: 1,
      lastClearMs: 25000,
      bestClearMs: 25000,
      lastRespawns: 0,
      lastSolveMs: 0,
      solves: {},
    };
    const p = buildPortrait('Constellation', solo);
    expect(line(p, 'Cleared in')).toBe('0:25');
    // No split / per-power lines; a gentle invitation instead.
    expect(line(p, 'Starglow solved')).toBeUndefined();
    expect(line(p, 'Astronaut explored')).toBeUndefined();
    expect(line(p, 'Starglow')).toContain('connect a phone');
    expect(line(p, 'Astronaut')).toBe('a clean run');
  });
});
