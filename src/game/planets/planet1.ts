/**
 * Optional per-planet visual theme. OPT-IN: a config WITHOUT a `theme` keeps
 * the default texture keys and camera background, so it renders pixel-identical
 * to the original look. `background` is a camera background CSS color string
 * (e.g. "#0b1f3a"); the remaining fields are 0xRRGGBB texture fill colors,
 * matched 1:1 to the default texture set (ground/ceiling/platform/hidden-
 * platform/enemy/goal). Boot generates `<key>-<planetId>` textures from these.
 */
export type PlanetTheme = {
  background: string;
  ground: number;
  ceiling: number;
  platform: number;
  hiddenPlatform: number;
  enemy: number;
  goal: number;
};

export type PlanetConfig = {
  id: string;                                   // 'planet-1'
  name: string;                                 // user-visible title
  hint: string;                                 // subtitle text
  spawn: { x: number; y: number };
  goal: { x: number; y: number };
  pit: { startX: number; endX: number };
  corridor: { x: number };
  platformDrop: { x: number; y: number };
  hiddenPlatform: { x: number; y: number };
  darkZone: { x: number; y: number; width: number; height: number };
  fallRespawnY: number;
  // OPT-IN visual theme. Omit (as planet1Config does) for the default look.
  theme?: PlanetTheme;
  // OPT-IN Phase Dash hazard — a full-height "plasma curtain" the astronaut can
  // only cross while phased. {x,y} is the center; height should span the play
  // area top-to-ground so it can't be jumped over. Omit (planet-1/2) for none.
  hazardLane?: { x: number; y: number; width: number; height: number };
};

export const planet1Config: PlanetConfig = {
  id: 'planet-1',
  name: 'Constellation',
  hint: 'Freeze her past the plasma column, bridge the chasm, then illuminate the hidden path.',
  spawn: { x: 80, y: 440 },
  goal: { x: 920, y: 300 },
  pit: { startX: 660, endX: 880 },
  corridor: { x: 420 },
  platformDrop: { x: 770, y: 460 },
  hiddenPlatform: { x: 920, y: 420 },
  darkZone: { x: 920, y: 420, width: 160, height: 100 },
  fallRespawnY: 600,
};
