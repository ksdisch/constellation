# M5 Juice Milestone — Implementation Plan

**Chosen milestone (brainstorm v3 #1, overall 8.7):** Procedural SFX + screen-shake + particle bursts + win-screen beat. Branch: `feat/m5-juice`. Commits: `feat(m5):`.

**Why this shape:** the largest perceived-quality jump per line; makes the *existing* three powers feel powerful; zero protocol / zero deps / zero asset files; smallest blast radius (touches no `src/shared/`, no relay, doesn't alter Freeze Stars cast logic); fully provable on localhost via the `?test=1` bridge. Reusable SFX/particle registry every future power + planet inherits.

## Architecture (3 new modules + 4 touched files)

- `src/game/juice/audio.ts` — **pure synth cue engine.** A `CUES` table mapping each `CueName` → oscillator spec (type/freq/sweep/duration/gain). An injectable `AudioSink` interface; default = lazy WebAudio impl, test = mock. Module singletons: `playCue(name)` (sets `lastCue`, resumes + plays), `getLastCue()`, `getAudioState()`, `setAudioSink()`/`resetAudio()` for tests. No scene needed → this is the Vitest-testable core. No `AudioContext` constructed at import (lazy).
- `src/game/juice/effects.ts` — **pure effect table + scene controller.** `EFFECTS: Record<JuiceEvent, EffectSpec>` (cue + optional shake + optional burst, with colors/counts) is pure data → Vitest-asserted. `JuiceController` (per-scene) applies it: `trigger(event, x, y)` plays the cue, runs `camera.shake`, fires a **one-shot** particle burst with teardown, records `lastBurst`. Exposes `shakeActive` (off the camera) and `lastBurstInfo`.
- `src/game/juice/audio.test.ts` + `src/game/juice/effects.test.ts` — Vitest suites against the pure tables + mock sink.

Touched:
- `src/game/scenes/Boot.ts` — generate one `spark` texture via the existing `makeSolidTexture` chokepoint (tinted per-burst; planet-agnostic).
- `src/game/testBridge.ts` — extend `BridgeState` with `lastSfxCue`, `shakeActive`, `lastBurst`, `audioState`; update `zeroedState()`.
- `src/game/scenes/Planet.ts` — instantiate `JuiceController` in `create()`; trigger on freeze / platform / illuminate / death (`resetAstronaut`) / win (`showWin`); feed the 4 new fields into the `getState` provider; add a tasteful win-screen beat (camera flash + mint burst — **no `timeScale` slow-mo**, deliberately, to dodge the cross-scene physics-teardown footgun the brainstorm flagged).
- `src/game/entities/Astronaut.ts` — `playCue('jump')` on a grounded jump (audio-only; no scene coupling).

## Cues
`jump · freeze · platform · illuminate · death · win` — native WebAudio oscillators, no asset files.

## Autonomy proof (zero human gates)
- **Vitest:** cue-table shape/values; `playCue` invokes the sink + sets `lastCue`; resume called; unknown-cue safety; `EFFECTS` table shape (every event has a cue; colors in 0..0xffffff; counts > 0). Inertness of the bridge without `?test=1` still holds.
- **Headless browser (`?solo=1&test=1`):** drive planet-1; assert `lastSfxCue` flips to `freeze`/`platform`/`illuminate` on each `cast()`, `shakeActive===true` right after a death (omit-platform negative), `lastBurst.kind` matches, and a positive clear sets `lastSfxCue==='win'`. Regression: Freeze Stars still freezes; planet-1/2 still clear; `?solo=1` without `test=1` keeps `window.__constellation` undefined and a canvas present.
- **Honest perceptual caveat:** actual *audibility* of WebAudio under headless automation depends on the autoplay-resume gesture (like Illuminate's perceptual reveal). We prove the cue is **requested** and `resume()` is **invoked**; `audioState` is exposed for observability. Audibility itself is a human check — documented, not asserted green.

## Sequenced steps (each its own commit)
1. `audio.ts` + `audio.test.ts` — pure cue engine. Gate: typecheck + new tests green.
2. `effects.ts` + `effects.test.ts` — effect table + controller. Gate: typecheck + tests green.
3. Boot `spark` texture + `testBridge` BridgeState fields. Gate: typecheck.
4. Wire `Planet.ts` (all 5 events + getState) + `Astronaut.ts` jump cue + win-screen beat. Gate: typecheck + build + full test suite.
5. Live browser verification at `?solo=1&test=1` (truth table) + Freeze/planet-1 regression + no-flag inertness.
6. Adversarial diff review (orchestrated, independent reviewers) → fix findings.
7. Update `docs/AUTONOMY.md` (new bridge fields) + `BACKLOG.md` (move polish item → Done, scoped) + open PR. **Stop before merge to main.**

## Progress
- [ ] 1 audio.ts
- [ ] 2 effects.ts
- [ ] 3 Boot + bridge
- [ ] 4 Planet + Astronaut wiring
- [ ] 5 browser verification
- [ ] 6 adversarial review
- [ ] 7 docs + PR
