# Player Specialization (Phone-Side)

**Status:** Idea — not committed. Blocked on the M2 "is it fun?" playtest and the session persistence decision (both tracked in `BACKLOG.md`).

## Premise

Over time, the phone player specializes their puzzle-solving. Talents change how puzzles play on the phone (length, time, hints, scoring tolerance) — not how powers behave on the laptop side. Two flavors of branch:

- **Strength branch** — lean into what you're already good at (faster trivia, harder math for bigger payoff, etc.)
- **Accommodation branch** — meet you where you struggle (fewer math problems per cast, longer trivia timer, Simon shows the first color free)

Both can coexist. The accommodation branch is the more novel half — most progression systems only reward strengths, and "the game learns what you struggle with and meets you there" aligns with the cozy framing.

## Decisions locked

- **Phone-side only for the first cut.** Talents adjust the puzzle UI (length, time, hints), not power magnitude or duration. This decouples specialization from level design — a talent can't make a freeze last longer or a platform wider. Level tuning stays stable as players progress, and balancing is dramatically simpler.

## Open questions

- **Persistence.** Talents are meaningless without save state. Resolves (or is resolved by) the existing "session persistence" backlog item. Probably the next decision to make.
- **What earns talent points?** Per puzzle solved (finest-grained but encourages grinding); per planet completed (pairs cleanly with the M4 hub); per fast/clean solve (rewards style). Worth deciding before tree shape.
- **Tree shape.** Starting point to argue against: one branch per puzzle type (math / memory / trivia), each branch forks at each tier between strength and accommodation. Under 10 nodes total for v1. Keep it readable on a phone screen.
- **Strength vs accommodation — ship both, or pick one for v1?** Both feels good in theory; one is simpler to balance. If forced to pick one, accommodation is the more distinctive bet.
- **Visibility to the laptop player.** If talents only show up phone-side, half the audience never sees them. Light theming on the laptop (cast effects shift color/intensity based on which branch the phone player has invested in) keeps the system visible without coupling to level design.

## Theming

Constellation theming fits unusually cleanly: talent nodes are stars; the paths between them are constellations the player draws as they invest. Could tie to the planet hub — each planet completed grants a star to spend.

## Dependencies

- M2 "is it fun?" playtest — until the core cast loop is validated, meta-progression is premature.
- Session persistence decision — talents need save state.
- M4 galaxy hub — if talent points are earned per-planet, this couples to hub design.

## Explicitly out of scope (revisit later)

- Talents that change power behavior on the laptop side (longer freeze, wider illuminate, sturdier platform). Re-open only after the phone-side cut ships and is fun.
- Talent trees for the laptop/astronaut player. The asymmetry — phone player specializes mechanically, laptop player improves through skill — is part of the appeal.
- Respeccing, talent reset costs, prestige systems. Defer until there's a real reason to consider them.

## Genre note

Adding talents nudges the project from "cozy asymmetric co-op" toward "cozy co-op with light RPG progression." Still cozy (cf. Stardew, Spiritfarer), but worth being explicit this is a deliberate shift in pitch.
