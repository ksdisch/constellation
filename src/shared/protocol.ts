export type PowerId = 'freeze-stars' | 'summon-platform' | 'illuminate' | 'phase-dash';

// Coarse per-planet visual theme for the PHONE puzzles. 'default' is the
// original look (planet-1); 'ice'/'nebula' match planets 2/3. The wire carries
// only this identity — the phone owns the actual palette (src/phone/
// puzzleThemes.ts), the game owns the planet textures. Optional + defaults to
// 'default' everywhere, so a themeless planet is byte-identical to pre-M9.
export type PuzzleTheme = 'default' | 'ice' | 'nebula';

// `boosted` (M8) marks a cast whose power should hit harder on the laptop —
// the phone player invested a STRENGTH talent in this power. Optional + defaults
// to false everywhere, so an un-invested cast is byte-identical to pre-M8.
//
// `solveMs` (M10) is the phone player's measured solve duration for the puzzle
// that produced this cast — feeds the per-role "rhythm portrait" telemetry
// (src/game/progression/save.ts). It is RECORDED ONLY; no gameplay branches on
// it, so an un-instrumented or solo cast (solveMs absent) is byte-identical.
export type ClientToServerMsg =
  | { type: 'create-room'; role: 'game' }
  | { type: 'join-room'; role: 'phone'; roomCode: string }
  | { type: 'cast-power'; powerId: PowerId; boosted?: boolean; solveMs?: number }
  | { type: 'puzzle-solved'; powerId: PowerId; boosted?: boolean; solveMs?: number }
  // Game → phone: the laptop cleared a planet. The phone earns bonus stardust.
  | { type: 'planet-complete' }
  // Game → phone: a planet (re)started; the phone themes its puzzles to match.
  | { type: 'planet-started'; theme: PuzzleTheme };

export type ServerToClientMsg =
  | { type: 'room-created'; roomCode: string }
  | { type: 'joined'; roomCode: string }
  | { type: 'phone-joined' }
  | { type: 'game-ready'; availablePowers: PowerId[] }
  | { type: 'power-cast'; powerId: PowerId; boosted?: boolean; solveMs?: number }
  | { type: 'planet-complete' }
  | { type: 'planet-started'; theme: PuzzleTheme }
  | { type: 'error'; message: string };
