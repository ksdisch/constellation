# M8 — Strength talents: invest in your partner

Build plan for the **strength branch** of Player Specialization (`docs/ideas/specialization.md`),
picked by the `/autonomous-milestone` workflow. M7 shipped the *accommodation* half (phone-only,
"make MY puzzle cozier"); this milestone ships the deferred *strength* half and finally makes
talents **visible to both players**.

## The core idea

Accommodation and strength are a deliberate asymmetry that fits the cozy co-op pitch:

- **Accommodation (M7):** spend stardust → **your own** puzzles get cozier (fewer problems,
  longer timers, hints). Self-directed.
- **Strength (M8):** spend stardust → **your partner's** powers get stronger on the laptop
  (longer freeze / platform / phase window). Partner-directed — an altruistic investment the
  laptop player actually *feels*.

This is the design doc's "lean into your strength … for a bigger payoff," with the payoff being
the laptop-side magnitude (not a phone-only economy loop).

## Why this is now safe to couple to the laptop

M7 deliberately stayed phone-only because the doc warned that power-magnitude coupling could
break level balance. It doesn't here: every strength boost is **monotonically more forgiving**
for the astronaut — a longer freeze, a longer-lived platform, a longer phase window all make an
obstacle *easier* to clear, never harder. They cannot soft-lock a level, so no level needs
re-tuning. Magnitudes live on the **game** side (where the duration constants already are); the
phone only signals *which* powers are boosted.

## Scope (v1)

### Strength branch — 3 nodes, one per duration-based power (cost ★2 each)

| Node | Power | Effect (game-side) |
|------|-------|--------------------|
| Deep Freeze      | freeze-stars    | Freeze holds enemies **5s** instead of 3s |
| Lasting Platform | summon-platform | Platform stays **8s** instead of 5s |
| Long Phase       | phase-dash      | Phase Dash window lasts **4s** instead of 2.5s |

**Illuminate has no strength node** (documented asymmetry): it's a *permanent, binary* reveal
with no duration axis to scale. It keeps its two accommodation nodes. This mirrors the project's
existing "each planet emphasizes a different subset of powers" honesty.

`TalentNode` gains `kind: 'accommodation' | 'strength'`; the 8 existing nodes are `accommodation`.
A new pure `strengthFor(unlocked) → Set<PowerId>` (twin of `tuningFor`) reports which powers are
boosted.

### Wire — `boosted` rides the cast

Rather than a separate loadout-sync, the boost is a property of the cast that triggered it:

- `puzzle-solved` / `cast-power` (C2S) and `power-cast` (S2C) gain `boosted?: boolean`.
- Phone computes `boosted = strengthSet.has(power)` and sends it on solve.
- Relay forwards the field (the relay is an **allowlist**, not a pass-through — it explicitly
  maps `cast-power|puzzle-solved → power-cast`, so the field must be threaded; still no game
  logic added).
- Game `castPower(powerId, boosted)` picks the longer duration **and** shows an amplified banner
  (`DEEP FREEZE!`) + a bigger particle burst — the laptop-visible payoff.

### Per-planet stardust — `planet-complete` (game→phone)

Closes the hub→economy loop the doc flagged:

- New `planet-complete` message: C2S from the game (in `showWin()`) → relay → S2C to the phone.
- Phone earns **★3** on receipt, persists, and shows a transient "★ +3 — planet cleared" toast.

### Test bridge

`BridgeState` gains `lastCastPower` + `lastCastBoosted` so a headless driver can assert the
boost crossed the wire and the game branched on it.

## Blast radius

- **Edit** `src/shared/protocol.ts` — `boosted?` on three message types + new `planet-complete`.
- **Edit** `server/server.ts` — thread `boosted` through cast forwarding; forward `planet-complete`.
- **Edit** `src/phone/talents/talents.ts` — `kind`, 3 strength nodes, `strengthFor()`.
- **Edit** `src/phone/App.tsx` — send `boosted`; handle `planet-complete` → earn + toast.
- **Edit** `src/phone/components/TalentTree.tsx` — kind badge so strength reads distinctly.
- **Edit** `src/game/scenes/Planet.ts` — `castPower(id, boosted)`, boosted durations + banners,
  send `planet-complete` on win, bridge fields.
- **Edit** `src/game/juice/effects.ts` — optional burst-scale for a boosted cast (pure table
  untouched; controller scales locally).
- **Edit** `src/game/testBridge.ts` — `lastCastPower` / `lastCastBoosted`.
- **New** tests: `strengthFor` mapping; `planet-complete` earn path is covered by the existing
  `earnStardust` tests (amount param already supported).

## Deliberate cuts (documented, not accidental)

- **No Illuminate strength node** — no duration axis (above).
- **No phone-puzzle "harder for payoff"** — the original framing made strength *also* harden your
  own puzzle. Dropped: it collides with accommodation overrides on the same puzzle (which wins if
  you own both?) for no real gain. The cost of a strength node is its stardust + the opportunity
  cost vs. accommodation; that's tension enough.
- **No separate cosmetic "branch theming"** — magnitude *is* the visibility. A boosted cast's
  louder banner + burst is the laptop seeing the investment, with no extra coupling.

## Verification

- `npm run typecheck`, `npm run build`, `npm run test` (existing 90 + new `strengthFor` tests).
- Exhaustiveness preserved: the `PUZZLES` router and Spellbook still `satisfies Record<PowerId,…>`;
  `boosted` is optional everywhere (default false ⇒ byte-identical current behavior).
- No browser-automation MCP in the cloud session and the `?test=1` bridge is game-side; per
  project convention, React wiring is covered by typecheck + build, and the new bridge fields let
  a manual `?test=1` run assert the boosted-cast coupling. Manual two-device smoke remains the
  integration gate.

## Progress

- [x] Plan doc + scope cuts
- [ ] Strength core: `talents.ts` `kind` + nodes + `strengthFor` + tests
- [ ] Boosted-cast wire: protocol + relay + game + phone + bridge
- [ ] Per-planet stardust: `planet-complete` + phone earn + toast
- [ ] TalentTree kind badge
- [ ] typecheck / build / test green; adversarial review
- [ ] BACKLOG + AUTONOMY docs updated; PR opened
