# M5 polish remainder — camera feel + procedural music

Closes the trimmed M5 "Polish pass" Open item (the SFX/particles/shake subset already
shipped on `feat/m5-juice`). Two additive, asset-free, dependency-free pieces, both
modeled on the existing `src/game/juice/` layer.

## Scope

1. **Procedural ambient music** — a new `src/game/juice/music.ts`, a structural twin of
   `audio.ts`: a pure `TRACKS` table + an injectable `MusicSink` (lazy WebAudio default,
   mock for Vitest, jsdom/SSR-safe). Two generative tracks — `hub` (airy, sparse) and
   `planet` (warmer, grounded) — looping pentatonic motifs over a faint drone. Different
   track on the hub vs. in levels, per the backlog.
2. **Cozy follow camera** — the static camera lerp-follows the astronaut with a generous
   deadzone. Single-screen world + flat-colour background means we widen only the **camera**
   bounds (never `physics.world`) into seamless margin, so reach-math is byte-identical and
   no "void" ever shows.

No protocol / relay / dependency / asset changes. Freeze Stars cast logic untouched.

## Why this is safe (the invariants)

- **Reach-math untouched.** Only `cameras.main` bounds/follow change. The physics world
  bounds (which `Astronaut.setCollideWorldBounds(true)` clamps to) stay 960×540. Camera ≠
  physics.
- **Pixel framing changes by design.** The backlog asks the camera to stop being static, so
  planet-1's view now drifts — that's the feature, not a regression.
- **HUD stays put.** Persistent HUD (planet name, hint, link indicator, SOLO badge) and the
  cast banners get `setScrollFactor(0)` so a panned camera doesn't drift them. The win end-card
  instead `stopFollow()` + `centerOn(480,270)` so its overlay/buttons sit in their designed,
  un-panned spots (and interactive hit areas stay aligned — no scrollFactor input subtlety).
- **Music is pure + testable.** Importing `music.ts` never touches WebAudio; the table is the
  Vitest-asserted contract; the live scheduler runs only in the browser.

## Sequenced steps

1. `audio.ts`: export the existing `webAudioCtor` + `AudioCtor` (DRY — one "is WebAudio here?"
   seam shared with the music engine).
2. `juice/music.ts`: `TRACKS` table, `MusicSink` interface, `WebAudioMusicSink` (lazy ctx +
   lookahead scheduler + soft-envelope notes + drone), module API
   (`startMusic`/`stopMusic`/`getMusicTrack`/`getMusicState`/`setMusicSink`/`resetMusic`).
3. `juice/music.test.ts`: table well-formedness + dispatch (records track w/o sink; mock-sink
   start/stop; same-track idempotence; track switch restarts; state reporting).
4. Wire music: `Hub.create()` → `startMusic('hub')`; `Planet.create()` → `startMusic('planet')`.
5. Test bridge: add `musicTrack` + `musicState` to `BridgeState` (+ zeroed + Planet provider).
6. Camera: in `Planet.create()` widen camera bounds, `setDeadzone`, `startFollow` + initial
   `centerOn`; pin persistent HUD + banners with `setScrollFactor(0)`; in `showWin()`
   `stopFollow()` + `centerOn(480,270)`.
7. Verify: `npm run typecheck` / `npm run test` / `npm run build`, then live `?solo=1&test=1`
   browser drive (camera follows + recenters on win; `musicTrack==='planet'`; Freeze regression
   + planet-1 clear unaffected).
8. Docs: `docs/AUTONOMY.md` (new bridge fields), `BACKLOG.md` (move item to Done), this plan.

## Verification signals (headless bridge)

- `musicTrack === 'planet'` after entering a planet; `musicState` reaches `'running'` after an
  input gesture (audibility itself is perceptual — same caveat as SFX).
- Existing juice + load-bearing assertions still pass (camera change is view-only): planet-1
  positive clear, omit-Freeze negative, Freeze regression, `darkZonePresent` flip.
