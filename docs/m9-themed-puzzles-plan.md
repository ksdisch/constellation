# M9 — Themed puzzle variants

Goal: puzzles look different per planet. Today all four phone puzzles render the
same regardless of which planet the laptop is on (BACKLOG flagged the Planet-2
"snowflake-symbol math" follow-up). Make each planet's theme reach the phone and
reskin the puzzles cozily — **without** touching each power's identity colour or
changing planet-1's (default) look.

## The crux

The phone has **zero** planet awareness — it only knows which power the player
tapped. So per-planet theming needs a game→phone signal. Mirror the existing
`planet-complete` round-trip exactly (game `net.send` → relay forward → phone
`onMessage`).

## Plan (sequenced, one commit — protocol touches both clients + relay together)

1. **Protocol** (`src/shared/protocol.ts`): add `PuzzleTheme = 'default' | 'ice'
   | 'nebula'` and a `planet-started` message in **both** directions (C2S from
   game, S2C to phone), carrying `theme`.
2. **Relay** (`server/relay.ts`): forward `planet-started` verbatim (allowlist
   rule, no game logic). Add a `relay.test.ts` case.
3. **Planet config** (`src/game/planets/planet1.ts`): opt-in `puzzleTheme?:
   PuzzleTheme` field. planet2 → `'ice'`, planet3 → `'nebula'`; planet1 omits
   (→ default, unchanged).
4. **Game** (`src/game/scenes/Planet.ts`): `announceTheme()` sends
   `planet-started` with `config.puzzleTheme ?? 'default'`; called in `create()`
   and again on `phone-joined` (covers a phone that joins mid-planet). Solo / no
   phone = harmless no-op send.
5. **Phone palette** (`src/phone/puzzleThemes.ts`, NEW, pure): `paletteFor(theme)`
   → `{ glyph, accent, glow }`. `default` has an **empty glyph + neutral accent**
   so planet-1 puzzles stay pixel-identical. Vitest-covered.
6. **Phone wiring** (`src/phone/App.tsx`): track `puzzleTheme` state, set it on
   `planet-started`, thread `theme` through the uniform `PuzzleArgs` router (the
   existing `{...p}` spread carries it — the `satisfies Record<PowerId,…>` guard
   still holds).
7. **Puzzles** (all four `components/puzzles/*`): accept optional `theme?:
   PuzzleTheme`, apply the palette as a **themed layer** — glyph prefix + accent
   on the header label, and one themed "hero" tint per puzzle (the equation /
   prompt-card border / instruction text / dial frame) — while keeping each
   power's signature colour. Default theme = no glyph, no tint = unchanged.

## Invariants

- **Default unchanged:** every themed touch is gated on a non-empty glyph, so
  `theme === 'default'` (planet-1, solo, pre-join) renders exactly as today.
- **Power identity preserved:** the per-power accent (cyan/purple/yellow/teal,
  shared with the Spellbook tiles + cast feedback) is never overwritten by a
  theme.
- **No new deps; relay stays logic-free; `src/shared/` stays protocol-only.**

## Verification

`typecheck` + `build` + Vitest (new `puzzleThemes.test.ts` + a `planet-started`
relay case) + extend `smoke:relay` to round-trip `planet-started`. Freeze Stars
default look smoke-checked unchanged.
