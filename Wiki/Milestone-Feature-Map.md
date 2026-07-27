# Milestone-Feature-Map

## Purpose
Answers the question "what did M5 through M9 actually ship, what was deliberately cut from each, and what decisions shaped those cuts?" for anyone picking up the codebase. No single plan doc covers more than one milestone; this synthesizes across all four plan docs, the BACKLOG Done entries, `Decisions.md`, and `docs/AUDIT-2026-07-09.md`.

## Key understanding

### M5 — Deploy Readiness + Juice + Autonomy Substrate (shipped 2026-06-05 to 2026-06-07)

**Fact** (all plan docs + BACKLOG Done): M5 was not one milestone but three shipped in two days: the Juice layer (procedural SFX, particles, shake), the Autonomy Substrate (`?test=1` bridge + kill-floor fix), and Deploy Readiness (env relay URL, container, health endpoint, `docs/DEPLOY.md`). The BACKLOG records them under separate items but all share the M5 label.

**Fact** ([`docs/m5-deploy-plan.md`](../docs/m5-deploy-plan.md)): Two specific blockers drove M5 Deploy: (1) both net clients hardcoded `ws://<page-host>:3081` — wrong for a deployed client on a TLS host — and (2) the relay served no HTTP, so platform health checks failed.

**Fact** ([`docs/m5-deploy-plan.md`](../docs/m5-deploy-plan.md), BACKLOG): M5 deliberately stopped before the actual `fly deploy` / itch.io upload. The autonomy boundary was everything up to the credentialed finish — that step requires Kyle's Fly + itch.io accounts and remains Open in BACKLOG today.

**Fact** ([`docs/m5-deploy-plan.md`](../docs/m5-deploy-plan.md)): Deliberate cuts: relay-only container (clients are static files, hosted separately); `tsx` kept at runtime (stack is locked — no esbuild compile step); Cloudflare Durable Objects left as a noted non-goal (needs a different adapter). The Docker slim question (move `tsx` to deps vs. esbuild-bundle) was deferred — it is `Decisions.md` D6, still Unresolved.

**Fact** (BACKLOG / [`docs/AUDIT-2026-07-09.md`](../docs/AUDIT-2026-07-09.md) §Phase 6): `docs/DEPLOY.md` is accurate (the audit's "What's genuinely solid" section called it out by name). But Phases 0–5 of the audit found Phase 6 findings (F-34 multi-machine HA risk, F-37 role-blind forwarding, F-38b join-rate-limit, F-39 structured logs, F-60 image size, F-61 Dockerfile polish) that deliberately ride the actual deploy — captured as Decision D8 (Approved, 2026-07-11).

---

### M7 — Player Specialization: Accommodation Branch (shipped 2026-06-06)

**Fact** ([`docs/m7-talents-plan.md`](../docs/m7-talents-plan.md), BACKLOG): M7 shipped only the accommodation half of the specialization design — 8 talent nodes (4 mini-branches, one per puzzle, tier-1 + tier-2) that tune the phone player's own puzzles cozier. Phone-side only; no protocol, relay, or game changes.

**Fact** ([`docs/m7-talents-plan.md`](../docs/m7-talents-plan.md)): The strength branch was a deliberate scope cut with a documented rationale: strength needs power-magnitude coupling to the laptop side, and with no laptop payoff, "make my puzzle harder" has no coherent reward. The plan doc's own words: "v1 ships the accommodation half (the doc's own 'more distinctive bet'). Strength is a documented follow-up that re-opens only after laptop-side coupling is on the table."

**Fact** ([`docs/m7-talents-plan.md`](../docs/m7-talents-plan.md)): Stardust earn mechanism chose per-solve (+1 per `onSolved`) over per-planet-cleared because per-planet would require a new `game→phone` wire message — a protocol change outside the phone-only boundary. The per-solve path needed zero new wire messages.

**Fact** (BACKLOG M7 note): Full unlock costs ★12 = 12 puzzle solves, designed so grinding is not a concern (you only solve during real co-op play).

---

### M8 — Strength Talents: Partner-Directed Power Boosts (shipped 2026-06-06)

**Fact** ([`docs/m8-strength-talents-plan.md`](../docs/m8-strength-talents-plan.md), BACKLOG): M8 shipped the deferred strength half — 3 nodes (Deep Freeze / Lasting Platform / Long Phase, ★2 each), one per duration-based power. Illuminate has no strength node by design: a permanent binary reveal has no duration axis to scale.

**Fact** ([`docs/m8-strength-talents-plan.md`](../docs/m8-strength-talents-plan.md)): The key safety argument for coupling: every strength boost is monotonically more forgiving for the astronaut — a longer freeze, platform, phase window never hard-blocks a level — so no level required re-tuning. This is what made M7's deliberate scope cut safe to open.

**Fact** ([`docs/m8-strength-talents-plan.md`](../docs/m8-strength-talents-plan.md), [`src/shared/protocol.ts`](../src/shared/protocol.ts)): The boost rides the cast, not a separate loadout-sync. `puzzle-solved` / `cast-power` carry `boosted?: boolean`; the phone sets it from `strengthFor(unlocked).has(power)`; the relay passes it through `relayForward`; the game picks the longer duration and renders an amplified banner + burst. An un-invested cast is byte-identical to pre-M8 (optional field, default false).

**Fact** ([`docs/m8-strength-talents-plan.md`](../docs/m8-strength-talents-plan.md), BACKLOG): M8 also introduced `planet-complete` (game→phone), giving the phone +3 stardust per planet clear. This closed the hub→economy loop the design doc had flagged: per-solve earn (M7) gave grinding, per-planet earn needed the wire, which M8 added anyway.

**Fact** (BACKLOG M8 note): M8 also discovered and corrected that the relay is an allowlist forwarder — not the "opaque pass-through" CLAUDE.md had claimed — and extracted the pure `server/relay.ts:relayForward()` for unit testing. This correction rippled into Phase 3 of the M13 audit's docs fix.

**Fact** ([`docs/m8-strength-talents-plan.md`](../docs/m8-strength-talents-plan.md)): Deliberate cuts: no Illuminate strength node (no duration axis). No "harder puzzle for payoff" (collides with accommodation overrides for no gain; the stardust + opportunity cost is the tension). Magnitude is the visibility — no separate cosmetic theming.

---

### M9 — Themed Puzzle Variants (shipped 2026-06-08)

**Fact** ([`docs/m9-themed-puzzles-plan.md`](../docs/m9-themed-puzzles-plan.md), BACKLOG): M9 gave the phone per-planet puzzle awareness. Before M9, the phone only knew which power was tapped — it had zero planet context. The crux was that per-planet theming needed a game→phone signal.

**Fact** ([`docs/m9-themed-puzzles-plan.md`](../docs/m9-themed-puzzles-plan.md), [`src/shared/protocol.ts`](../src/shared/protocol.ts)): The signal mirrors `planet-complete` exactly: new `planet-started` message (both C2S and S2C) carrying `PuzzleTheme = 'default' | 'ice' | 'nebula'`. Planet 2 sends `'ice'`, Planet 3 sends `'nebula'`, Planet 1 omits (→ default, pixel-identical to pre-M9). The relay forwards `planet-started` via a one-line `relayForward` rule.

**Fact** ([`docs/m9-themed-puzzles-plan.md`](../docs/m9-themed-puzzles-plan.md)): Planet sends `announceTheme()` in `create()` AND on `phone-joined` — the second call covers a phone that joins mid-planet or rejoins after a disconnect.

**Fact** ([`docs/m9-themed-puzzles-plan.md`](../docs/m9-themed-puzzles-plan.md), [`src/phone/puzzleThemes.ts`](../src/phone/puzzleThemes.ts)): Default theme has an empty glyph so every themed touch is gated on `glyph !== ''` — planet-1 (default) renders exactly as before. Theming is cosmetic only; puzzle logic (Simon colours, trivia questions, math) is untouched.

**Fact** ([`docs/m9-themed-puzzles-plan.md`](../docs/m9-themed-puzzles-plan.md)): Deliberate cut: Spellbook tiles stay power-coloured (theming the between-puzzle menu was out of scope).

---

### What M5–M9 collectively changed about the wire protocol

**Fact** ([`src/shared/protocol.ts`](../src/shared/protocol.ts), plan docs): The protocol grew across these milestones in a clear pattern — each addition was optional or server-originated, so un-upgraded clients remain byte-identical:
- M5: `cast-power` / `puzzle-solved` / `power-cast` established (no new optional fields yet)
- M8: `boosted?: boolean` and `solveMs?: number` added to cast messages; new `planet-complete` (game→phone)
- M9: new `PuzzleTheme` type; new `planet-started` message (both directions)
- M13 (audit Phase 1): `peer-disconnected` server-originated message (replaced the `{type:'error'}` substring hack)

**Inference** (reading all plan docs together): The pattern of optional fields with default-false / default-'default' was a deliberate extensibility choice. Each plan doc notes "byte-identical to pre-M[N]" or "backward compatible" for its additions. This was not accidental — it is the mechanism that let four milestones land without breaking the prior game state or requiring simultaneous client upgrades.

---

### Open decisions as of M13 close

**Fact** ([`Decisions.md`](../Decisions.md)): Four decisions from the audit remain Unresolved: D2 (Prettier), D3 (jump feel: `isDown` vs `JustDown`), D5 (PROJECT_GUIDE.md full regen), D6 (Docker slim approach). These are explicitly deferred — not forgotten — with notes on what each depends on.

## Sources
- [`docs/m5-deploy-plan.md`](../docs/m5-deploy-plan.md)
- [`docs/m7-talents-plan.md`](../docs/m7-talents-plan.md)
- [`docs/m8-strength-talents-plan.md`](../docs/m8-strength-talents-plan.md)
- [`docs/m9-themed-puzzles-plan.md`](../docs/m9-themed-puzzles-plan.md)
- [`docs/AUDIT-2026-07-09.md`](../docs/AUDIT-2026-07-09.md)
- [`Decisions.md`](../Decisions.md)
- [`BACKLOG.md`](../BACKLOG.md) (Done entries for M5–M9)
- [`src/shared/protocol.ts`](../src/shared/protocol.ts)

## Uncertainties & contradictions

**Unresolved** — D2 (Prettier), D3 (jump feel), D5 (PROJECT_GUIDE full regen), D6 (Docker slim): all noted in `Decisions.md` as awaiting a call from Kyle.

**Unresolved** — M12 (procedural planet generator): PRs #23/#24 are open and unmerged as of the wiki's last review. The M13 audit was named M13 specifically to avoid colliding with the M12 slot. Status of those PRs is not tracked here.

## Related pages
- [Puzzle-and-Planet-Data-Model](Puzzle-and-Planet-Data-Model.md)
- [Deploy-And-Ops](Deploy-And-Ops.md)
- [History](History.md)

## Relevance to current work
The two open BACKLOG items — the fun-gate playtest and the credentialed deploy — both depend on work from this milestone cluster. The playtest is finally worth running after M13 Phase 2 fixed the feel bugs. The deploy path is documented in `docs/DEPLOY.md` and requires completing D6 and the Phase 6 audit items (D8) alongside it.

_Last reviewed: 2026-07-26_
