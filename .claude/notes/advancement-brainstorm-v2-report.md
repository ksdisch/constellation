# Constellation — Advancement Brainstorm v2 (2026-06-05)

Run: workflow `constellation-advancement-brainstorm-v2`, task `wnzr8wzt2`, 41 agents.
Context: Progression Spine + persistence + Vitest already SHIPPED (PR #5). Autonomy ceiling raised
(browser MCP + computer-use + external-service automation now available).

## Ranked slate (adversarial 3-judge panel, overall /10)

| # | Candidate | Overall | Signif | Autonomy | Verif | Vision | Safety | Scope |
|---|-----------|---------|--------|----------|-------|--------|--------|-------|
| 1 | **Autonomy Substrate** (test-bridge + load-bearing prover + seeded puzzles) | **7.67** | 7.33 | 9.0 | 8.67 | 7.33 | 8.0 | 6.33 |
| 2 | **Draw-a-Constellation** (gesture-cast 4th power) | 7.33 | 8.0 | 7.33 | 7.67 | **9.33** | 7.0 | 6.67 |
| 3 | **Starglow Beam** (continuous 2-way streaming companion) | 7.33 | **9.0** | 6.67 | 7.33 | 9.0 | 6.0 | 5.0 |
| 4 | **Phase Dash** (safest 4th power, reach-math proof) | 6.67 | 6.67 | 8.0 | 7.67 | 6.67 | 7.67 | 7.33 |
| 5 | **Ship It** (GitHub Pages deploy + live smoke gate) | 6.33 | 6.67 | 7.67 | 8.0 | 4.67 | 7.0 | 6.33 |
| 6 | **Composable PlanetConfig v2 + ICE Planet 2** | 5.67 | 7.67 | 6.0 | 5.33 | 7.33 | 4.33 | 4.33 |
| 7 | **Constellation Cloud** (Supabase cloud-save + leaderboard) | 5.67 | 7.0 | 5.67 | 8.0 | 4.67 | 7.0 | 4.0 |

## Lead recommendation

**Fold "Autonomy Substrate + Planet 2 'Stellar Winds'" into one run.** Best end-to-end autonomy at
meaningful significance, zero human gates, proof runs entirely on localhost. The substrate makes the
game *assertable* (read `won`/`enemy.isFrozen`/`loadProgress()` off a flag-gated `window.__constellation`
bridge instead of guessing at pixels); Planet 2 is the owner's named baseline and a clean registry drop-in
that gives the substrate immediate player-facing payoff. Planet 2 phases marked droppable if the run gets tight.

Key cross-cutting finding: **5 of 7 candidates silently assume a test-bridge exists.** Building it first
de-risks every future gameplay run.

---

(Full synthesizer report follows.)

## Full synthesizer report

### The strategic choice
The real tension is **significance vs. clean autonomous verifiability-and-no-human-gates**. The toolkit got much stronger: the game is now browser-drivable at `?solo=1`, so "verifiable" no longer means "pure localStorage logic only" — it means real gameplay smoke, two-context relay round-trips, even stood-up cloud backends. But two new failure modes appear: (1) browser-driving live physics is the flakiest part of the toolkit — so the highest-value move is making the game *assertable* before betting a feature's proof on raw driving; and (2) external services reintroduce human walls (Supabase signup email, OAuth, free-tier card gates). The cleanest big win threads between these: build the verification substrate first (or fold it into the first feature), keep the proof in-repo on localhost, and reserve cloud/deploy for a later run once their human gates are scouted.

### Closing recommendation
**Pick the fold: Autonomy Substrate + Planet 2 "Stellar Winds" as one run.** Best end-to-end autonomy at meaningful significance — the workflow stands up its own verification seam, then uses it to PLAN→IMPLEMENT→TEST→VERIFY→REPORT a real player-facing content win with structured boolean proof, on localhost, with zero human gates. If you want the safest possible run instead, do Substrate alone and let Planet 2 be a fast follow-on. Avoid leading with any external-service play for THIS run — they reintroduce the human walls the meta-goal warns about.

### Autonomous build sketch for the top pick
- **Branch:** `feat/m5-substrate-planet2` off `main`. Commits `feat(m5):`. No push without per-push OK.
- **Agents** (all general-purpose, role rules inline): Recon (map scene state to expose, find the real gravity constant) → Bridge+seeding → Content (planet2Config + ice theme + registry) → Verification (drive browser MCP, run smoke truth table, screenshots).
- **Phases & gates:**
  1. Recon → state-surface spec + gravity constant confirmed.
  2. Bridge + seeding → `testBridge.ts` wired in Boot/Planet/Hub create(); puzzle logic extracted. Gate: typecheck + build + test (18 + new) green.
  3. Smoke driver on planet-1 → positive solve asserts `won` + `completed['planet-1']`; 3 omit-one negatives each assert `won` false AND the specific blocker persists AND a respawn counter proves a real attempt. Gate: 4-row truth table green.
  4. Planet 2 authoring → config + ice theme + registry. Gate: typecheck+build+structural Vitest; unlock-chain asserted via pure `markPlanetComplete` round-trip.
  5. Planet 2 browser proof → clear at `?solo=1&test=1`, assert win + `completed['planet-2']`; reload, assert planet-3 unlocked.
  6. Regression smoke → re-run Freeze Stars / planet-1 to honor "don't break Freeze Stars."
  7. Report + `docs/AUTONOMY.md`.
- **The one decision before writing the prompt:** fold (substrate + Planet 2) vs. split (substrate first). Fold maximizes the autonomy demo; split minimizes single-run risk. Recommendation: attempt the fold with Planet 2 (phases 4–5) marked droppable.

### Top red flags by candidate (autonomy-skeptic)
- **Substrate:** raw-WASD platforming via MCP key-presses is the top flake source (add a deterministic input seam); negative passes must prove a *real attempt happened* (respawn counter), not just "still false"; the committed driver is realistically an MCP playbook, not a re-runnable Playwright suite (stack locked).
- **Draw-a-Constellation:** continuous synthetic `pointermove` is the flakiest automation pattern; App.tsx phone-side routing is NOT exhaustive (silent `null` fallback) so the compile gate won't catch a missing phone branch; reach math only sound against the real gravity constant; zero in-repo precedent for pointer-drag.
- **Starglow Beam:** two-context LIVE-relay 15Hz streaming proof is the flakiest mode; widest blast radius (protocol + both clients + relay + new entity + fog + lift + new phone phase); largest single-run surface — high implement-but-not-prove risk.
- **Phase Dash:** solo mode boots to Hub not a Planet (needs a `?planet=`/`?solo=dash` shortcut); a running jump already crosses ~245px so the gap must be tuned > standing-jump yet < dash-jump or the negative case cheeses; cozy-regression — the only power that can be fluffed by a twitch miss.
- **Ship It:** the public URL is a `?solo=1` single-player demo, NOT online co-op (HTTPS page can't reach ws://localhost — mixed-content); Vite base subpath is a silent-404 footgun for phone.html; weak vision-fit (pure plumbing).
- **PlanetConfig v2:** the ONLY candidate that rewrites `PlanetScene.create()` (every power + win→unlock depend on it) — highest blast radius, risks "don't break Freeze Stars"; "fully data-driven today" premise is partly false (ground/ceiling/enemy y, patrol range hardcoded).
- **Constellation Cloud:** one-time human wall (first-ever Supabase signup email/OAuth); cross-context anonymous-identity continuity is fragile (must persist+reinject the refresh token, easy false-green); a public fastest-clear leaderboard injects competitive framing into a cozy co-op game; clear_ms is client-spoofable; L-scope = plausibly 2 runs.
