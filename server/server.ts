import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import type { ServerToClientMsg } from '../src/shared/protocol';
import { parseClientMsg, relayForward } from './relay';

const PORT = Number(process.env.PORT) || 3081;
const ROOM_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

type Role = 'game' | 'phone';

interface Room {
  code: string;
  game?: WebSocket;
  phone?: WebSocket;
}

const rooms = new Map<string, Room>();

// Returns null when 10 attempts collide (astronomically unlikely at this room
// count) — a throw here would escape the 'message' listener and kill the process.
function generateRoomCode(): string | null {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += ROOM_LETTERS[Math.floor(Math.random() * ROOM_LETTERS.length)];
    }
    if (!rooms.has(code)) return code;
  }
  return null;
}

function send(ws: WebSocket, msg: ServerToClientMsg): void {
  ws.send(JSON.stringify(msg));
}

// Serve HTTP and the WebSocket upgrade on the SAME port. A platform
// `http_service` (Fly, etc.) terminates TLS and forwards one internal port, so
// `GET /` must answer for health checks while `wss://` upgrades pass through.
const httpServer = createServer((req, res) => {
  if (req.url === '/healthz' || req.url === '/') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('constellation relay ok\n');
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain' });
  res.end('not found\n');
});

// Surviving runtime socket errors must not kill the process — but a failed
// bind (EADDRINUSE at boot) should still exit nonzero so the platform restarts us.
httpServer.on('error', (err) => {
  console.error('[http error]', err);
  if (!httpServer.listening) process.exit(1);
});

// Legit messages are <200 bytes; the ws default is 100 MiB — one hostile frame
// away from OOM on a small VM.
const wss = new WebSocketServer({ server: httpServer, maxPayload: 4096 });

wss.on('error', (err) => {
  console.error('[wss error]', err);
});

// Heartbeat liveness, tracked per socket. A phone that sleeps on cellular never
// FINs: its socket stays OPEN forever, `room.phone` stays claimed, and the
// documented manual rejoin path is blocked until kernel TCP gives up (tens of
// minutes). Ghost games likewise leak their rooms until restart.
const alive = new WeakMap<WebSocket, boolean>();

wss.on('connection', (ws) => {
  let assignedRoom: Room | null = null;
  let role: Role | null = null;

  alive.set(ws, true);
  ws.on('pong', () => alive.set(ws, true));

  // ws emits 'error' for bad frames, invalid UTF-8, over-limit payloads, and
  // plain TCP resets (a phone dropping on cellular); with no listener Node
  // throws and takes the whole relay down. ws closes the socket itself; our
  // 'close' handler below does the room cleanup.
  ws.on('error', (err) => {
    console.error('[ws error]', err.message);
  });

  ws.on('message', (data) => {
    const msg = parseClientMsg(data.toString());
    if (!msg) {
      send(ws, { type: 'error', message: 'invalid message' });
      return;
    }

    if (msg.type === 'create-room') {
      if (assignedRoom) {
        send(ws, { type: 'error', message: 'already in a room' });
        return;
      }
      const code = generateRoomCode();
      if (!code) {
        send(ws, { type: 'error', message: 'server busy, try again' });
        return;
      }
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
      return;
    }

    if (!assignedRoom) {
      send(ws, { type: 'error', message: 'not in a room' });
      return;
    }
    const other = role === 'phone' ? assignedRoom.game : assignedRoom.phone;
    if (!other) return;

    // Pure allowlist + cast→power-cast rename, carrying `boosted` through. See
    // relay.ts; the relay never reads game state.
    const forward = relayForward(msg);
    if (forward) send(other, forward);
  });

  ws.on('close', () => {
    if (!assignedRoom) return;
    const code = assignedRoom.code;
    // Dedicated peer-disconnected message (F-18) — previously overloaded onto
    // {type:'error'} and sniffed by substring on both clients.
    if (role === 'game') {
      if (assignedRoom.phone) {
        send(assignedRoom.phone, { type: 'peer-disconnected', peer: 'game' });
      }
      rooms.delete(code);
      console.log(`[room ${code}] game left, room closed`);
    } else if (role === 'phone') {
      if (assignedRoom.game) {
        send(assignedRoom.game, { type: 'peer-disconnected', peer: 'phone' });
      }
      assignedRoom.phone = undefined;
      console.log(`[room ${code}] phone left`);
    }
  });
});

// The sweep: every interval, terminate anything that hasn't ponged since the
// last pass, then ping the survivors. terminate() fires the socket's 'close'
// handler, so the existing cleanup frees the phone slot (making same-code
// rejoin work — the couch-playtest scenario) or deletes the room (bounding
// `rooms` against ghost games). Env-tunable so the relay smoke can exercise a
// sweep in milliseconds instead of waiting out the 30s default.
const HEARTBEAT_MS = Number(process.env.RELAY_HEARTBEAT_MS) || 30_000;
const sweep = setInterval(() => {
  for (const client of wss.clients) {
    if (alive.get(client) === false) {
      client.terminate();
      continue;
    }
    alive.set(client, false);
    client.ping();
  }
}, HEARTBEAT_MS);
wss.on('close', () => clearInterval(sweep));

httpServer.listen(PORT, () => {
  console.log(`Constellation relay listening on ws://localhost:${PORT} (health: GET /healthz)`);
});
