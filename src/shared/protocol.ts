export type PowerId = 'freeze-stars' | 'summon-platform' | 'illuminate' | 'phase-dash';

// `boosted` (M8) marks a cast whose power should hit harder on the laptop —
// the phone player invested a STRENGTH talent in this power. Optional + defaults
// to false everywhere, so an un-invested cast is byte-identical to pre-M8.
export type ClientToServerMsg =
  | { type: 'create-room'; role: 'game' }
  | { type: 'join-room'; role: 'phone'; roomCode: string }
  | { type: 'cast-power'; powerId: PowerId; boosted?: boolean }
  | { type: 'puzzle-solved'; powerId: PowerId; boosted?: boolean }
  // Game → phone: the laptop cleared a planet. The phone earns bonus stardust.
  | { type: 'planet-complete' };

export type ServerToClientMsg =
  | { type: 'room-created'; roomCode: string }
  | { type: 'joined'; roomCode: string }
  | { type: 'phone-joined' }
  | { type: 'game-ready'; availablePowers: PowerId[] }
  | { type: 'power-cast'; powerId: PowerId; boosted?: boolean }
  | { type: 'planet-complete' }
  | { type: 'error'; message: string };
