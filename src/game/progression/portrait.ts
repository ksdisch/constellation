import type { PowerId } from '../../shared/protocol';
import type { PlanetTelemetry, PowerSolveStat } from './save';

/**
 * Pure formatter for the end-of-planet "portrait" card — the read-only wedge of
 * "The Planet That Knows You Two". Given a planet's accumulated telemetry, it
 * builds the human-readable rhythm portrait the co-located couple sees on the
 * laptop win screen. NO Phaser, NO rendering — the scene draws the strings this
 * returns, so the wording/logic is fully unit-testable.
 */

export type PortraitLine = { label: string; value: string };

export type Portrait = {
  title: string;
  lines: PortraitLine[];
  footer: string;
};

const POWER_NAMES: Record<PowerId, string> = {
  'freeze-stars': 'Freeze Stars',
  'summon-platform': 'Summon Platform',
  'illuminate': 'Illuminate',
  'phase-dash': 'Phase Dash',
};

// Stable display order so the portrait reads the same every clear regardless of
// the order powers were cast in this run.
const POWER_ORDER: PowerId[] = ['freeze-stars', 'summon-platform', 'illuminate', 'phase-dash'];

/**
 * Format a millisecond duration as `m:ss` (e.g. 83000 → "1:23", 8000 → "0:08").
 * Negative / non-finite inputs clamp to "0:00". Seconds round to nearest.
 */
export function formatDuration(ms: number): string {
  const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const totalSeconds = Math.round(safe / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Average solve time for a power, formatted; "—" if no samples. */
function avg(stat: PowerSolveStat): string {
  if (stat.count <= 0) return '—';
  return formatDuration(stat.totalMs / stat.count);
}

/** Cozy phrasing for the astronaut's death count. */
function respawnPhrase(n: number): string {
  if (n <= 0) return 'a clean run';
  if (n === 1) return '1 respawn';
  return `${n} respawns`;
}

/** Ordinal-ish phrasing for the visit count in the footer. */
function visitPhrase(attempts: number): string {
  if (attempts <= 1) return 'Your first visit together';
  if (attempts === 2) return 'Your 2nd visit together';
  if (attempts === 3) return 'Your 3rd visit together';
  return `Your ${attempts}th visit together`;
}

/**
 * Build the portrait for one planet from its telemetry.
 *
 * The signature line is the per-role split — Starglow's solving time vs the
 * astronaut's exploring time — which only appears when a phone actually
 * contributed solves (`lastSolveMs > 0`). A solo / no-phone clear instead shows
 * a gentle invitation, so the card never lies about a rhythm it didn't capture.
 */
export function buildPortrait(planetName: string, t: PlanetTelemetry): Portrait {
  const lines: PortraitLine[] = [];

  // Clear time, with the personal best appended only when it differs ON SCREEN
  // (compare the rendered m:ss strings, not raw ms, so a sub-second gap doesn't
  // print "1:10 · best 1:10").
  const lastStr = formatDuration(t.lastClearMs);
  const bestStr = formatDuration(t.bestClearMs);
  const clearValue =
    t.bestClearMs > 0 && bestStr !== lastStr ? `${lastStr}  ·  best ${bestStr}` : lastStr;
  lines.push({ label: 'Cleared in', value: clearValue });

  if (t.lastSolveMs > 0) {
    // Explore = total clear minus the time Starglow spent in puzzles. Floor at 0
    // (solves can briefly overlap traversal) so it never reads negative.
    const exploreMs = Math.max(0, t.lastClearMs - t.lastSolveMs);
    lines.push({ label: 'Starglow solved', value: formatDuration(t.lastSolveMs) });
    lines.push({ label: 'Astronaut explored', value: formatDuration(exploreMs) });

    // Per-power solve rhythm, in stable order, only for powers actually cast.
    for (const power of POWER_ORDER) {
      const stat = t.solves[power];
      if (!stat || stat.count <= 0) continue;
      const detail = stat.count > 1 ? `avg ${avg(stat)}  ·  best ${formatDuration(stat.bestMs)}` : avg(stat);
      lines.push({ label: POWER_NAMES[power], value: detail });
    }
  } else {
    lines.push({ label: 'Starglow', value: 'connect a phone to capture your shared rhythm' });
  }

  lines.push({ label: 'Astronaut', value: respawnPhrase(t.lastRespawns) });

  return {
    title: `✦ Your rhythm on ${planetName}`,
    lines,
    footer: visitPhrase(t.attempts),
  };
}
