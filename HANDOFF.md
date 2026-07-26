# HANDOFF.md

_Last updated: 2026-07-26_

## What was just done
- 2026-07-26: Project wiki initialized (PROJECT.md, HANDOFF.md, Sources.md, Decisions.md) via the project-wiki skill.
- 2026-07-17: Vendored global Claude Code commands/skills/hooks into the repo via `/claudify-repo` (PR #33) — CLAUDE.md gained the tooling reference section.
- 2026-07-11: M13 hardening completed — audit Phases 0–5 all landed (PRs #26–#31); the BACKLOG hardening item was marked Done with Phase 6 explicitly deferred to the deploy (PR #32).

## Where things stand
The game is playable end-to-end (hub + three planets + four powers + talents + rhythm portrait + procedural audio/mute) and freshly hardened: the 2026-07-09 audit's Phases 0–5 closed the relay crash vectors, disconnect blindness, the invisible-particles and freeze-truncation bugs, the doc drift, the test-spine gaps (CI now runs on every PR), and the phone hygiene findings — with StrictMode on and 204 Vitest green. Nothing is in flight. The two remaining BACKLOG items are both gated on Kyle rather than code: the never-run fun-gate playtest and the account-bound public deploy (which carries audit Phase 6 with it).

## Immediate next move
Run the fun-gate playtest (one full co-op session with the partner). It has never run in the project's life, the whole asymmetric premise lives or dies on it, and the audit's Phase 2 specifically fixed the feel bugs that made running it earlier pointless.

## Open questions / blockers
- Audit decisions still open (see Decisions.md): Prettier adoption (D2), jump feel `isDown` vs `JustDown` (D3), PROJECT_GUIDE.md full regen vs the landed banner-only (D5), Docker slim approach (D6 — only matters at deploy).
- Playtest is human-gated (partner availability); deploy is account-gated (Fly + itch.io credentials).

## Files touched recently
- `CLAUDE.md` — tooling reference section vendored in PR #33 (last substantive change in the repo)
- `BACKLOG.md` — hardening item moved to Done with full phase-by-phase record (PRs #31–#32)
- `src/phone/**` — audit Phase 5 hygiene (StrictMode, solvedRef guards, palette/touch-target/aria fixes, `solveMs` cap)
- `.github/workflows/` — minimal CI gate added in audit Phase 4 (decision D1)
