import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import type { ServerToClientMsg } from '../src/shared/protocol';
import { parseClientMsg, relayForward } from './relay';
import { RoomRegistry } from './roomRegistry';

const PORT = Number(process.env.PORT) || 3081;

// Room lifecycle (create/join/leave, membership, code minting) lives in the
// pure, unit-tested RoomRegistry (F-21). This file keeps only the socket
// plumbing: parse → registry/allowlist → send.
const registry = new RoomRegistry<WebSocket>();

const JOIN_ERROR: Record<'already-in-room' | 'not-found' | 'occupied', string> = {
  'already-in-room': 'already in a room',
  'not-found': 'room not found',
  occupied: 'room already has a phone',
};

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
      const res = registry.create(ws);
      if (!res.ok) {
        // codes-exhausted is astronomically unlikely at this room count, but a
        // throw would escape the 'message' listener and kill the process — it
        // stays an error reply.
        send(ws, {
          type: 'error',
          message: res.reason === 'codes-exhausted' ? 'server busy, try again' : 'already in a room',
        });
        return;
      }
      send(ws, { type: 'room-created', roomCode: res.code });
      console.log(`[room ${res.code}] created`);
      return;
    }

    if (msg.type === 'join-room') {
      const res = registry.join(ws, msg.roomCode);
      if (!res.ok) {
        send(ws, { type: 'error', message: JOIN_ERROR[res.reason] });
        return;
      }
      send(ws, { type: 'joined', roomCode: res.code });
      send(res.game, { type: 'phone-joined' });
      console.log(`[room ${res.code}] phone joined`);
      return;
    }

    if (!registry.isMember(ws)) {
      send(ws, { type: 'error', message: 'not in a room' });
      return;
    }
    const peer = registry.peerOf(ws);
    if (!peer) return;

    // Pure allowlist + cast→power-cast rename, carrying `boosted` through. See
    // relay.ts; the relay never reads game state.
    const forward = relayForward(msg);
    if (forward) send(peer, forward);
  });

  ws.on('close', () => {
    const left = registry.leave(ws);
    if (!left) return;
    // Dedicated peer-disconnected message (F-18) — previously overloaded onto
    // {type:'error'} and sniffed by substring on both clients.
    if (left.peer) send(left.peer, { type: 'peer-disconnected', peer: left.role });
    console.log(
      left.role === 'game'
        ? `[room ${left.code}] game left, room closed`
        : `[room ${left.code}] phone left`,
    );
  });
});

// The sweep: every interval, terminate anything that hasn't ponged since the
// last pass, then ping the survivors. terminate() fires the socket's 'close'
// handler, so the registry cleanup frees the phone slot (making same-code
// rejoin work — the couch-playtest scenario) or deletes the room (bounding
// the room count against ghost games). Env-tunable so the relay smoke can
// exercise a sweep in milliseconds instead of waiting out the 30s default.
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
