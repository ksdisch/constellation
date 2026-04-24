# Constellation

Asymmetric cozy co-op for two. The platforming player runs, jumps, and explores tiny planet worlds on the laptop. The puzzle player solves Wordle-likes, quick math, and mini-Sudoku on their phone to cast tactical mind-powers that reshape the world.

## Status

**M0 — skeleton.** Astronaut walks on a floor in the browser. Phone page accepts a 6-letter room code (nothing on the other end yet).

Milestones and full plan: `~/.claude/plans/i-ve-started-this-in-fluttering-tiger.md`.

## Run locally

```bash
npm install
npm run dev
```

- Laptop (game):  http://localhost:5180
- Phone (companion):  http://localhost:5180/phone.html

Vite binds to `0.0.0.0` so the phone can reach it on the same wifi — it will print the LAN URL on start.

## Stack

- **Game client** (`src/game/`) — Phaser 3 + TypeScript
- **Phone client** (`src/phone/`) — React 19 + TypeScript
- **Shared + server** — coming in M1
