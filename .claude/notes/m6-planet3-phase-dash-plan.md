# M6 — Planet-3 "Nebula Core" + Phase Dash (plan + progress)

**Branch:** `feat/m6-planet3-phase-dash` · **Started:** 2026-06-05 · built by `/autonomous-milestone`.

Runner-up of brainstorm v3 (8.2). Closes the planet-3 dead-end (visible broken promise:
planet-2 unlocks into "Coming soon") **and** the mechanical gap (every planet is a reskin of
the same 3 powers) by adding a genuinely new 4th power and proving the rigid `PlanetConfig` +
`castPower` exhaustiveness guard (both designed for 3 powers) actually extend.

## Design

### Phase Dash (4th power)
- **Mechanic:** a timed **phase-invulnerability window** (2.5 s) against a new *hazard lane*,
  plus a short forward **dash** speed-boost (~350 ms) for feel. While `phaseActive`, the
  astronaut is immune to the hazard; otherwise contact respawns (same shape as the enemy
  overlap / `Enemy.freeze`).
- **Hazard = full-height "plasma curtain":** narrow (~84 px) but tall (≈ y 90→510). Tallness —
  not width — makes it un-passable: a 245 px running jump can't clear it horizontally *and*
  can't get above it, so any traversal at any reachable height overlaps it. **Robust, no
  reach-math soft-lock** (the planet-2 kill-floor / un-jumpable-pit failure class is avoided).
- **Cozy, no twitch:** the load-bearing part is a *window*, walked through. No timing/precision.
  Addresses the v2 "only power fluffable by a twitch miss" red flag.
- **Accent:** teal `#5eead4` — distinct from freeze cyan / platform purple / illuminate warm.
- **Puzzle: "Phase Align"** — 2×2 grid of 4 dials, each randomized to a non-aligned rotation;
  tap to rotate +90°; solve = all point up. New interaction class (spatial alignment), cozy,
  ≥44 px touch targets, inline-style only. Contract `{ onSolved, onCancel }` + optional
  `totalSeconds`/`dialCount`. 30 s timer → `onCancel` on timeout (matches the other three).

### Planet-3 "Nebula Core" layout (left → right, all four powers)
Canvas 960×540, ground y=520 (surface ≈500), grid tiles x = 32 + 64k.
1. **spawn** x≈70.
2. **Phase curtain** x≈200 (full-height) — PHASE. *First gate → cleanest isolated negative test
   (zero prerequisites).*
3. **Freeze corridor** enemy x≈384 patrol ±140, ceiling — FREEZE (physical, like planet-1/2).
4. **Pit** 576→864 = 288 px (≥260 un-jumpable) + platform drop ~720 — PLATFORM (physical).
5. **Illuminate finale** hidden platform ≈(900,430) under dark zone; goal ≈(905,320) — ILLUMINATE
   (perceptual; collider always exists, like planet-1/2).
- Theme: nebula palette (deep violet bg, magenta/indigo fills) — opt-in, mirrors planet-2 ICE.

## Load-bearing semantics (for AUTONOMY.md honesty)
| Power | Kind | Planet-3 proof |
|---|---|---|
| Phase Dash | **physical** (NEW) | omit → curtain respawns; `phaseActive` flips, `astronautX` passes curtain un-respawned |
| Freeze Stars | physical | inherited (corridor enemy) |
| Summon Platform | physical | inherited (288 px pit) |
| Illuminate | perceptual | inherited (`darkZonePresent` true→false) |

## Build sequence (sequenced commits, conventional `feat(m6):`)
1. **HARD GATE prereq** — convert `App.tsx` puzzle router (bare if-chain `return null`) to an
   exhaustive `Record<PowerId, …> satisfies` map. Lands first so the 4th power can't ship a
   blank phone puzzle screen. Typecheck must stay green (no behavior change yet).
2. **Protocol + phone vertical** — add `'phase-dash'` to `PowerId`; Spellbook tile; `PhaseAlign`
   puzzle component; FEEDBACK entry; router entry. (`Record<PowerId>` makes omissions compile
   errors — the safe part.)
3. **Game core** — `PlanetConfig.hazardLane?` (opt-in, mirrors `theme?`); `phaseActive` state +
   hazard zone + `phase-dash` case in `Planet.castPower`; `Astronaut` speed-multiplier seam;
   solo key `4` + badge.
4. **Juice** — add `phase` cue (audio.ts) + `phase-dash` event (effects.ts EFFECTS table);
   update the two juice tests' name arrays.
5. **Planet-3 content** — `planet3.ts` config (nebula theme + hazardLane) + attach to registry.
6. **Test bridge** — `phaseActive` on `BridgeState` + zeroedState; wire in Planet getState.
7. **Tests** — `planet3.test.ts` (structural + un-jumpable pit + canvas bounds + unlock chain).
8. **Self-gate** — `npm run typecheck && npm run build && npm run test` all green.
9. **Adversarial review** — Workflow fan-out (correctness / soft-lock / wire-coverage /
   exhaustiveness / cozy-regression) → fix findings.
10. **Headless verify** — `?solo=1&test=1`: isolate Phase Dash (negative + positive), Freeze
    regression, full-clear attempt, screenshots.
11. **Docs + report** — AUTONOMY.md (phase fields + curtain semantics), BACKLOG.md (mark
    planet-3 done), this plan's progress, PR.

## Autonomy boundary
Branch/commit/push/PR + local verification OK. **No merge to main / no prod writes** without
explicit go-ahead.

## Progress log — COMPLETE
- [x] Orientation + design + plan (this doc)
- [x] Step 1 — App.tsx exhaustive router (commit 86b8202)
- [x] Step 2 — Phase Dash power: protocol + phone vertical + game core + juice + test bridge (commit 83e052e)
- [x] Step 3 — game core folded into step 2
- [x] Step 4 — juice folded into step 2
- [x] Step 5 — planet-3 content + registry (commit 06c7f92)
- [x] Step 6 — test bridge `phaseActive` folded into step 2
- [x] Step 7 — planet3.test.ts (commit 06c7f92)
- [x] Step 8 — self-gate: typecheck + build + 53 vitest tests green
- [x] Step 9 — adversarial review (workflow w9d2zgoj7): 10 raw → 7 confirmed, all fixed (commit 72959f5)
- [x] Step 10 — headless verify (`?solo=1&test=1`): Phase Dash load-bearing (neg+pos), full planet-3 clear, Illuminate flip, Freeze regression, planet-1 clear; + two-client handshake (phone Phase Align → relay → game cast)
- [x] Step 11 — docs (AUTONOMY, BACKLOG, this plan) + PR

## Final design notes (as shipped)
- Phase Dash accent **teal `#5eead4`**; `phase` cue (audio) + `phase-dash` event (effects, no shake).
- Hazard = translucent teal `Rectangle` with a static arcade body + plasma pulse; overlap respawns unless `phaseActive`.
- planet-3 geometry (all on the 32+64k grid): spawn 64 → curtain `hazardLane {x:620,y:300,w:88,h:420}` → corridor sentry x=300 → degenerate pit (continuous ground) → hidden ledge (880,430) under dark zone → goal (900,300, ground-unreachable, platform-reachable).
- Death cancels the phase window (alpha/immunity/boost reset + phaseToken bump).
