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
