# History — Constellation

> How this project got here: a chronological narrative of eras and milestones,
> reconstructed from merged PRs, git history, wrap logs, and ADRs.
> PR numbers, merge dates, tags, and SHAs are **Fact** by construction; rationale
> lines carry explicit labels (**Fact** when quoted from a PR body/ADR, **Inference**
> when reconstructed). Decisions are anchored by ID to the project's decision
> ledger — never restated here. **Append-only:** new milestones are added at the
> bottom (above the Mining coverage footer); existing entries are never rewritten.

## Origin — 2026-04

Constellation started as an asymmetric cozy co-op game for two: a platforming player on the laptop (Phaser), a puzzle player on a phone (React), glued by a tiny `ws` relay. First commit `f503ff3` on 2026-04-24 (`chore(m0): scaffold Vite + Phaser + React skeleton`); the same day landed M1 (room-code handshake via ws relay, `fadc3e3`) and M2 (Freeze Stars power with Quick Math puzzle + the corridor obstacle). No kickoff brief exists in the repo — the pre-PR era is direct commits to main. [Inference — motivation reconstructed from README and commit subjects]

## Era: Spellbook trio (2026-05-12 – 2026-05-14)

M3: from one power to a three-power "spellbook," plus the dev-loop affordances that made later solo iteration possible.

### Spellbook trio complete — 2026-05-13
- **Landed:** Summon Platform (tap-sequence → 5s decaying bridge) and Illuminate (trivia → permanent dark-zone reveal), plus a capstone level sequencing all three powers (PR #1). A phone-side player-specialization idea was captured and deferred to `docs/ideas/specialization.md` (PR #2).
- **Why:** complete the M3 trio alongside Freeze Stars so the co-op loop had real tactical variety [Fact — PR #1 body]

### Cleanup pass + solo dev mode — 2026-05-14
- **Landed:** `?solo=1` mode (skips lobby, keys 1–3 cast powers), win-screen restart button, prose drift fixes (PR #3).
- **Why:** let a single developer iterate without a second device on hand [Inference — PR #3 describes the mechanism, not the motive]

## Era: Galaxy sprint (2026-06-05 – 2026-06-08)

The densest phase: in four days the single level became a galaxy hub with three planets, four powers, persistence, tests, a headless-verification bridge, juice, talents, and deploy scaffolding — most of it built via `/autonomous-milestone` multi-agent workflows [Fact — stated in PR #5, #8, #9, #12, #14, #16 bodies]. Claude Code tooling chores rode along (PRs #7, #10, #17, #18, #19).

### Hub foundation — 2026-06-05
- **Landed:** `Level.ts` refactored into a data-driven `Planet.ts` (per-planet `PlanetConfig`), new `HubScene` with planet-node selection, `PROJECT_GUIDE.md` (PR #4).
- **Why:** generalize the hand-built level so new planets become registry drop-ins [Fact — PR #4 body]

### Persistence + progression spine — 2026-06-05
- **Landed:** versioned `localStorage` save layer, ordered planet registry as the unlock chain, first test runner (Vitest, 18 tests) (PR #5).
- **Why:** fixed the live bug where completing a planet unlocked nothing (unlock state was in-memory only) [Fact — PR #5 body]

### Autonomy test bridge + ICE Planet 2 — 2026-06-05
- **Landed:** flag-gated `window.__constellation` bridge (`?test=1`) for headless gameplay verification, Planet 2 "Stellar Winds" via the registry, kill-floor fix that made pits actually lethal (PR #6).
- **Why:** create the durable seam that makes future gameplay runs autonomously verifiable [Fact — PR #6 body]
- **Tradeoff:** the bridge is a complete no-op without the flag, paying an extra input seam in `Planet` for test-mode safety [Fact — PR #6 body]

### Juice layer + ambience — 2026-06-05 / 2026-06-06
- **Landed:** procedural WebAudio SFX, screen shake, particle bursts, win beat (PR #8); lerp follow-camera + procedural ambient music (PR #12, superseding closed-unmerged PR #11).
- **Why:** the powers cast in near-silence with only a text banner — biggest perceived-quality jump per line [Fact — PR #8 body]
- **Tradeoff:** synthesized everything — zero new dependencies and zero asset files, paying synth-simple sound quality [Fact — PR #8/#12 bodies]

### Planet 3 "Nebula Core" + Phase Dash — 2026-06-05
- **Landed:** a fourth power (Phase Dash: dial-alignment puzzle → 2.5s phase window vs a plasma-curtain hazard) and a third themed planet (PR #9).
- **Why:** prove the `PlanetConfig` + `castPower` exhaustiveness architecture actually extends past the three powers it was designed around [Fact — PR #9 body]

### Talent constellation (accommodation + strength) — 2026-06-06
- **Landed:** M7 phone-side talent tree — solves earn stardust, spent on 8 accommodation talents that make your own puzzles cozier (PR #13); M8 strength talents — partner-directed power boosts riding the cast wire, +3 stardust per first planet clear (PR #14).
- **Why:** the deferred `docs/ideas/specialization.md` idea, unblocked once durable persistence existed [Fact — PR #13 body]
- **Tradeoff:** M7 shipped the accommodation half only; strength waited until PR #14 found a shape that couldn't soft-lock levels (every boost is monotonically more forgiving) [Fact — PR #13/#14 bodies]

### Deploy readiness — 2026-06-07
- **Landed:** `VITE_RELAY_URL` build-time override, relay `GET /healthz` + single-port HTTP/WS, Dockerfile + fly.toml, `smoke:relay` live-socket smoke, `docs/DEPLOY.md` (PR #15).
- **Why:** make Constellation deployable up to the account-bound final step, which stays a one-command human finish [Fact — PR #15 body]

### Themed puzzle variants — 2026-06-08
- **Landed:** M9 per-planet puzzle reskins — `planet-started` protocol message gives the phone planet awareness; ice/nebula palettes layer over puzzles without touching logic (PR #16).
- **Why:** the phone had zero planet awareness; theming needed a full game→phone vertical slice [Fact — PR #16 body]

## Era: Rhythm & quiet polish (2026-06-14 – 2026-06-18)

M10–M11: the first wedge of the project's boldest vision, plus a courtesy the audio layer owed players. A tooling chore (PR #22) rode along.

### Rhythm portrait — 2026-06-14
- **Landed:** M10 per-role solve telemetry (`solveMs` on the wire, save-schema v2) rendered as an end-of-planet portrait card on the laptop (PR #20).
- **Why:** the de-risked first step of `docs/ideas/planet-that-knows-you-two.md` — telemetry-first, generator-later per the vision's locked decisions [Fact — PR #20 body]
- **Tradeoff:** no procedural generation in this cut — the wedge exists to earn trust for it first [Fact — PR #20 body]

### Master-mute toggle — 2026-06-14
- **Landed:** M11 in-game 🔊/🔇 chip on Hub + Planet, persisted mute setting, mute-aware cue/music engines (PR #21).
- **Why:** M5 shipped procedural audio with no way to silence it — awkward the moment you share the game [Fact — PR #21 body]

## Era: Audit & hardening — M13 (2026-07-09 – 2026-07-12)

A full-project audit and six-phase fix plan, then five phases executed in three days. The M12 slot — the procedural-generator spike (PRs #23, #24) — remains open and unmerged as of this backfill, which is why the milestone numbering jumps M11 → M13. [Fact — PR list state]

### Full-project audit — 2026-07-11
- **Landed:** `docs/AUDIT-2026-07-09.md` — ~60 findings with `file:line` evidence and a six-phase fix plan (PR #25).
- **Why:** headline finds included a relay killable by a 4-byte `null` frame, disconnect handling that faked success, and an entire particle-burst layer rendering off-screen since M5 [Fact — PR #25 body]

### Phase 0 — stop the bleeding — 2026-07-11
- **Landed:** relay crash-proofing (`parseClientMsg`, error listeners, `maxPayload`), `npm audit` 7 advisories → 0, smoke-relay orphan fix, hook no longer auto-approves protocol edits (PR #26).

### Phase 1 — co-op survives real life — 2026-07-11
- **Landed:** relay heartbeat/ghost sweep, disconnect surfacing on both clients with same-code rejoin, scene handler lifecycle fixes, typed `peer-disconnected` message, pure `RoomRegistry` extraction (PR #27).
- **Why:** the couch-playtest killers — a silent disconnect faked "Cast!" and a ghost phone permanently blocked rejoin [Fact — PR #25/#27 bodies]

### Phases 2–3 — game feel + honest docs — 2026-07-11
- **Landed:** game-feel correctness fixes (visible bursts, freeze token, post-win guard; PR #28) and a docs truth pass (README/CLAUDE.md/session-start; PR #29).

### Phase 4 — test & CI spine — 2026-07-11
- **Landed:** test files typecheck (`tsconfig.tests.json`), hooks cover `server/`, planet-1 geometry suite, minimal GitHub Actions CI (PR #30) — see D1 in `Decisions.md`.

### Phase 5 + closeout — 2026-07-11 / 2026-07-12
- **Landed:** phone hygiene & polish — StrictMode-safe solves, 44px targets, puzzle-logic tests, `solveMs` capping (PR #31, per D4 in `Decisions.md`); audit item marked Done with Phase 6 deliberately riding the future deploy (PR #32) — see D8 in `Decisions.md`.

## Era: Tooling & wiki tail (2026-07-17 – 2026-07-26)

No gameplay changes — the repo's operational shell caught up while the game waits on its two human-gated next steps (fun-gate playtest, credentialed deploy).

### Global tooling vendored — 2026-07-18
- **Landed:** fleet-wide `/claudify-repo` sweep vendoring global Claude Code commands/skills into `.claude/` (+6,495 lines; PR #33).

### Project wiki initialized — 2026-07-26
- **Landed:** PROJECT.md, HANDOFF.md, Sources.md, and the Decisions.md ledger (D1–D8, including the D7 stack lock) via the project-wiki skill (PR #34).

---

## Mining coverage
_Backfilled 2026-07-26 by project-wiki BACKFILL. Entries after this date are
appended live by MAINTAIN._
- PR title sweep: all 31 merged PRs — no cap
- Deep reads: 20 of 31 PRs (size/label/title signal; cap 20): #1, #3, #4, #5, #6, #8, #9, #12, #13, #14, #15, #16, #20, #21, #25, #26, #27, #30, #33, #34
- Also swept: git log (merges + no-merges, 117 commits), tags (none exist), docs of intent (`docs/AUDIT-2026-07-09.md`, `docs/plans/`, `docs/ideas/`, `docs/m*-plan.md`, `BACKLOG.md`), decision ledger (`Decisions.md`, D1–D8); wrap logs: none found; ADRs: none
- Not mined: issues; closed-unmerged PR #11 (noted only as superseded by #12); open PRs #23/#24 (noted only for the M12 numbering gap)
