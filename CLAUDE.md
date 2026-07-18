# Constellation — Project Conventions

Asymmetric cozy 2-player co-op. Laptop runs a Phaser platformer (astronaut); phone runs React puzzles (Starglow companion); a small `ws` relay glues them via room codes.

Read [README.md](README.md) for run instructions. Active work and full history live in [BACKLOG.md](BACKLOG.md); the current fix plan is [docs/AUDIT-2026-07-09.md](docs/AUDIT-2026-07-09.md); deferred ideas in [docs/ideas/](docs/ideas/).

## File layout

- `src/game/` — Phaser 3 game client (laptop). Scenes in `scenes/`, entity classes in `entities/`, data-driven planet configs + the ordered registry in `planets/` (array order = progression), persistence/telemetry/portrait in `progression/`, networking in `net/`, the `?test=1` bridge in `testBridge.ts`, bootstrap in `main.ts`. Juice (procedural SFX + music + particle/shake effect tables and the scene-bound `JuiceController` applier) lives in `juice/`.
- `src/phone/` — React 19 phone client. Components in `components/`, puzzles in `components/puzzles/`, the talent constellation (node table + stardust save) in `talents/`, per-planet puzzle palettes in `puzzleThemes.ts`, networking in `net/`, bootstrap in `main.tsx`.
- `src/shared/` — Code shared between game and phone. Only `protocol.ts` lives here (wire message types). Both sides import from `../shared/protocol`. Treat this as a strict boundary — nothing else goes here.
- `server/` — Node + `ws` relay. Allowlist forwarding by room code: the peer-forwarding policy is the pure `relayForward()` (`relay.ts`) and room lifecycle is the pure `RoomRegistry` (`roomRegistry.ts`), both unit-tested. No game logic; never put game logic here.
- `index.html` / `phone.html` — Vite multi-entry HTML files. `index.html` boots the game, `phone.html` boots the phone client.
- `scripts/` — dev harnesses (`smoke-relay.ts`, behind `npm run smoke:relay`). `docs/` — deploy guide, autonomy playbook, audit + fix plan, ideas, per-scope briefs.

## Commands

```bash
npm install              # first-time setup
npm run dev              # vite + relay concurrently (game on :5180, ws on :3081)
npm run typecheck        # tsc --noEmit
npm run typecheck:tests  # tsc -p tsconfig.tests.json (the colocated *.test.ts files, excluded from the base config)
npm run build            # tsc && vite build
npm run preview          # preview built bundle
npm run test             # vitest run (pure-logic unit tests)
npm run test:watch       # vitest in watch mode
npm run smoke:relay      # boot the real relay; assert co-op round-trip + ghost-sweep rejoin
npm run start:relay      # run the relay alone (the container CMD; honors $PORT)
```

Vite binds to `0.0.0.0`; the printed LAN URL is what the phone uses on the same wifi. Playtest remains the integration gate for game feel; Vitest covers pure, framework-free logic (e.g. the progression/persistence module).

## Conventions

- **TypeScript strict mode** with `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`. No `any`. No unused imports or locals.
- **React (phone):** functional components, hooks, inline `style={{}}` objects only. No CSS files, no CSS frameworks, no styled-components, no `className`-based styling. Match the existing palette (panels `#1a1b3a`, cold accent `#7ad8ff`, error `#ff6b9d`, dim text `opacity: 0.6` on `#fff`). Touch targets ≥ 44px.
- **Phaser (game):** scenes extend `Phaser.Scene` and live in `scenes/`. Entities are thin classes in `entities/` wrapping a sprite, exposing `.sprite` and any update/behavior methods. Use arcade physics. Static groups for terrain.
- **Wire protocol:** any change to `src/shared/protocol.ts` must be matched by changes in both `src/game/` and `src/phone/` in the same commit. The relay is an **allowlist** forwarder, not a pass-through: peer-forwarding lives in the pure `relayForward()` (`server/relay.ts`, unit-tested), which only knows the `cast-power|puzzle-solved → power-cast` rename (carrying `boosted` and `solveMs`), `planet-complete`, and `planet-started` (theme). A **new peer-forwarded message type needs a `relayForward` rule** — but still no game logic (the relay never reads state).
- **Powers and puzzles:** each power has (a) a `PowerId` literal in `protocol.ts`, (b) a tile in `src/phone/components/Spellbook.tsx`, (c) a puzzle component under `src/phone/components/puzzles/`, (d) a cast handler in `src/game/scenes/Planet.ts`. Wire all four sides in the same change.
- **Puzzle component contract:** `{ onSolved: () => void; onCancel: () => void }`. Optionally accepts difficulty / timing props with defaults. See `QuickMath.tsx` for the template.
- **Entity pattern:** `constructor(scene, x, y)`, holds `.sprite`, exposes `.update()` if it needs per-frame logic. See `Astronaut.ts` and `Enemy.ts`.

## Do / don't

- **Do** extend, don't refactor: when adding a power, model it on Freeze Stars / QuickMath. Don't rework the existing power architecture; it's good enough for the first four powers.
- **Do** keep `src/shared/` minimal — only wire-protocol types.
- **Don't** put game logic in the relay server.
- **Don't** introduce new dependencies casually. The stack is locked: Phaser, React, ws, Vite, tsx, TypeScript. Adding anything else is a real decision.
- **Don't** add CSS files, frameworks, or imports of style files.
- **Do** test pure logic with Vitest (jsdom env, configured in `vitest.config.ts`). Vitest is now a sanctioned dev dependency. Keep tests on framework-free, deterministic units — colocated `*.test.ts` next to the module (see `src/game/progression/`). Don't instantiate Phaser scenes or React components in tests; the playtest gate (M2 "is it fun?") and `npm run typecheck` / `npm run build` cover the framework wiring.
- **Don't** break Freeze Stars when adding new powers. Manually smoke-test it after touching anything in `Spellbook.tsx`, `App.tsx`, or `Planet.ts`.

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
- **Relay reconnect:** there is no automatic reconnection. The relay heartbeat-sweeps dead sockets (~30s) so a ghost phone frees its room slot; both clients surface socket loss, and the phone offers a one-tap same-code rejoin. Don't rely on persistent reconnection logic in scene code.
- **Phaser body types:** access physics body via `sprite.body as Phaser.Physics.Arcade.Body`. The cast is intentional; the union type makes direct access cumbersome. Established in the codebase.
- **Worktrees:** orchestrator/agent flows sometimes check this repo out as a git worktree under `.claude/worktrees/` (a fresh clone has none). The `.claude/` directory at repo root holds orchestrator scaffolding (this CLAUDE.md, `agents/`, `templates/`, `orchestrator-prompt.md`). Don't confuse it with the worktree machinery.

## Orchestrator-worker pattern

This repo uses an orchestrator-worker workflow for non-trivial features. See `.claude/orchestrator.md` for invariants, gates, and operating modes (autonomous vs. high-oversight dispatch); `.claude/agents/` for specialist role prompts; and `.claude/templates/phase-brief.md` for the per-phase brief format. `.claude/orchestrator-prompt.md` is the historical M4 per-scope brief — kept for reference.

## Claude tooling for this repo

Repo-local Claude Code slash commands (`.claude/commands/`) and skills (`.claude/skills/`), vendored so they work in cloud/web sessions and for collaborators. Items marked 💻 **local-only** need local tools (browser MCP, a running dev server, screenshots, local TTS/voice, or the local `nlm` CLI / NotebookLM MCP) and will NOT run in a cloud/web session.

**Commands**

- `/begin` — open a session: orient on branch/commits/open PRs, recap the last `/wrap` log, route into the session-start spec.
- `/wrap` — end-of-session recap: explains the why, builds vocab, active-recall quiz, saves a dated log.
- `/handoff` — generate a paste-able handoff prompt for a fresh session; captures lessons + plan state.
- `/trim-context` — find/fix CLAUDE.md & memory token bloat against the 40k limit; auto-applies fixes.
- `/autonomous-milestone` — autonomously plan/build/test/verify a milestone end-to-end (fits the M0–M6 + orchestrator workflow); uses ultracode multi-agent orchestration. Browser-based verification is optional — the headless `?test=1` bridge covers it.
- `/brainstorm` — multi-mode structured brainstorm (descendant of `/autonomous-milestone`'s brainstorm). Pick a **mode** first; each flips the scoring function and its two-sided critic gate: **Moonshot** (bold/visionary — the default, the inverted twin: kills timid/derivative), **QuickWin** (cheap high-leverage wins), **Subtract** (removals that improve), **Harden** (break it, then guard), **Premortem** (12-mo death + antibody), **Friction** (where users wince), **Delight** (unrewarded moments), **Positioning** (vs the substitute), **Reach** (how anyone finds it). Blind-parallel lenses → gate → refine → review-first Capture (`docs/ideas/` vision doc + linked backlog stub, per-mode type/size). `/moonshot` is a kept alias = `/brainstorm moonshot`. Vendored here + global; project-agnostic.
- `/explore-plan` — explore → plan → confirm before any code; proposes 2–3 ranked approaches and waits for a pick.
- `/tdd` — test-first loop: write failing tests, confirm they fail for the right reason, then code until green without editing the tests.
- 💻 `/screenshot-iterate` — **local-only** visual loop: implement → screenshot the running app → compare to a mock → iterate.
- `/verify-planet` — headlessly verify a planet end-to-end (default `planet-1`): boots `?solo=1&test=1` via the pinned `playwright` MCP and runs the `docs/AUTONOMY.md` playbook subset for that planet, emitting per-step PASS/FAIL + a verdict. Needs the dev server running and the `.mcp.json` MCP loaded. *Repo-specific (built here).*
- `/claudify-repo` — vendor global commands/skills into this repo and/or brainstorm repo-specific automations.
- `/prompt-optimize` — one-shot prompt rewrite: diagnose, pick a workflow archetype + model + effort, return a ready-to-paste prompt. Advisory only.
- `/reframe-orchestrator` — reframe `.claude/orchestrator.md` into a mode-independent invariants & gates doc; docs-only.
- `/mock-sql-demo` — text self-play mock SQL interview (interviewer + ideal candidate), then a debrief.
- 💻 `/boot_server` — **local-only**: detect how the project is served, start the dev server, open it in Chrome.
- 💻 `/catchup` — **local-only**: mid-session audio catch-up as an MP3 (local TTS); keeps working after.
- 💻 `/envsetup` — **local-only**: open `.env` in the editor + the credential's generation page in Chrome, with a key stub pre-added.
- 💻 `/mock-sql-audio` — **local-only**: full simulated SQL mock interview as an MP3 (local two-voice TTS).
- 💻 `/mock-sql-interview` — **local-only**: live voice mock SQL interview.
- 💻 `/smoke-test` — **local-only**: manual smoke test setup — opens the needed pages in Chrome, checklist saved under `docs/smoke/`.

**Skills** (auto-trigger by description, or invoke explicitly)

- `new-power` — scaffold a new astronaut power across every side of the power contract (protocol `PowerId` → Spellbook tile → puzzle component cloned from `QuickMath.tsx` → `App.tsx` `FEEDBACK` + render chain → `castPower()` switch in `Planet.ts`). Invoke with `/new-power` after the power is designed. *Repo-specific (built here).*
- `new-planet` — scaffold a new planet across the planet contract (`planetN.ts` config implementing `PlanetConfig` → colocated `planetN.test.ts` cloned from the `planet3` template → ordered `PLANETS` entry in `registry.ts`, where **array order = progression**; `Boot.ts` picks up theme textures automatically). Invoke with `/new-planet` after the layout is designed. Sibling of `new-power`. *Repo-specific (built here).*
- 💻 `match-the-mock` — **local-only**: implement a UI against a mock/Figma and iterate via screenshots until it matches. Auto-triggering sibling of `/screenshot-iterate`.
- `artifacts-audit` — audit which engineering artifacts the repo should have; writes `docs/artifacts-plan.md`. Plans only.
- `artifacts-generate` — generate artifacts from `docs/artifacts-plan.md`. Companion to `artifacts-audit`.
- `bug-hunt` — proactive bug hunt: fan out finder agents, adversarially verify findings, ranked triage list.
- `kickoff` — deep discovery interview → approved kickoff brief + phased plan → scaffold a new project + GitHub repo.
- `mini` — kick off a new mini project under `~/Projects/mini/` (short interview + scaffold).
- `project-guide` — comprehensive point-in-time guide to the project (purpose, architecture, history, interview lens); saves a dated file.
- `research-paper` — end-of-project research paper + presenter pack from a completed repo's recorded results; opens a PR for review, never merges.
- `seed-hunt` — end-of-project seed hunt: verify closure, harvest lessons, sweep arXiv, decision brief.
- `ship-and-route` — land outstanding git work behind a review gate, walk the findings, route the next move with a starter prompt.
- 💻 `audio-series` — **local-only**: episodic NotebookLM audio series for an existing notebook (needs `nlm`/NotebookLM MCP).
- 💻 `interview-prep` — **local-only**: init/maintain a NotebookLM interview-prep notebook (needs `nlm`/NotebookLM MCP).
- 💻 `narrate` — **local-only**: turn a short brief into a single-voice MP3 narration (local Kokoro TTS).
- 💻 `nlm-skill` — **local-only**: expert guide for the NotebookLM CLI (`nlm`) and MCP server.
- 💻 `notebook-assist` — **local-only**: refine artifacts / brainstorm / manage sources for an existing NotebookLM notebook.
- 💻 `notebook-init` — **local-only**: initialize a new NotebookLM notebook end-to-end.
- 💻 `notebook-merge` — **local-only**: merge 2+ overlapping NotebookLM notebooks into one unified notebook.
- 💻 `video-series` — **local-only**: episodic NotebookLM video series for an existing notebook (needs `nlm`/NotebookLM MCP).

**Subagents** (role prompts in `.claude/agents/` — dispatched inline via `subagent_type: "general-purpose"`, NOT registered subagent types; see the file header)

- `power-contract-reviewer` — read-only audit of a diff for the power contract + wire-protocol boundary; PASS/FAIL with `file:line` evidence. Catches the two sides the compiler does *not* guard (the Spellbook tile and the `App.tsx` render `if`-chain). *Repo-specific (built here).*
- `phone-ui-reviewer` — read-only audit of any `src/phone` diff for the conventions `tsc` can't see: inline-style-only (no CSS/`className`), the `#1a1b3a`/`#7ad8ff`/`#ff6b9d` palette, ≥44px touch targets, and the `solvedRef` double-fire guard. PASS/FAIL with `file:line`. Complements `power-contract-reviewer` (wiring) without overlapping it. *Repo-specific (built here).*

**Hooks** (`.claude/settings.json` → scripts in `.claude/hooks/`, shared with collaborators)

- `protocol-boundary-guard` (PreToolUse) — non-blocking reminder when `src/shared/protocol.ts` is edited: update both clients in the same commit; wire the full power contract.
- `typecheck-on-edit` (PostToolUse) — runs `tsc --noEmit` **and** `typecheck:tests` after `*.ts/*.tsx` edits inside this repo (absolute paths outside it are skipped) and feeds errors back (blocking; flip the trailing `exit 2`→`exit 0` in the script to make it advisory).
- `colocated-test-on-edit` (PostToolUse) — runs **only** the colocated Vitest sibling of an edited `src/` or `server/` `.ts` (or the test itself); complements `typecheck-on-edit` (types) by catching pure-logic regressions (blocking: `exit 2` feeds the failing test back; fast-exits when no sibling test exists).

**MCP servers** (`.mcp.json`, shared with collaborators)

- `playwright` — project-pinned browser driver (run via `npx @playwright/mcp@latest`, so nothing lands in `package.json`). Makes the `?test=1` headless-bridge playbook (`docs/AUTONOMY.md`) reproducible in cloud sessions / for collaborators; tools surface as `mcp__playwright__*`. Drives `/verify-planet`.

To vendor more of your global commands/skills or brainstorm new repo-specific automations, run `/claudify-repo`.

## Operating Constraints

@.claude/operating-constraints.md
