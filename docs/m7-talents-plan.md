# M7 — Player Specialization (phone-side talent constellation)

Build plan for the `Player Specialization` idea (`docs/ideas/specialization.md`), picked by
the `/autonomous-milestone` workflow. The companion design doc holds the *why*; this doc holds
the *what* and tracks build progress.

## Scope (v1)

A phone-side meta-progression layer: the puzzle player grows a personal **constellation** of
talent stars that make their puzzles cozier. **Phone-side only** — talents tune the puzzle UI
(length / time / hints), never power magnitude on the laptop. This honors the locked decision
in the design doc and keeps level balancing stable.

### Deliberate scope cuts (documented, not accidental)

- **Accommodation branch only.** The design doc's *strength* branch ("harder math for a bigger
  payoff") needs power-magnitude coupling to the laptop side — which is explicitly out of scope
  for the phone-only cut. With no payoff hook, "make my puzzle harder" has no coherent reward,
  so v1 ships the **accommodation** half (the doc's own "more distinctive bet"). Strength is a
  documented follow-up that re-opens only after laptop-side coupling is on the table.
- **Earn stardust per puzzle solved** (+1 on `onSolved`). The doc lists three earning options;
  per-solve is the only one that needs **no protocol change and no laptop coupling** — the phone
  already owns the solve event. "Per planet cleared" would need a new `game→phone` wire message;
  noted as a follow-up. Grinding isn't a concern: you only solve puzzles during real co-op play.

### Talent tree (8 nodes, 4 mini-branches, ≤2 tiers — readable on a phone)

| Node | Puzzle | Tier / cost | Requires | Effect (override) |
|------|--------|-------------|----------|-------------------|
| Fewer Sums    | QuickMath    | 1 / ★1 | — | `problemCount` 3→2 |
| Unhurried     | QuickMath    | 2 / ★2 | Fewer Sums   | `totalSeconds` 30→45 |
| Shorter Tune  | TapSequence  | 1 / ★1 | — | `sequenceLength` 5→4 |
| First Light   | TapSequence  | 2 / ★2 | Shorter Tune | `revealFirst` true (first color shown as a hint) |
| More Thinking | Trivia       | 1 / ★1 | — | `timerSeconds` 30→45 |
| Second Chance | Trivia       | 2 / ★2 | More Thinking| `forgiveMistakes` true (wrong answer no longer resets to Q1) |
| Calm Dials    | PhaseAlign   | 1 / ★1 | — | `dialCount` 4→3 |
| Extra Beat    | PhaseAlign   | 2 / ★2 | Calm Dials   | `totalSeconds` 30→45 |

Full unlock = ★12 = 12 puzzle solves. Persisted in `localStorage` so it accumulates across
sessions.

## Blast radius (all phone-side; no `src/shared/`, `server/`, or `src/game/` changes)

- **New** `src/phone/talents/talents.ts` — `TALENTS` node table + `PuzzleOverrides` type +
  pure `tuningFor()` (unlocked set → per-power prop deltas). Mirrors `src/game/progression/`.
- **New** `src/phone/talents/save.ts` — versioned, guarded, never-throws `localStorage`
  persistence (twin of `src/game/progression/save.ts`): `loadTalents` / `saveTalents` /
  `earnStardust` / `unlockTalent` / `canUnlock`.
- **New** `src/phone/talents/{save,talents}.test.ts` — Vitest (pure logic, jsdom localStorage).
- **New** `src/phone/components/TalentTree.tsx` — the constellation screen (inline styles,
  palette-matched, ≥44px targets).
- **Edit** `src/phone/components/Spellbook.tsx` — a footer "✦ Constellation ★N" button.
- **Edit** `src/phone/App.tsx` — hold talent state, earn on solve, `tuningFor` → spread into the
  exhaustive `PUZZLES` router (kept uniform so the `satisfies Record<PowerId,…>` guard stays),
  new `talents` phase.
- **Edit** `src/phone/components/puzzles/TapSequence.tsx` — `revealFirst?: boolean` (default
  false ⇒ current behavior).
- **Edit** `src/phone/components/puzzles/Trivia.tsx` — `forgiveMistakes?: boolean` (default
  false ⇒ current behavior).

## Verification

- `npm run typecheck`, `npm run build`, `npm run test` (new talent tests + the existing 61).
- Exhaustiveness preserved: the `PUZZLES` router still `satisfies Record<PowerId, …>`; the two
  new puzzle props default to the current behavior (backward compatible).
- No browser-automation MCP in the cloud session, and the `?test=1` bridge is game-side only;
  per project convention, React component wiring is covered by `typecheck` + `build` (no React
  instantiation in tests). Manual phone smoke remains the integration gate.

## Progress

- [x] Plan doc + design scope cuts
- [ ] Pure core: `talents.ts` + `save.ts` + tests (green)
- [ ] `TalentTree.tsx` + Spellbook footer
- [ ] `App.tsx` wiring + puzzle prop additions
- [ ] typecheck / build / test all green; adversarial review
- [ ] BACKLOG + docs updated; PR opened
