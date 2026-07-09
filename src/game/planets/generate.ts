import type { PlanetConfig } from './planet1';
import type { Telemetry } from '../progression/save';
import { GENERATED_THEMES } from './generatedThemes';

/**
 * The generator spike for "The Planet That Knows You Two".
 *
 * Two pure, deterministic functions turn the pair's recorded rhythm
 * (`Telemetry`, the M10 wedge) into a playable `PlanetConfig`:
 *
 *   deriveProfile(telemetry) -> RhythmProfile   (measured signals, normalized 0..1)
 *   generatePlanet(profile)  -> PlanetConfig     (geometry grown from those signals)
 *
 * The crux of the spike is SAFETY: `generatePlanet` can never emit an unplayable
 * planet. Every knob is clamped to a band proven valid against the shared reach
 * budget (the same invariants `planet3.test.ts` encodes), so the finale is always
 * reachable, the plasma curtain is always a full-height Phase Dash gate, and every
 * keypoint stays in-canvas — for ANY input, including corrupt or extreme profiles.
 * `generate.test.ts` proves this by sweeping the whole input space.
 *
 * Determinism is a hard requirement: no `Date.now`, no `Math.random` (both banned
 * by the Vitest determinism guards). Within-band variety comes from a seeded
 * `mulberry32` PRNG folded from the telemetry, so the same pair always grows the
 * same planet and two different pairs visibly differ.
 *
 * Scope: modeled on the planet-3 gate template (Freeze corridor -> Phase Dash
 * curtain -> Illuminate finale); a library of gate templates is still a follow-up.
 * A grown planet now also wears a THEME: `generatePlanet` deterministically picks
 * one from `GENERATED_THEMES` (whose textures `Boot` pre-bakes) and stamps the
 * matching `id`/`theme`/`puzzleTheme`, so it looks like a real planet and two
 * pairs grow visibly different worlds. The theme is cosmetic — it never touches
 * the reach-budget geometry, so the safety proof is unaffected.
 */

// ── Shared reach budget (matches Astronaut.ts + the hand-authored planets) ──────
// Ground surface y=500; 48px sprite (half-height 24); a running jump rises ~117px
// and covers ~245px horizontally. The highest the sprite TOP reaches from a ground
// jump is ~335 — a goal above that misses a ground jump (so Illuminate's hidden
// ledge is load-bearing). Canvas is 960×540. These match planet3.test.ts.

// ── Fixed finale geometry (kept CONSTANT for a bulletproof reach margin) ─────────
// The Illuminate finale is the tightest constraint in the budget, so its vertical
// geometry is fixed to proven-good values rather than varied:
//   goal.y=300  -> goalBottom 314 < 335 (misses a ground jump; ~21px margin).
//   hiddenPlatform.y=415 -> apexCenter 266 < goalTop 286 (reachable; ~20px margin).
// Variety on the finale comes from its horizontal placement instead.
const GOAL_Y = 300;
const HIDDEN_PLATFORM_Y = 415;

// ── Curtain geometry (Phase Dash gate) ───────────────────────────────────────────
// A full-height plasma curtain: y=300, height=420 -> top 90 (< 335, can't be jumped
// over) and bottom 510 (>= 490, can't be walked under). Only the WIDTH and X vary.
const HAZARD_Y = 300;
const HAZARD_HEIGHT = 420;

// ── Reference bands for normalizing raw telemetry into 0..1 signals ──────────────
const REF_FAST_SOLVE_MS = 2_000; // a fast pair's mean solve -> solveTendency ~1
const REF_SLOW_SOLVE_MS = 12_000; // a slow pair's mean solve -> solveTendency ~0
const REF_MAX_RESPAWNS = 5; // >= this many deaths/clear -> forgiveness ~1

/**
 * The pair's playstyle, distilled to normalized 0..1 signals plus a stable seed.
 * Every field is in [0, 1] except `seed` (a finite integer for the PRNG).
 */
export type RhythmProfile = {
  /** Higher = the pair solves puzzles faster (tighter, snappier gate spacing). */
  solveTendency: number;
  /** Higher = the pair dies more (gentler geometry: bigger landings, thinner hazard). */
  forgiveness: number;
  /** Higher = the pair spends more time exploring vs solving (more horizontal spread). */
  exploreTendency: number;
  /** Deterministic PRNG seed folded from the telemetry (stable per pair). */
  seed: number;
};

// A sane mid-planet when there is no telemetry to read (fresh save / solo play).
const DEFAULT_PROFILE: RhythmProfile = {
  solveTendency: 0.5,
  forgiveness: 0.5,
  exploreTendency: 0.5,
  seed: 1,
};

/** Clamp to [0, 1]; non-finite -> 0.5 (a neutral middle, never NaN). */
function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/** Clamp to [lo, hi]; non-finite -> lo. */
function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo;
  return n < lo ? lo : n > hi ? hi : n;
}

/** Linear interpolate lo..hi by t (t is assumed already in [0,1]). */
function lerp(lo: number, hi: number, t: number): number {
  return lo + (hi - lo) * t;
}

/**
 * mulberry32 — a tiny, fast, well-distributed deterministic PRNG. Returns a
 * function yielding floats in [0, 1). Seeded so the same pair grows the same
 * planet; no `Math.random`, so it is Vitest-determinism-safe.
 */
function mulberry32(seed: number): () => number {
  let a = Math.trunc(Number.isFinite(seed) ? seed : 1) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Symmetric jitter in [-amp, +amp] from a PRNG draw. */
function jitter(rand: () => number, amp: number): number {
  return (rand() - 0.5) * 2 * amp;
}

/**
 * Aggregate the pair's telemetry across every cleared planet into a RhythmProfile.
 *
 * PURE, never throws — an empty / solo / corrupt telemetry map yields the neutral
 * DEFAULT_PROFILE (matching the never-throws discipline of loadProgress). All raw
 * numbers are read defensively so a bad blob can't produce NaN signals.
 */
export function deriveProfile(telemetry: Telemetry): RhythmProfile {
  const entries =
    telemetry && typeof telemetry === 'object' ? Object.values(telemetry) : [];
  if (entries.length === 0) return { ...DEFAULT_PROFILE };

  // solveTendency ← mean per-power solve time across all planets (faster = higher).
  let solveTotalMs = 0;
  let solveCount = 0;
  // forgiveness ← mean deaths per recorded clear (more deaths = higher).
  let respawnSum = 0;
  // exploreTendency ← mean explore fraction (explore = clear − solve, as a ratio).
  let exploreSum = 0;
  let exploreSamples = 0;
  // seed ← a stable fold of visit counts + clear times.
  let seed = 1;

  let sampleCount = 0;
  for (const t of entries) {
    // Guard each entry defensively — a hostile/corrupt save blob may hold null or
    // non-object values that never passed through normalizeTelemetry.
    if (!t || typeof t !== 'object') continue;
    sampleCount += 1;
    respawnSum += Number.isFinite(t.lastRespawns) ? t.lastRespawns : 0;
    for (const stat of Object.values(t.solves ?? {})) {
      if (!stat || !Number.isFinite(stat.count) || stat.count <= 0) continue;
      solveTotalMs += Number.isFinite(stat.totalMs) ? stat.totalMs : 0;
      solveCount += stat.count;
    }
    const clearMs = Number.isFinite(t.lastClearMs) ? t.lastClearMs : 0;
    const solveMs = Number.isFinite(t.lastSolveMs) ? t.lastSolveMs : 0;
    if (clearMs > 0) {
      exploreSum += Math.max(0, Math.min(1, (clearMs - solveMs) / clearMs));
      exploreSamples += 1;
    }
    const attempts = Number.isFinite(t.attempts) ? t.attempts : 0;
    seed = (Math.imul(seed, 2654435761) + attempts * 40503 + Math.round(clearMs)) | 0;
  }

  const meanSolveMs = solveCount > 0 ? solveTotalMs / solveCount : NaN;
  const solveTendency = Number.isFinite(meanSolveMs)
    ? clamp01((REF_SLOW_SOLVE_MS - meanSolveMs) / (REF_SLOW_SOLVE_MS - REF_FAST_SOLVE_MS))
    : 0.5;
  const forgiveness = clamp01(respawnSum / Math.max(1, sampleCount) / REF_MAX_RESPAWNS);
  const exploreTendency = exploreSamples > 0 ? clamp01(exploreSum / exploreSamples) : 0.5;

  return { solveTendency, forgiveness, exploreTendency, seed: seed || 1 };
}

// A small deterministic name pool so different pairs get a different-feeling
// planet title. Purely cosmetic; the geometry is what actually "knows" them.
const NAMES = [
  'Kindred Reach',
  'Two-Star Drift',
  'Paired Orbit',
  'Our Quiet Nebula',
  'The Shared Expanse',
  'Twinlight',
  'Comet of Us',
  'Wandering Together',
];

/**
 * Grow a `PlanetConfig` from a RhythmProfile. Deterministic and SAFE: every knob
 * is clamped to a band proven playable against the reach budget, so the result is
 * always clearable regardless of the input profile.
 *
 * Layout (left → right), modeled on planet-3:
 *   spawn → Freeze corridor (sentry) → Phase Dash plasma curtain → Illuminate
 *   finale (hidden ledge under a dark zone → high goal).
 *
 * The profile moves things WITHIN safe bands: fast solvers get tighter spacing;
 * explorers get more horizontal spread and a finale pushed further right; a pair
 * that dies a lot gets a bigger safe landing and a thinner hazard. The PRNG adds
 * within-band jitter so two identical profiles still differ slightly and different
 * seeds differ visibly.
 */
export function generatePlanet(profile: RhythmProfile, id = 'planet-generated'): PlanetConfig {
  const solveTendency = clamp01(profile.solveTendency);
  const forgiveness = clamp01(profile.forgiveness);
  const exploreTendency = clamp01(profile.exploreTendency);
  const rand = mulberry32(profile.seed);

  // Freeze corridor: explorers get more pre-gate room (pushed right); fast solvers
  // pull it left for a snappier opener. Clamped clear of the x=64 spawn.
  const corridorX = Math.round(
    clamp(lerp(250, 320, exploreTendency) - lerp(0, 20, solveTendency) + jitter(rand, 12), 250, 330),
  );

  // Phase Dash curtain: sits a safe LANDING past the sentry's ±140 patrol. A more
  // forgiving pair gets a bigger landing. Clamped in-canvas and before the finale.
  const landingGap = lerp(260, 300, forgiveness);
  const hazardX = Math.round(clamp(corridorX + landingGap + jitter(rand, 10), 560, 690));
  // Forgiving pairs get a thinner curtain (smaller respawn band = easier to time).
  const hazardWidth = Math.round(clamp(lerp(110, 80, forgiveness) + jitter(rand, 4), 80, 110));

  // Illuminate finale on the far right: explorers push it further out. Vertical
  // geometry is fixed (see constants) so the reach math is always satisfied.
  const hiddenPlatformX = Math.round(clamp(lerp(840, 905, exploreTendency) + jitter(rand, 10), 840, 905));
  const goalX = Math.round(clamp(hiddenPlatformX + 20, hiddenPlatformX + 10, 950));

  // Optional flourish (not a gate): a Summon Platform ledge in the open span
  // between the curtain and the finale. Clamped clear of both.
  const platformDropX = Math.round(
    clamp((hazardX + hiddenPlatformX) / 2 + jitter(rand, 12), hazardX + 70, hiddenPlatformX - 70),
  );

  const baseName = NAMES[Math.floor(rand() * NAMES.length) % NAMES.length];

  // Cosmetic theme pick — a grown planet looks like a real planet, not the default
  // skin. `Boot` pre-bakes `<key>-planet-generated-<slug>` textures for each entry,
  // so `id` MUST carry the slug for `Planet.tex()` to resolve them. Purely visual:
  // no reach-budget geometry depends on it, so the safety sweep is unaffected.
  const gt = GENERATED_THEMES[Math.floor(rand() * GENERATED_THEMES.length) % GENERATED_THEMES.length];

  return {
    id: `${id}-${gt.slug}`,
    name: `${baseName} · ${gt.label}`,
    hint: 'Chill the sentry, phase through the plasma curtain, then illuminate the hidden ledge.',
    spawn: { x: 64, y: 440 },
    goal: { x: goalX, y: GOAL_Y },
    // Degenerate pit — continuous ground; this planet gates on Phase Dash.
    pit: { startX: 480, endX: 480 },
    corridor: { x: corridorX },
    platformDrop: { x: platformDropX, y: 470 },
    hiddenPlatform: { x: hiddenPlatformX, y: HIDDEN_PLATFORM_Y },
    darkZone: { x: hiddenPlatformX, y: HIDDEN_PLATFORM_Y, width: 150, height: 120 },
    fallRespawnY: 600,
    hazardLane: { x: hazardX, y: HAZARD_Y, width: hazardWidth, height: HAZARD_HEIGHT },
    theme: gt.theme,
    puzzleTheme: gt.puzzleTheme,
  };
}
