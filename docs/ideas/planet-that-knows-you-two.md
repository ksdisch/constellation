# The Planet That Knows You Two

**Status:** Idea — not committed. Added by `/moonshot` (tethered run) on 2026-06-07. Backlog stub: `[Exploration] The Planet That Knows You Two` in [`BACKLOG.md`](../../BACKLOG.md). Related: [`specialization.md`](specialization.md) (the phone-side difficulty-tuning idea this partly subsumes).

## Premise

Stop shipping three hand-authored planets and instead **grow** each new planet from a recorded portrait of how *this specific pair* plays. A generator emits a `PlanetConfig` (gate spacing, hazard placement, theme) plus per-role puzzle difficulty from the dyad's measured solve-rhythm, so no two couples' galaxies are ever the same. The galaxy becomes a keepsake of the relationship, not disposable consumed content.

This is a **tethered** moonshot: cozy, asymmetric, co-located 2-player co-op is untouched and arguably deepened. What changes is the *developer's* role — Kyle goes from authoring planets to authoring the **grammar** planets are grown from (the generator's vocabulary of gates, hazards, themes).

## The bold bet

Flips assumption ④ (*all content hand-authored; players only consume*) and softens ⑤ (*the puzzle→power mapping is fixed by design*): the game becomes an **author**, and what it authors is a portrait of one relationship. The wager — that **two people in one room want a galaxy that visibly remembers how they play together more than they want three planets perfectly tuned by Kyle.** "This place is OURS, shaped by us" beats authored polish for an audience of exactly two.

The honest reason a veteran flinches: this dynamites the rigid `PlanetConfig` + the exhaustive 4-sided power contract the whole codebase's safety rests on, and stakes the project's only real gate — "is it fun?" — on a generator instead of Kyle's hand. With an audience of two, one bad planet ruins the evening and there's no other audience to amortize the miss. The whole design below exists to de-risk exactly that.

## Credible first step (the wedge)

**Don't build the generator. Close the telemetry gap first, and make the portrait something you can *see* before anything is generated from it.**

Today `src/game/progression/save.ts` records `completed` as `Record<string, boolean>` — booleans only, zero timing, zero role attribution (there's no `Date.now` anywhere in the scenes). So:

1. Ship **schema v2** of `ProgressState` recording per-attempt, per-role solve durations and explore-vs-solve dwell, behind the existing `migrate()` seam (which `save.ts` literally comments as "the extension seam for future v2") so existing saves upgrade losslessly.
2. Capture it at the two real write sites: `Planet.ts:413` (`markPlanetComplete`) and the phone puzzle `onSolved` path (a new `puzzle-timing` wire field in `protocol.ts`).
3. Surface the recorded rhythm as a **read-only end-of-planet "portrait" card** — a thing the couple can look at and recognize themselves in.

That alone is a believable, self-contained, ~2-year-horizon increment that earns trust for the generator without betting the experience on it. Only once the portrait *feels true* does generation become the next step.

**First wedge area:** `src/game/progression/save.ts` (extend `ProgressState` + `migrate()` to schema v2), instrumented at `Planet.ts:413`, fed by a new `puzzle-timing` field in `src/shared/protocol.ts`.

## Decisions locked

- **Telemetry-first, generator-later.** The portrait/summary card ships and proves itself before any planet is procedurally grown. No generation in the first cut.
- **Lossless migration.** Schema v2 upgrades existing saves via `migrate()`; never throws, never wipes.
- **Tethered on soul.** The laptop/phone/relay shape, the co-located synchronous session, and the cozy no-stakes feel are untouched.
- **Adaptive difficulty leans toward accommodation.** Difficulty stops being a fixed prop-default buried in each puzzle component and becomes a living dial that leans toward whoever needs help — the slower partner is *met*, not gated. This is the coziest possible reading of "adaptive difficulty" (and supersedes the "accommodation branch" half of [`specialization.md`](specialization.md)).

## Open questions

- **What is "solve-rhythm," concretely?** Which signals — per-puzzle duration, retries, explore-vs-solve dwell, role attribution — and how are they smoothed so one bad night doesn't skew the portrait?
- **How much does the generator control vs. hand-authored seeds?** Likely a hybrid: Kyle authors a *grammar* (templates, constraints, theme palettes), the generator only fills parameters. How wide is the generator's latitude?
- **Quality guardrail.** How do we prevent "one bad planet ruins the evening"? Candidate answer: every generated planet must pass the `?test=1` headless solvability/reach-math gate before it's offered, plus a player-facing "reroll this one" affordance.
- **Where does generation run, and is it deterministic?** Client-side from a stored seed (so a galaxy is reproducible/shareable as a seed) vs. opaque.
- **Relationship to session-persistence.** This *requires* persistence and effectively forces the open `[Exploration] Decide on session persistence` decision — does this become the reason to commit to persistence?
- **Does M2 "is it fun?" have to pass first?** Almost certainly yes — meta-systems over the cast loop are premature until the core loop is validated.

## Theming

Constellation theming fits unusually cleanly: the galaxy literally *becomes a portrait of the relationship*. Each completed planet grows a node calibrated to you two, presented as "we made this together." The existing galaxy-hub + constellation motif already gestures at "a homeworld we return to" — this makes that promise real, turning the hub from a level-select into a shared keepsake the couple accretes over time.

## Dependencies

- **M2 "is it fun?" playtest** — until the core cast loop is validated, meta-progression is premature.
- **Session-persistence decision** (open backlog item) — this advances/forces it; the portrait needs save state.
- **The M4–M6 substrate, already shipped:** the versioned `save.ts` + `migrate()` seam; `registry.ts`'s "drop-in" config attachment; the `?test=1` headless bridge (to validate generated planets without a human); and `PlanetConfig` already separating pure data (coords/difficulty) from rendering — the generator's output target already exists as a type.

## Explicitly out of scope (first cut)

- **Full procedural generation.** Deferred behind the telemetry + portrait step. The first cut produces no generated planets.
- **ML/model-based generation.** Start with a constrained *parametric* generator over a hand-authored grammar, not a learned model.
- **Any change to the laptop/phone/relay shape**, the co-located synchronous session, or the no-stakes feel.
- **Sharing or comparing galaxies between couples.** The portrait is private to the pair; no leaderboards, no social layer.

## Genre note

Tethered on soul, but it is a deliberate shift in the developer's relationship to the content: Constellation's content pipeline moves from *hand-authored levels* toward a *generative grammar*, and the player-facing promise gains a new verb — the galaxy is a shared keepsake, not disposable content (also retiring assumption ⑥, transience). Still unmistakably cozy asymmetric 2-player co-op (cf. the Stardew/Spiritfarer register), but worth being explicit that "the game authors a portrait of one relationship" is a bigger pitch than "a co-op platformer with puzzles."
