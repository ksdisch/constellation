---
name: new-power
description: Scaffold a new astronaut power across all sides of Constellation's power contract — the PowerId literal in src/shared/protocol.ts, the Spellbook tile, a phone puzzle component (cloned from the QuickMath template), its registration in App.tsx (FEEDBACK + the render chain), and the cast handler in the game scene. Use when adding a power (e.g. "add a Gravity Well power", "new power that pulls enemies"), after the power's name + puzzle idea are decided.
---

# new-power — scaffold a power end-to-end

Constellation powers have a **multi-sided contract**. Miss a side and the build breaks or the power silently no-ops. This skill walks every side in dependency order. Model the new power on **Freeze Stars** (the simplest end-to-end example) and clone **`QuickMath.tsx`** for the puzzle.

> Assumes the power is already designed: you know its **id** (kebab-case, e.g. `gravity-well`), a **label** (e.g. "Gravity Well"), an **accent color**, and which **puzzle** the phone player solves to cast it. If not, decide those first (per the global "New Feature Mode": describe it, why, how it fits — then scaffold).

## The contract — every side, in order

Work from the shared boundary outward. After each step, `npm run typecheck` (a project hook may run it for you).

### 1. Wire protocol — `src/shared/protocol.ts`
Add the new id to the `PowerId` union:
```ts
export type PowerId = 'freeze-stars' | 'summon-platform' | 'illuminate' | '<new-id>';
```
This is the strict boundary — both game and phone import it. Adding the literal here makes the compiler flag every exhaustive site that hasn't been updated yet (see step 4's `FEEDBACK`), which is your safety net. **This change must land in the same commit as the game + phone changes below.**

### 2. Spellbook tile — `src/phone/components/Spellbook.tsx`
Add an entry to the `POWERS` array (this is plain data — the compiler will NOT remind you):
```ts
{
  id: '<new-id>',
  label: '<Label>',
  subtitle: '<Puzzle name — short how-to>',
  accent: '<#hex>',
},
```
Match the palette (`#7ad8ff` cold, `#9a7aff`, `#f6c971`, error `#ff6b9d`). Touch targets ≥ 44px.

### 3. Puzzle component — `src/phone/components/puzzles/<Name>.tsx`
Clone `QuickMath.tsx` and adapt. Honor the contract exactly:
```ts
interface Props {
  onSolved: () => void;   // call once, on success
  onCancel: () => void;   // call on give-up OR timeout
  // optional difficulty/timing props WITH defaults, e.g. totalSeconds = 30
}
```
Rules: functional component, hooks, inline `style={{}}` only (no CSS files / className / frameworks). Use a `solvedRef` so a timeout after success doesn't double-fire `onCancel` (see QuickMath). Call `onSolved()` exactly once.

### 4. Register on the phone — `src/phone/App.tsx`  ← two edits + an import
- **Import** it alongside the others (lines ~4-6): `import { <Name> } from './components/puzzles/<Name>';`
- **`FEEDBACK`** record (~line 10) — `Record<PowerId, …>`, so tsc **forces** this one:
  ```ts
  '<new-id>': { title: 'Cast!', color: '<#hex>', sub: '<one-line confirmation>' },
  ```
- **Render chain** (~lines 137-145) — this is an `if`/`if` chain, **NOT exhaustive**, so the compiler will NOT remind you. Add:
  ```ts
  if (phase.power === '<new-id>') {
    return <Name onSolved={actions.onSolved} onCancel={actions.onCancel} />;
  }
  ```

### 5. Cast handler — game scene (`src/game/scenes/Planet.ts`)
Find the `castPower(powerId: PowerId)` method (grep `castPower`). Add a `case '<new-id>':` that performs the in-game effect, then triggers juice (`this.juice.trigger(...)`) like the existing cases. If the switch has no `default`, tsc enforces it; if it does, add the case by hand. Also add the solo-mode keybind + the HUD hint string near the other `keydown-ONE/TWO/THREE` handlers so it's testable without the phone.

## Finish
- `npm run typecheck` and `npm run build` must pass.
- **Smoke-test Freeze Stars** still works (regression rule: anything touching `Spellbook.tsx` / `App.tsx` / the cast scene can break it).
- Headless check: drive `?test=1` `window.__constellation` (see `docs/AUTONOMY.md` / `testBridge.ts`).
- Commit with the active milestone prefix, e.g. `feat(mX): <Power Name> power with <puzzle> puzzle`.

## Gotchas
- The **render chain in App.tsx** and the **Spellbook tile** are the two sides the compiler does NOT guard. Double-check them.
- The cast scene is `src/game/scenes/Planet.ts` (pre-M4 docs called it `Level.ts`). Grep `castPower` rather than trusting remembered paths.
- Don't refactor the power architecture — extend it, modeled on the first four powers.
