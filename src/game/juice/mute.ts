/**
 * Shared master-mute flag for the procedural audio engines.
 *
 * A single module-level boolean that BOTH the SFX engine ({@link ./audio}) and
 * the music engine ({@link ./music}) consult, so one toggle silences everything.
 * It is the second shared seam between the two engines (the first is
 * `webAudioCtor` in audio.ts) — kept in its own leaf module so neither engine
 * "owns" the other's mute.
 *
 * PURE and framework-free: no WebAudio, no persistence, no imports. Importing it
 * is side-effect-free, so it's trivially unit-testable. Persistence lives in
 * {@link ./settings}; the scene toggle ({@link ./muteButton}) wires flag +
 * persistence + the music engine together.
 *
 * The flag is consulted LIVE on each `playCue` / `startMusic`, so flipping it
 * needs no "apply" for SFX (one-shot cues). Music is a continuous loop, so it
 * additionally reconciles via `applyMusicMute()` — see {@link ./music}.
 */

let muted = false;

/** The current master-mute state. Default UNMUTED. */
export function isMuted(): boolean {
  return muted;
}

/**
 * Set the master-mute flag. PURE state only — the SFX engine reads it live, so
 * no apply is needed there; the music engine is reconciled separately by the
 * caller via `applyMusicMute()` (a live loop can't silence itself retroactively).
 */
export function setMuted(value: boolean): void {
  muted = value;
}

/** Test helper: restore the default (unmuted). */
export function resetMuted(): void {
  muted = false;
}
