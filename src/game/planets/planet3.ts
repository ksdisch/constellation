import type { PlanetConfig } from './planet1';

/**
 * Planet 3 — "Nebula Core" (NEBULA theme).
 *
 * The Phase Dash showcase. Three cleanly-spaced gates, left → right:
 *   Freeze Stars (corridor sentry) → Phase Dash (plasma curtain) → Illuminate
 *   (hidden ledge to the goal).
 *
 * Phase Dash is the NEW, physically load-bearing mechanic. Summon Platform is
 * wired and castable but is NOT a gate here — fitting a second un-jumpable
 * obstacle (a ≥260px pit) alongside the curtain, the corridor, and the finale
 * in 960px forces unplayably tight spacing, so Nebula Core deliberately gates on
 * three powers and lets each planet emphasize a different subset (planet-2
 * reordered the three; planet-3 introduces the fourth). The pit is degenerate
 * (startX === endX → Planet.create skips no tiles → continuous ground).
 *
 * ── Reach budget (shared across planets) ──────────────────────────────────────
 *   Astronaut: speed 240, jumpVelocity -460, gravity y=900.
 *   A running jump covers ~245px horizontal and ~117px vertical.
 *   Ground tiles render at y=520 on the x = 32 + 64k grid; surface ≈ y=500.
 *   Astronaut sprite is 32×48 (half-extents 16×24).
 */

// ── Spawn ────────────────────────────────────────────────────────────────────
// Far left, clear of the corridor sentry's patrol band (below).
const SPAWN_X = 64;
const SPAWN_Y = 440;

// ── Corridor (Freeze Stars) ──────────────────────────────────────────────────
// Ceiling (corridor.x, 360) + a 32×130 sentry at (corridor.x, 435) patrolling
// ±140 wall off the lane until frozen. corridor.x=300 → patrol band 160..440,
// fully on the left ground span and clear of spawn (sentry left edge ≥ 144,
// astronaut right edge at spawn ≈ 80). ✔
const CORRIDOR_X = 300;

// ── Hazard lane (Phase Dash) ─────────────────────────────────────────────────
// A full-height "plasma curtain": narrow (88px) but tall (y 90..510). Tallness —
// not width — makes it un-passable: a 245px running jump can neither clear it
// horizontally nor rise above it (apex tops out near y=335, far below the
// curtain's y=90 top), so any traversal at any reachable height overlaps it.
// Only a Phase Dash window crosses it. NO reach-math soft-lock (unlike a pit).
//   curtain x=620 (left edge 576) sits 120px past the sentry's right edge (≈456)
//   → a comfortable safe landing before the curtain. ✔
const HAZARD_X = 620;
const HAZARD_Y = 300;
const HAZARD_WIDTH = 88;
const HAZARD_HEIGHT = 420;

// ── Illuminate finale ────────────────────────────────────────────────────────
// Past the curtain on continuous ground. The hidden-platform collider always
// exists; the dark Rectangle merely hides it until Illuminate fades it — so
// Illuminate is PERCEPTUALLY load-bearing (you must reveal it to commit the
// jump). The goal floats high enough that a ground jump MISSES it; only a jump
// from the hidden platform reaches it.
//   Hidden platform: (880, 430), texture 120×16 → top surface ≈ y=422.
//   Goal:            (900, 300), 28×28 → spans y≈286..314.
//     Ground jump apex (sprite top) ≈ y=335 → 21px below the goal → MISS. ✔
//     From the platform (stand center ≈398) the rise passes through the goal
//     band → REACH; horizontal 880→900 = 20px. ✔
const HIDDEN_PLATFORM_X = 880;
const HIDDEN_PLATFORM_Y = 430;
const GOAL_X = 900;
const GOAL_Y = 300;

export const planet3Config: PlanetConfig = {
  id: 'planet-3',
  name: 'Nebula Core',
  hint: 'Chill the sentry, phase through the plasma curtain, then illuminate the hidden ledge.',
  spawn: { x: SPAWN_X, y: SPAWN_Y },
  goal: { x: GOAL_X, y: GOAL_Y },
  // Degenerate pit — startX === endX skips no tiles, so the ground is continuous
  // (Nebula Core gates on Phase Dash, not Summon Platform; see header).
  pit: { startX: 480, endX: 480 },
  corridor: { x: CORRIDOR_X },
  // Optional flourish: casting Summon Platform drops a small ledge here. Not a
  // gate (the ground is continuous), so it is purely a player's choice.
  platformDrop: { x: 680, y: 470 },
  hiddenPlatform: { x: HIDDEN_PLATFORM_X, y: HIDDEN_PLATFORM_Y },
  darkZone: { x: HIDDEN_PLATFORM_X, y: HIDDEN_PLATFORM_Y, width: 150, height: 120 },
  fallRespawnY: 600,
  // The Phase Dash gate.
  hazardLane: { x: HAZARD_X, y: HAZARD_Y, width: HAZARD_WIDTH, height: HAZARD_HEIGHT },
  // NEBULA palette: deep violet field, dusky-violet terrain, magenta platform.
  // The teal plasma curtain (HAZARD_COLOR) is complementary, so it pops.
  theme: {
    background: '#160a2e',
    ground: 0x5a4a7a,
    ceiling: 0x3a2a5a,
    platform: 0xb98aff,
    hiddenPlatform: 0x5a4a7a,
    enemy: 0xff6b9d,
    goal: 0xffef7a,
  },
};
