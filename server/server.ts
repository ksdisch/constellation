import { WebSocketServer, WebSocket } from 'ws';
import type { ClientToServerMsg, ServerToClientMsg } from '../src/shared/protocol';

const PORT = Number(process.env.PORT) || 3081;
const ROOM_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

type Role = 'game' | 'phone';

interface Room {
  code: string;
  game?: WebSocket;
  phone?: WebSocket;
}

const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += ROOM_LETTERS[Math.floor(Math.random() * ROOM_LETTERS.length)];
    }
    if (!rooms.has(code)) return code;
  }
  throw new Error('unable to generate unique room code');
}

function send(ws: WebSocket, msg: ServerToClientMsg): void {
  ws.send(JSON.stringify(msg));
}

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  let assignedRoom: Room | null = null;
  let role: Role | null = null;

  ws.on('message', (data) => {
    let msg: ClientToServerMsg;
    try {
      msg = JSON.parse(data.toString()) as ClientToServerMsg;
    } catch {
      send(ws, { type: 'error', message: 'invalid json' });
      return;
    }

    if (msg.type === 'create-room') {
      if (assignedRoom) {
        send(ws, { type: 'error', message: 'already in a room' });
        return;
      }
      const code = generateRoomCode();
      const room: Room = { code, game: ws };
      rooms.set(code, room);
      assignedRoom = room;
      role = 'game';
      send(ws, { type: 'room-created', roomCode: code });
      console.log(`[room ${code}] created`);
      return;
    }

    if (msg.type === 'join-room') {
      if (assignedRoom) {
        send(ws, { type: 'error', message: 'already in a room' });
        return;
      }
      const room = rooms.get(msg.roomCode);
      if (!room || !room.game) {
        send(ws, { type: 'error', message: 'room not found' });
        return;
      }
      if (room.phone) {
        send(ws, { type: 'error', message: 'room already has a phone' });
        return;
      }
      room.phone = ws;
      assignedRoom = room;
      role = 'phone';
      send(ws, { type: 'joined', roomCode: room.code });
      send(room.game, { type: 'phone-joined' });
      console.log(`[room ${room.code}] phone joined`);
    }
  });

  ws.on('close', () => {
    if (!assignedRoom) return;
    const code = assignedRoom.code;
    if (role === 'game') {
      if (assignedRoom.phone) {
        send(assignedRoom.phone, { type: 'error', message: 'game disconnected' });
      }
      rooms.delete(code);
      console.log(`[room ${code}] game left, room closed`);
    } else if (role === 'phone') {
      if (assignedRoom.game) {
        send(assignedRoom.game, { type: 'error', message: 'phone disconnected' });
      }
      assignedRoom.phone = undefined;
      console.log(`[room ${code}] phone left`);
    }
  });
});

console.log(`Constellation relay listening on ws://localhost:${PORT}`);
