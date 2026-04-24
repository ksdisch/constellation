# Constellation

Asymmetric cozy co-op for two. The platforming player runs, jumps, and explores tiny planet worlds on the laptop. The puzzle player solves Wordle-likes, quick math, and mini-Sudoku on their phone to cast tactical mind-powers that reshape the world.

## Status

**M1 — handshake.** Laptop shows a 6-letter room code. Phone enters the code; both sides render a "connected" state over a websocket relay.

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

## Stack

- **Game client** (`src/game/`) — Phaser 3 + TypeScript
- **Phone client** (`src/phone/`) — React 19 + TypeScript
- **Shared** (`src/shared/`) — wire protocol between game and phone
- **Server** (`server/`) — Node + `ws` websocket relay
