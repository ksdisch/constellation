/**
 * Real-socket relay smoke test (run via `npm run smoke:relay`).
 *
 * Boots the actual relay on an ephemeral port, connects a fake game + phone over
 * real WebSockets, and asserts the full deploy-relevant round-trip:
 *   create-room → join-room → boosted cast → power-cast → planet-complete,
 * plus the HTTP health endpoint that platform health checks rely on, plus the
 * hostile-frame hardening: a raw `null` frame and an over-limit frame must be
 * absorbed without killing the process.
 *
 * Process contract: the relay child is spawned DETACHED in its own process
 * group and the whole group is SIGTERMed on every exit path (finally, fail()'s
 * process.exit, Ctrl-C) — so `npm run smoke:relay | tee out.log` terminates
 * instead of hanging on an orphan that inherited the pipe.
 *
 * Pure-logic forwarding + frame parsing are unit-tested in server/relay.test.ts;
 * this proves the wiring works over a live socket on the same port that serves
 * health — exactly the path a deployed http_service exercises.
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

function closeCodeOf(ws: WebSocket, label: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${label}`)), 4000);
    ws.once('close', (code) => {
      clearTimeout(timer);
      resolve(code);
    });
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

// Anything already answering on the port means an orphan (or another service) —
// spawning our own relay would silently smoke-test the WRONG process.
async function portInUse(): Promise<boolean> {
  try {
    await fetch(`${BASE}/healthz`);
    return true;
  } catch {
    return false;
  }
}

async function waitForHealth(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/healthz`);
      if (res.ok) return;
    } catch {
      // not listening yet
    }
    await sleep(100);
  }
  fail(`relay did not answer /healthz within ${timeoutMs}ms`);
}

async function main(): Promise<void> {
  if (await portInUse()) {
    fail(`port ${PORT} is already in use — kill the orphan (lsof -nP -iTCP:${PORT} -sTCP:LISTEN) and re-run`);
  }

  // detached → own process group, so one negative-pid kill takes out the whole
  // npx → tsx → node chain (plain relay.kill() only reached the npx wrapper,
  // leaving a grandchild holding the port and any inherited stdio pipe).
  const relay = spawn('npx', ['tsx', 'server/server.ts'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'inherit', 'inherit'],
    detached: true,
  });
  relay.on('error', (err) => fail(`failed to spawn relay: ${err.message}`));

  const stopRelay = (): void => {
    if (relay.pid === undefined) return;
    try {
      process.kill(-relay.pid, 'SIGTERM');
    } catch {
      // group already gone
    }
  };
  // 'exit' fires on normal completion AND on fail()'s process.exit(1) — the
  // path that used to skip the finally and orphan the relay.
  process.on('exit', stopRelay);
  for (const sig of ['SIGINT', 'SIGTERM'] as const) {
    process.on(sig, () => process.exit(1));
  }

  await waitForHealth(10_000);

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

    // 4. Boosted cast: phone → relay → game receives power-cast carrying boosted
    //    AND the M10 solveMs telemetry field.
    const gameCast = next(game, (m) => m.type === 'power-cast', 'power-cast');
    send(phone, { type: 'cast-power', powerId: 'freeze-stars', boosted: true, solveMs: 4200 });
    const cast = (await gameCast) as { powerId: string; boosted?: boolean; solveMs?: number };
    if (cast.powerId !== 'freeze-stars' || cast.boosted !== true || cast.solveMs !== 4200) {
      fail(`power-cast mismatch: ${JSON.stringify(cast)}`);
    }
    console.log('✓ boosted cast round-trips (powerId + boosted + solveMs preserved)');

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

    // 7. Hostile frame #1: a raw `null` frame parses as JSON but is not a
    //    message — it must earn an error reply, not a process crash.
    const nullReply = next(phone, (m) => m.type === 'error', 'error reply to null frame');
    phone.send('null');
    const errMsg = (await nullReply) as { message: string };
    if (errMsg.message !== 'invalid message') fail(`unexpected null-frame reply: ${JSON.stringify(errMsg)}`);
    console.log('✓ null frame answered with an error, relay alive');

    // 8. Hostile frame #2: an over-maxPayload frame (4096) from a fresh socket.
    //    ws terminates the sender with 1009 (via the 'error' listener path that
    //    used to crash the process); the existing room must be unaffected.
    const hostile = new WebSocket(WS);
    await open(hostile);
    const hostileClose = closeCodeOf(hostile, 'oversized-frame close');
    hostile.send('x'.repeat(5000));
    const closeCode = await hostileClose;
    if (closeCode !== 1009) fail(`expected close 1009 for oversized frame, got ${closeCode}`);
    const stillAlive = await fetch(`${BASE}/healthz`);
    if (!stillAlive.ok) fail('relay died after hostile frames');
    const gameCast2 = next(game, (m) => m.type === 'power-cast', 'power-cast after hostile frames');
    send(phone, { type: 'cast-power', powerId: 'phase-dash' });
    await gameCast2;
    console.log('✓ oversized frame: sender closed with 1009, room unaffected, relay alive');

    game.close();
    phone.close();
    console.log('\n✓ relay smoke passed');
  } finally {
    stopRelay();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
