export type PowerId = 'freeze-stars' | 'summon-platform' | 'illuminate';

export type ClientToServerMsg =
  | { type: 'create-room'; role: 'game' }
  | { type: 'join-room'; role: 'phone'; roomCode: string }
  | { type: 'cast-power'; powerId: PowerId }
  | { type: 'puzzle-solved'; powerId: PowerId };

export type ServerToClientMsg =
  | { type: 'room-created'; roomCode: string }
  | { type: 'joined'; roomCode: string }
  | { type: 'phone-joined' }
  | { type: 'game-ready'; availablePowers: PowerId[] }
  | { type: 'power-cast'; powerId: PowerId }
  | { type: 'error'; message: string };
