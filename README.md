# Constellation

Asymmetric cozy co-op for two. The platforming player runs, jumps, and explores tiny planet worlds on the laptop. The puzzle player solves quick puzzles on their phone — quick math, tap sequences, trivia, dial alignment — to cast tactical mind-powers that reshape the world.

## Status

**Playable end-to-end** — galaxy hub, three planets, four powers. M11 is shipped; M13 (hardening) is in flight, working through the [2026-07-09 audit fix plan](docs/AUDIT-2026-07-09.md).

- **Four powers**, each a phone puzzle → laptop cast: Freeze Stars (quick math), Summon Platform (tap sequence), Illuminate (trivia), Phase Dash (dial alignment).
- **Galaxy hub + three planets** (corridor / ice / nebula), unlocked in order, progress persisted in `localStorage`.
- **Talent constellation** on the phone: solves earn stardust to spend on accommodation talents (cozier puzzles for you) and strength talents (boosted powers for your partner).
- **Rhythm portrait**: per-pair solve telemetry, rendered as an end-of-planet card on the laptop.
- **Procedural juice**: synthesized SFX + ambient music (zero asset files), particle bursts, screen shake, master mute.

Active work and full history live in [BACKLOG.md](BACKLOG.md); deferred ideas in [docs/ideas/](docs/ideas/).

## Run locally

```bash
npm install
npm run dev
```

- Laptop (game):  http://localhost:5180
- Phone (companion):  http://localhost:5180/phone.html

Ports: Vite on **5180**, websocket relay on **3081** (both configurable — see `vite.config.ts` and `server/server.ts`).

The dev server binds to `0.0.0.0` so the phone can reach it on the same wifi — Vite will print the LAN URL on start.

### Solo mode & headless verification

- **Solo mode:** open `http://localhost:5180/?solo=1` to skip the phone + relay; keys **1–4** cast the four powers directly.
- **Test bridge:** add `?test=1` to expose a typed `window.__constellation` driver so a browser tool can verify real gameplay headlessly (a complete no-op without the flag) — playbook in [docs/AUTONOMY.md](docs/AUTONOMY.md).
- **Relay smoke:** `npm run smoke:relay` boots the real relay and asserts health, the full co-op round-trip, hostile frames, and the ghost-sweep → same-code rejoin path.
- **Unit tests:** `npm run test` (Vitest, pure-logic modules).

## Deploy

The relay ships with a `Dockerfile` + `fly.toml` (and a `/healthz` endpoint); the
clients build to static files pointed at the relay via `VITE_RELAY_URL`. Full
walkthrough — relay → Fly, clients → itch.io — in [docs/DEPLOY.md](docs/DEPLOY.md).

## Stack

- **Game client** (`src/game/`) — Phaser 3 + TypeScript
- **Phone client** (`src/phone/`) — React 19 + TypeScript
- **Shared** (`src/shared/`) — wire protocol between game and phone
- **Server** (`server/`) — Node + `ws` websocket relay
