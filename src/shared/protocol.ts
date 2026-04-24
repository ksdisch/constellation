export type ClientToServerMsg =
  | { type: 'create-room'; role: 'game' }
  | { type: 'join-room'; role: 'phone'; roomCode: string };

export type ServerToClientMsg =
  | { type: 'room-created'; roomCode: string }
  | { type: 'joined'; roomCode: string }
  | { type: 'phone-joined' }
  | { type: 'error'; message: string };
