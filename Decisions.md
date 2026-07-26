# Decisions

| ID | Decision | Status | Date | Source/Rationale |
|----|----------|--------|------|-----------------|
| D1 | Add a minimal CI workflow (npm ci → typecheck → typecheck:tests → vitest → build → smoke:relay) and amend session-start's no-CI rule to "don't extend beyond this" | Approved | 2026-07-11 | Audit decision #1 (F-32); landed in Phase 4, PR #30 |
| D2 | Adopt Prettier (config-only, no plugins) | Unresolved | 2026-07-09 | Audit decision #2 — pure consistency; strict tsc already covers correctness |
| D3 | Jump feel: keep hold-to-bunny-hop (`isDown`) or switch to `JustDown` | Unresolved | 2026-07-09 | Audit decision #3 (F-43) — pure game-feel call, flagged for Kyle |
| D4 | Cap `solveMs` at the puzzle's effective talent-tuned timer (vs wall-clock) when the phone backgrounds mid-puzzle | Approved | 2026-07-11 | Audit decision #4 (F-50); landed in Phase 5, PR #31, via the `PUZZLE_TIMER_SECONDS` map |
| D5 | PROJECT_GUIDE.md: banner-only interim landed (Phase 3, PR #29); full regenerate (~L effort) still undecided | Unresolved | 2026-07-11 | Audit decision #5 — BACKLOG lists the regen as an open decision |
| D6 | Docker slim approach: move `tsx` to deps (simple) vs esbuild-bundle (smallest) | Unresolved | 2026-07-09 | Audit decision #6 (F-60); only matters at deploy time — decide with Phase 6 |
| D7 | Stack locked to Phaser 3, React 19, `ws`, Vite, tsx, TypeScript — new dependencies are a real decision, not routine | Approved | pre-2026-07 | CLAUDE.md "Do / don't"; reaffirmed by the audit's "no new dependencies" stance |
| D8 | Audit Phase 6 (deploy hardening: F-34, F-37, F-38b, F-39, F-60, F-61) rides the actual public deploy rather than landing standalone | Approved | 2026-07-11 | BACKLOG deploy item note + PR #32; the phase's gate needs the deploy context anyway |
