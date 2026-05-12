# Constellation — Project Conventions

Asymmetric cozy 2-player co-op. Laptop runs a Phaser platformer (astronaut); phone runs React puzzles (Starglow companion); a small `ws` relay glues them via room codes.

Read [README.md](README.md) for run instructions. High-level plan and milestones live at `~/.claude/plans/i-ve-started-this-in-fluttering-tiger.md`. Active work tracked in [BACKLOG.md](BACKLOG.md).

## File layout

- `src/game/` — Phaser 3 game client (laptop). Scenes in `scenes/`, entity classes in `entities/`, networking in `net/`, bootstrap in `main.ts`.
- `src/phone/` — React 19 phone client. Components in `components/`, puzzles in `components/puzzles/`, networking in `net/`, bootstrap in `main.tsx`.
- `src/shared/` — Code shared between game and phone. Only `protocol.ts` lives here (wire message types). Both sides import from `../shared/protocol`. Treat this as a strict boundary — nothing else goes here.
- `server/` — Node + `ws` relay. Pass-through forwarding by room code. No game logic; never put game logic here.
- `index.html` / `phone.html` — Vite multi-entry HTML files. `index.html` boots the game, `phone.html` boots the phone client.

## Commands

```bash
npm install              # first-time setup
npm run dev              # vite + relay concurrently (game on :5180, ws on :3081)
npm run typecheck        # tsc --noEmit
npm run build            # tsc && vite build
npm run preview          # preview built bundle
```

Vite binds to `0.0.0.0`; the printed LAN URL is what the phone uses on the same wifi. No automated tests yet — playtest is the integration gate.

## Conventions

- **TypeScript strict mode** with `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`. No `any`. No unused imports or locals.
- **React (phone):** functional components, hooks, inline `style={{}}` objects only. No CSS files, no CSS frameworks, no styled-components, no `className`-based styling. Match the existing palette (panels `#1a1b3a`, cold accent `#7ad8ff`, error `#ff6b9d`, dim text `opacity: 0.6` on `#fff`). Touch targets ≥ 44px.
- **Phaser (game):** scenes extend `Phaser.Scene` and live in `scenes/`. Entities are thin classes in `entities/` wrapping a sprite, exposing `.sprite` and any update/behavior methods. Use arcade physics. Static groups for terrain.
- **Wire protocol:** any change to `src/shared/protocol.ts` must be matched by changes in both `src/game/` and `src/phone/` in the same commit. The relay (`server/server.ts`) forwards opaquely — almost never needs changes for new messages.
- **Powers and puzzles:** each power has (a) a `PowerId` literal in `protocol.ts`, (b) a tile in `src/phone/components/Spellbook.tsx`, (c) a puzzle component under `src/phone/components/puzzles/`, (d) a cast handler in `src/game/scenes/Level.ts`. Wire all four sides in the same change.
- **Puzzle component contract:** `{ onSolved: () => void; onCancel: () => void }`. Optionally accepts difficulty / timing props with defaults. See `QuickMath.tsx` for the template.
- **Entity pattern:** `constructor(scene, x, y)`, holds `.sprite`, exposes `.update()` if it needs per-frame logic. See `Astronaut.ts` and `Enemy.ts`.

## Do / don't

- **Do** extend, don't refactor: when adding a power, model it on Freeze Stars / QuickMath. Don't rework the existing power architecture; it's good enough for the first three powers.
- **Do** keep `src/shared/` minimal — only wire-protocol types.
- **Don't** put game logic in the relay server.
- **Don't** introduce new dependencies casually. The stack is locked: Phaser, React, ws, Vite, tsx, TypeScript. Adding anything else is a real decision.
- **Don't** add CSS files, frameworks, or imports of style files.
- **Don't** add tests yet. The playtest gate (M2 "is it fun?") is the project's stated integration test. When tests are introduced, this section will be revised.
- **Don't** break Freeze Stars when adding new powers. Manually smoke-test it after touching anything in `Spellbook.tsx`, `App.tsx`, or `Level.ts`.

## Commit style

Conventional commits with the active milestone prefix:

```
feat(m3): Summon Platform power with 4×4 mini-sudoku puzzle
fix(m3): platform collision no longer punches through ceiling
chore(m0): scaffold Vite + Phaser + React skeleton
```

## Framework gotchas

- **Vite multi-entry:** `vite.config.ts` registers both `index.html` and `phone.html` under `rollupOptions.input`. New top-level entries must be added there.
- **Phaser asset preload:** generated textures (rectangles, simple shapes) live in `src/game/scenes/Boot.ts`. If a new entity needs a texture, register it there — not at instantiation time.
- **Relay reconnect:** `server.ts` does not currently auto-reconnect. If the phone disconnects mid-level, the room is preserved but rejoin is manual (refresh phone, re-enter code). Don't rely on persistent reconnection logic in scene code.
- **Phaser body types:** access physics body via `sprite.body as Phaser.Physics.Arcade.Body`. The cast is intentional; the union type makes direct access cumbersome. Established in the codebase.
- **Worktrees:** this repo is currently being worked on in a git worktree under `.claude/worktrees/`. The `.claude/` directory at repo root holds orchestrator scaffolding (this CLAUDE.md, `agents/`, `templates/`, `orchestrator-prompt.md`). Don't confuse with the worktree machinery.

## Orchestrator-worker pattern

This repo uses an orchestrator-worker workflow for non-trivial features. See `.claude/orchestrator-prompt.md` for the current feature's orchestrator setup, `.claude/agents/` for named subagents, and `.claude/templates/phase-brief.md` for the per-phase brief format.
