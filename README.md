# Constellation

Asymmetric cozy co-op for two. The platforming player runs, jumps, and explores tiny planet worlds on the laptop. The puzzle player solves Wordle-likes, quick math, and mini-Sudoku on their phone to cast tactical mind-powers that reshape the world.

## Status

**M2 — one power, one level.** Laptop loads a level with a patrolling enemy and a star goal. Phone shows a spellbook with one power (Freeze Stars). Tap it, solve 3 quick-math problems in 30s, and the enemy freezes for 3s so the astronaut can run past.

Milestones and full plan: `~/.claude/plans/i-ve-started-this-in-fluttering-tiger.md`.

## Run locally

```bash
npm install
npm run dev
```

- Laptop (game):  http://localhost:5180
- Phone (companion):  http://localhost:5180/phone.html

Ports: Vite on **5180**, websocket relay on **3081** (both configurable — see `vite.config.ts` and `server/server.ts`).

The dev server binds to `0.0.0.0` so the phone can reach it on the same wifi — Vite will print the LAN URL on start.

## Deploy

The relay ships with a `Dockerfile` + `fly.toml` (and a `/healthz` endpoint); the
clients build to static files pointed at the relay via `VITE_RELAY_URL`. Full
walkthrough — relay → Fly, clients → itch.io — in [docs/DEPLOY.md](docs/DEPLOY.md).

## Stack

- **Game client** (`src/game/`) — Phaser 3 + TypeScript
- **Phone client** (`src/phone/`) — React 19 + TypeScript
- **Shared** (`src/shared/`) — wire protocol between game and phone
- **Server** (`server/`) — Node + `ws` websocket relay
