/**
 * Real-socket relay smoke test (run via `npm run smoke:relay`).
 *
 * Boots the actual relay on an ephemeral port, connects a fake game + phone over
 * real WebSockets, and asserts the full deploy-relevant round-trip:
 *   create-room → join-room → boosted cast → power-cast → planet-complete,
 * plus the new HTTP health endpoint that platform health checks rely on.
 *
 * Pure-logic forwarding is unit-tested in server/relay.test.ts; this proves the
 * wiring works over a live socket on the same port that serves health — exactly
 * the path a deployed http_service exercises.
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { WebSocket } from 'ws';
import type { ClientToServerMsg, ServerToClientMsg } from '../src/shared/protocol';

const PORT = 3099;
const BASE = `http://127.0.0.1:${PORT}`;
const WS = `ws://127.0.0.1:${PORT}`;

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function next(ws: WebSocket, pred: (m: ServerToClientMsg) => boolean, label: string): Promise<ServerToClientMsg> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${label}`)), 4000);
    const onMsg = (data: Buffer) => {
      const msg = JSON.parse(data.toString()) as ServerToClientMsg;
      if (pred(msg)) {
        clearTimeout(timer);
        ws.off('message', onMsg);
        resolve(msg);
      }
    };
    ws.on('message', onMsg);
  });
}

function send(ws: WebSocket, msg: ClientToServerMsg): void {
  ws.send(JSON.stringify(msg));
}

function open(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
}

async function main(): Promise<void> {
  const relay = spawn('npx', ['tsx', 'server/server.ts'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  // Give the relay a moment to bind the port.
  await sleep(1200);

  try {
    // 1. Health endpoint (what Fly's http_service check hits).
    const health = await fetch(`${BASE}/healthz`);
    if (!health.ok) fail(`/healthz returned ${health.status}`);
    const body = (await health.text()).trim();
    if (body !== 'constellation relay ok') fail(`/healthz body unexpected: ${body}`);
    console.log('✓ health endpoint answers 200');

    // 2. Game connects + creates a room.
    const game = new WebSocket(WS);
    await open(game);
    send(game, { type: 'create-room', role: 'game' });
    const created = await next(game, (m) => m.type === 'room-created', 'room-created');
    const roomCode = (created as { roomCode: string }).roomCode;
    if (!roomCode || roomCode.length !== 6) fail(`bad room code: ${roomCode}`);
    console.log(`✓ room created (${roomCode})`);

    // 3. Phone joins; game is notified.
    const phone = new WebSocket(WS);
    await open(phone);
    const gamePhoneJoined = next(game, (m) => m.type === 'phone-joined', 'phone-joined');
    send(phone, { type: 'join-room', role: 'phone', roomCode });
    await next(phone, (m) => m.type === 'joined', 'joined');
    await gamePhoneJoined;
    console.log('✓ phone joined, game notified');

    // 4. Boosted cast: phone → relay → game receives power-cast carrying boosted.
    const gameCast = next(game, (m) => m.type === 'power-cast', 'power-cast');
    send(phone, { type: 'cast-power', powerId: 'freeze-stars', boosted: true });
    const cast = (await gameCast) as { powerId: string; boosted?: boolean };
    if (cast.powerId !== 'freeze-stars' || cast.boosted !== true) {
      fail(`power-cast mismatch: ${JSON.stringify(cast)}`);
    }
    console.log('✓ boosted cast round-trips (powerId + boosted preserved)');

    // 5. planet-started: game → relay → phone, carrying the puzzle theme (M9).
    const phoneTheme = next(phone, (m) => m.type === 'planet-started', 'planet-started');
    send(game, { type: 'planet-started', theme: 'ice' });
    const started = (await phoneTheme) as { theme: string };
    if (started.theme !== 'ice') fail(`planet-started theme mismatch: ${JSON.stringify(started)}`);
    console.log('✓ planet-started round-trips (theme preserved)');

    // 6. planet-complete: game → relay → phone.
    const phoneComplete = next(phone, (m) => m.type === 'planet-complete', 'planet-complete');
    send(game, { type: 'planet-complete' });
    await phoneComplete;
    console.log('✓ planet-complete round-trips');

    game.close();
    phone.close();
    console.log('\n✓ relay smoke passed');
  } finally {
    relay.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
