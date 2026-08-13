# HANDOFF.md

_Last updated: 2026-08-13_

## What was just done
- 2026-08-13: Review follow-ups from PR #40 landed (docs + phone copy + a tightened planet-3 test) — `docs/AUTONOMY.md` / `/verify-planet` now say the platform arms on the first **landing**, `Decisions.md` gained D9, this file was refreshed.
- 2026-08-13: Planet-1's pit fixed (PR #40, `8318f82`) — a summoned platform holds indefinitely and starts its 5000ms life on the astronaut's first **landing**, not at drop time. Adversarial review forced two in-loop fixes: the landing gate itself (a side clip used to burn the bridge) and planet-3's `platformDrop.x` 730 → 750 (a never-mounted ledge is now permanent, and at 730 it pinned a blocked astronaut inside the plasma curtain). Suite 204 → 207.
- 2026-07-26: Project wiki initialized (PROJECT.md, HANDOFF.md, Sources.md, Decisions.md) via the project-wiki skill.
- 2026-07-17: Vendored global Claude Code commands/skills/hooks into the repo via `/claudify-repo` (PR #33) — CLAUDE.md gained the tooling reference section.
- 2026-07-11: M13 hardening completed — audit Phases 0–5 all landed (PRs #26–#31); the BACKLOG hardening item was marked Done with Phase 6 explicitly deferred to the deploy (PR #32).

## Where things stand
The game is playable end-to-end (hub + three planets + four powers + talents + rhythm portrait + procedural audio/mute) and freshly hardened: the 2026-07-09 audit's Phases 0–5 closed the relay crash vectors, disconnect blindness, the invisible-particles and freeze-truncation bugs, the doc drift, the test-spine gaps (CI now runs on every PR), and the phone hygiene findings — with StrictMode on and 207 Vitest green. Nothing is in flight. Four BACKLOG items are Open. Two are gated on Kyle rather than code: the never-run fun-gate playtest and the account-bound public deploy (which carries audit Phase 6 with it). Two are new code work surfaced by three AI-pilot playtests (2026-08-11 ×2, 2026-08-12): the support seat is blind to world state, and planet-1 punishes the pair for standing still to coordinate (the pit half of that is already fixed by PR #40; the sentry-band half remains).

## Immediate next move
Run the fun-gate playtest (one full co-op session with the partner). It has never run in the project's life, the whole asymmetric premise lives or dies on it, and the pit blocker that made the three AI-pilot runs unwinnable is now fixed. The two pilot-surfaced improvements (support-seat visibility, the sentry-band hold) are the obvious code work if the playtest stays gated — but the playtest should tell us which of them actually matters.

## Open questions / blockers
- Audit decisions still open (see Decisions.md): Prettier adoption (D2), jump feel `isDown` vs `JustDown` (D3), PROJECT_GUIDE.md full regen vs the landed banner-only (D5), Docker slim approach (D6 — only matters at deploy).
- Playtest is human-gated (partner availability); deploy is account-gated (Fly + itch.io credentials).

## Files touched recently
- `src/game/scenes/Planet.ts` — arm-on-landing platform lifetime, `refreshPlatform()` on re-cast (PR #40)
- `src/game/planets/planet3.ts` + `planet3.test.ts` — `platformDrop.x` 730 → 750 with three clearance tests pinning the narrow window (PR #40)
- `docs/AUTONOMY.md`, `.claude/commands/verify-planet.md` — the arm-on-landing sharp edge, re-documented
- `CLAUDE.md` — tooling reference section vendored in PR #33
- `BACKLOG.md` — hardening item moved to Done with full phase-by-phase record (PRs #31–#32)
- `src/phone/**` — audit Phase 5 hygiene (StrictMode, solvedRef guards, palette/touch-target/aria fixes, `solveMs` cap)
- `.github/workflows/` — minimal CI gate added in audit Phase 4 (decision D1)
