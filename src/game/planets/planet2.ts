import type { PlanetConfig } from './planet1';

/**
 * Planet 2 — "Stellar Winds" (ICE).
 *
 * A distinct layout from planet-1 that makes ALL THREE powers physically /
 * perceptually load-bearing, in a new running order: Summon Platform first
 * (cross an un-jumpable pit), then Freeze Stars (slip past the plasma sentry
 * in the corridor), then Illuminate (reveal the final hidden ledge).
 *
 * ── Reach budget (from spec) ──────────────────────────────────────────────
 *   Astronaut: speed 240, jumpVelocity -460, gravity y=900.
 *   A RUNNING jump covers ~245px horizontal and ~117px vertical.
 *   Ground tiles render at y=520 on the x = 32 + 64k grid.
 *   Astronaut sprite is 32x48; the ground tile top surface is at y≈500.
 *
 * Every gap below is annotated against that 245px / 117px budget. Sub-gaps are
 * kept comfortably under it (≤ ~200px horizontal, ≤ ~100px vertical) so the
 * intended route is reliably crossable, while the full pit is deliberately
 * wider than a single jump so the platform is REQUIRED.
 */

// ── Pit geometry ───────────────────────────────────────────────────────────
// Ground tiles occupy the grid x = 32, 96, 160, ... (step 64). The pit is the
// contiguous run of skipped tiles where startX <= x < endX in Planet.create().
//
//   Last LEFT ground tile:  x = 480  (480 < startX=512  → present)
//   First skipped tile:     x = 544  (512 <= 544 < 800  → pit)
//   ...
//   Last skipped tile:      x = 736  (512 <= 736 < 800  → pit)
//   First RIGHT ground tile:x = 800  (800 >= endX=800   → present)
//
// Pit width = endX - startX = 800 - 512 = 288 px  (>= 260 → UN-JUMPABLE).
// A 245px running jump cannot clear a 288px gap, so Summon Platform is
// PHYSICALLY required to cross. ✔ (constraint: pit >= 260)
const PIT_START_X = 512;
const PIT_END_X = 800;

// ── Platform drop (mid-pit stepping stone) ─────────────────────────────────
// Dropped near the pit center so each sub-gap is short. The platform texture is
// 96px wide, centered at platformDrop.x, so its top spans roughly
// [drop.x-48, drop.x+48]. With drop.x = 656 the platform spans ~[608, 704].
//
//   Left edge of usable left ground (tile x=480, 64 wide → right edge ~512)
//     → platform left edge (~608):  horizontal gap ≈ 608 - 512 = 96 px   ✔ (<200)
//   Platform right edge (~704)
//     → right ground left edge (tile x=800, 64 wide → left edge ~768):
//                                   horizontal gap ≈ 768 - 704 = 64 px   ✔ (<200)
//
// Platform y = 470 vs ground surface y≈500 → rise ≈ 30 px on landing.   ✔ (<100)
// Both sub-jumps are short and shallow → comfortably crossable. ✔
const PLATFORM_DROP_X = 656;
const PLATFORM_DROP_Y = 470;

// ── Corridor (plasma sentry + ceiling) ─────────────────────────────────────
// Placed on the LEFT ground span, between spawn and the pit, so the astronaut
// must pass through it first. The ceiling sits at (corridor.x, 360) and the
// 32x130 enemy at (corridor.x, 435) patrols ±140px — together they wall off the
// lane until frozen, making Freeze Stars load-bearing. corridor.x=300 keeps the
// full patrol band (160..440) on solid left ground (ground spans x≈0..512).  ✔
const CORRIDOR_X = 300;

// ── Hidden platform + dark zone + goal (Illuminate finale) ─────────────────
// On the RIGHT ground span past the pit. The hidden-platform collider always
// exists; the dark Rectangle merely hides it until Illuminate fades it — so
// Illuminate is PERCEPTUALLY load-bearing (you must reveal it to commit the
// jump). The goal sits up and to the right, reachable in one jump FROM the
// hidden platform.
//
//   Hidden platform: (880, 430). Texture 120x16 → top surface ≈ y=422.
//   Goal:            (905, 320).
//     Horizontal: 905 - 880 = 25 px   ✔ (<245)
//     Vertical rise: 422 - 320 = 102 px ✔ (<= ~115)
//   → one jump from the hidden platform lands on the goal. ✔
const HIDDEN_PLATFORM_X = 880;
const HIDDEN_PLATFORM_Y = 430;
const GOAL_X = 905;
const GOAL_Y = 320;

export const planet2Config: PlanetConfig = {
  id: 'planet-2',
  name: 'Stellar Winds',
  hint: 'Bridge the frozen chasm, chill the plasma sentinel, then illuminate the icebound ledge.',
  // Spawn on the far-left ground, before the corridor and pit.
  spawn: { x: 70, y: 440 },
  goal: { x: GOAL_X, y: GOAL_Y },
  pit: { startX: PIT_START_X, endX: PIT_END_X },
  corridor: { x: CORRIDOR_X },
  platformDrop: { x: PLATFORM_DROP_X, y: PLATFORM_DROP_Y },
  hiddenPlatform: { x: HIDDEN_PLATFORM_X, y: HIDDEN_PLATFORM_Y },
  // Dark Rectangle masking the hidden platform region (cosmetic only).
  darkZone: { x: HIDDEN_PLATFORM_X, y: HIDDEN_PLATFORM_Y, width: 160, height: 110 },
  fallRespawnY: 600,
  // ICE puzzle theme — frosts the phone puzzles (snowflake glyph + cold accents).
  puzzleTheme: 'ice',
  // ICE palette: cold blues / whites. Opt-in — drives Boot texture generation
  // and the camera background. background is a CSS color; the rest are 0xRRGGBB.
  theme: {
    background: '#0b2030',
    ground: 0x6fa8c7,
    ceiling: 0x355a7a,
    platform: 0x9fd0e8,
    hiddenPlatform: 0x6fa8c7,
    enemy: 0xff6b9d,
    goal: 0xffef7a,
  },
};
