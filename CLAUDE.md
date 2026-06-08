# Constellation — Project Conventions

Asymmetric cozy 2-player co-op. Laptop runs a Phaser platformer (astronaut); phone runs React puzzles (Starglow companion); a small `ws` relay glues them via room codes.

Read [README.md](README.md) for run instructions. High-level plan and milestones live at `~/.claude/plans/i-ve-started-this-in-fluttering-tiger.md`. Active work tracked in [BACKLOG.md](BACKLOG.md).

## File layout

- `src/game/` — Phaser 3 game client (laptop). Scenes in `scenes/`, entity classes in `entities/`, networking in `net/`, bootstrap in `main.ts`. Juice (procedural SFX + particle/shake effect tables and the scene-bound `JuiceController` applier) lives in `juice/`.
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
npm run test             # vitest run (pure-logic unit tests)
npm run test:watch       # vitest in watch mode
```

Vite binds to `0.0.0.0`; the printed LAN URL is what the phone uses on the same wifi. Playtest remains the integration gate for game feel; Vitest covers pure, framework-free logic (e.g. the progression/persistence module).

## Conventions

- **TypeScript strict mode** with `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`. No `any`. No unused imports or locals.
- **React (phone):** functional components, hooks, inline `style={{}}` objects only. No CSS files, no CSS frameworks, no styled-components, no `className`-based styling. Match the existing palette (panels `#1a1b3a`, cold accent `#7ad8ff`, error `#ff6b9d`, dim text `opacity: 0.6` on `#fff`). Touch targets ≥ 44px.
- **Phaser (game):** scenes extend `Phaser.Scene` and live in `scenes/`. Entities are thin classes in `entities/` wrapping a sprite, exposing `.sprite` and any update/behavior methods. Use arcade physics. Static groups for terrain.
- **Wire protocol:** any change to `src/shared/protocol.ts` must be matched by changes in both `src/game/` and `src/phone/` in the same commit. The relay is an **allowlist** forwarder, not a pass-through: peer-forwarding lives in the pure `relayForward()` (`server/relay.ts`, unit-tested), which only knows the `cast-power|puzzle-solved → power-cast` rename (carrying `boosted`) and `planet-complete`. A **new peer-forwarded message type needs a `relayForward` rule** — but still no game logic (the relay never reads state).
- **Powers and puzzles:** each power has (a) a `PowerId` literal in `protocol.ts`, (b) a tile in `src/phone/components/Spellbook.tsx`, (c) a puzzle component under `src/phone/components/puzzles/`, (d) a cast handler in `src/game/scenes/Level.ts`. Wire all four sides in the same change.
- **Puzzle component contract:** `{ onSolved: () => void; onCancel: () => void }`. Optionally accepts difficulty / timing props with defaults. See `QuickMath.tsx` for the template.
- **Entity pattern:** `constructor(scene, x, y)`, holds `.sprite`, exposes `.update()` if it needs per-frame logic. See `Astronaut.ts` and `Enemy.ts`.

## Do / don't

- **Do** extend, don't refactor: when adding a power, model it on Freeze Stars / QuickMath. Don't rework the existing power architecture; it's good enough for the first three powers.
- **Do** keep `src/shared/` minimal — only wire-protocol types.
- **Don't** put game logic in the relay server.
- **Don't** introduce new dependencies casually. The stack is locked: Phaser, React, ws, Vite, tsx, TypeScript. Adding anything else is a real decision.
- **Don't** add CSS files, frameworks, or imports of style files.
- **Do** test pure logic with Vitest (jsdom env, configured in `vitest.config.ts`). Vitest is now a sanctioned dev dependency. Keep tests on framework-free, deterministic units — colocated `*.test.ts` next to the module (see `src/game/progression/`). Don't instantiate Phaser scenes or React components in tests; the playtest gate (M2 "is it fun?") and `npm run typecheck` / `npm run build` cover the framework wiring.
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

This repo uses an orchestrator-worker workflow for non-trivial features. See `.claude/orchestrator.md` for invariants, gates, and operating modes (autonomous vs. high-oversight dispatch); `.claude/agents/` for specialist role prompts; and `.claude/templates/phase-brief.md` for the per-phase brief format. `.claude/orchestrator-prompt.md` is the historical M4 per-scope brief — kept for reference.

## Claude tooling for this repo

Repo-local Claude Code slash commands (`.claude/commands/`) and skills (`.claude/skills/`), vendored so they work in cloud/web sessions and for collaborators. Items marked 💻 **local-only** need local tools (browser MCP, a running dev server, screenshots) and will NOT run in a cloud/web session.

**Commands**

- `/begin` — open a session: orient on branch/commits/open PRs, recap the last `/wrap` log, route into the session-start spec.
- `/wrap` — end-of-session recap: explains the why, builds vocab, active-recall quiz, saves a dated log.
- `/handoff` — generate a paste-able handoff prompt for a fresh session; captures lessons + plan state.
- `/trim-context` — find/fix CLAUDE.md & memory token bloat against the 40k limit; auto-applies fixes.
- `/autonomous-milestone` — autonomously plan/build/test/verify a milestone end-to-end (fits the M0–M6 + orchestrator workflow); uses ultracode multi-agent orchestration. Browser-based verification is optional — the headless `?test=1` bridge covers it.
- `/moonshot` — the inverted twin of `/autonomous-milestone`: a visionary brainstorm that launches agent teams to generate BOLD, outside-the-box ideas for evolving the project, kills the timid/derivative ones (and incoherent fantasies) via a two-sided critic gate, refines survivors, and — only on your go-ahead — captures each as a `docs/ideas/` vision doc + a linked `[Exploration]` backlog stub. Steers per run (tethered → off-leash). Vendored here + global; project-agnostic.
- `/explore-plan` — explore → plan → confirm before any code; proposes 2–3 ranked approaches and waits for a pick.
- `/tdd` — test-first loop: write failing tests, confirm they fail for the right reason, then code until green without editing the tests.
- 💻 `/screenshot-iterate` — **local-only** visual loop: implement → screenshot the running app → compare to a mock → iterate.
- `/verify-planet` — headlessly verify a planet end-to-end (default `planet-1`): boots `?solo=1&test=1` via the pinned `playwright` MCP and runs the `docs/AUTONOMY.md` playbook subset for that planet, emitting per-step PASS/FAIL + a verdict. Needs the dev server running and the `.mcp.json` MCP loaded. *Repo-specific (built here).*

**Skills** (auto-trigger by description, or invoke explicitly)

- `new-power` — scaffold a new astronaut power across every side of the power contract (protocol `PowerId` → Spellbook tile → puzzle component cloned from `QuickMath.tsx` → `App.tsx` `FEEDBACK` + render chain → `castPower()` switch in `Planet.ts`). Invoke with `/new-power` after the power is designed. *Repo-specific (built here).*
- `new-planet` — scaffold a new planet across the planet contract (`planetN.ts` config implementing `PlanetConfig` → colocated `planetN.test.ts` cloned from the `planet3` template → ordered `PLANETS` entry in `registry.ts`, where **array order = progression**; `Boot.ts` picks up theme textures automatically). Invoke with `/new-planet` after the layout is designed. Sibling of `new-power`. *Repo-specific (built here).*
- 💻 `match-the-mock` — **local-only**: implement a UI against a mock/Figma and iterate via screenshots until it matches. Auto-triggering sibling of `/screenshot-iterate`.

**Subagents** (role prompts in `.claude/agents/` — dispatched inline via `subagent_type: "general-purpose"`, NOT registered subagent types; see the file header)

- `power-contract-reviewer` — read-only audit of a diff for the power contract + wire-protocol boundary; PASS/FAIL with `file:line` evidence. Catches the two sides the compiler does *not* guard (the Spellbook tile and the `App.tsx` render `if`-chain). *Repo-specific (built here).*
- `phone-ui-reviewer` — read-only audit of any `src/phone` diff for the conventions `tsc` can't see: inline-style-only (no CSS/`className`), the `#1a1b3a`/`#7ad8ff`/`#ff6b9d` palette, ≥44px touch targets, and the `solvedRef` double-fire guard. PASS/FAIL with `file:line`. Complements `power-contract-reviewer` (wiring) without overlapping it. *Repo-specific (built here).*

**Hooks** (`.claude/settings.json` → scripts in `.claude/hooks/`, shared with collaborators)

- `protocol-boundary-guard` (PreToolUse) — non-blocking reminder when `src/shared/protocol.ts` is edited: update both clients in the same commit; wire the full power contract.
- `typecheck-on-edit` (PostToolUse) — runs `tsc --noEmit` after `*.ts/*.tsx` edits and feeds errors back (blocking; flip the trailing `exit 2`→`exit 0` in the script to make it advisory).
- `colocated-test-on-edit` (PostToolUse) — runs **only** the colocated Vitest sibling of an edited `src/*.ts` (or the test itself); complements `typecheck-on-edit` (types) by catching pure-logic regressions (blocking: `exit 2` feeds the failing test back; fast-exits when no sibling test exists).

**MCP servers** (`.mcp.json`, shared with collaborators)

- `playwright` — project-pinned browser driver (run via `npx @playwright/mcp@latest`, so nothing lands in `package.json`). Makes the `?test=1` headless-bridge playbook (`docs/AUTONOMY.md`) reproducible in cloud sessions / for collaborators; tools surface as `mcp__playwright__*`. Drives `/verify-planet`.

To vendor more of your global commands/skills or brainstorm new repo-specific automations, run `/claudify-repo`.
