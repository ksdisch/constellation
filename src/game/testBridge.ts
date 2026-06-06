import type { PowerId } from '../shared/protocol';

/**
 * Flag-gated test bridge.
 *
 * Everything in this module is a COMPLETE NO-OP unless the page is loaded with
 * `?test=1`. In production (no flag) `getTestInput()` returns null, no
 * `window.__constellation` object is ever created, and `setBridgeProviders` /
 * `ensureBridge` do nothing — so the game behaves exactly as it does today.
 *
 * The bridge exposes a thin, deterministic seam for an end-to-end driver:
 * synthetic astronaut input, a snapshot of scene state, power casting, and
 * planet navigation. No `any`; the window field is typed via `declare global`.
 */

/** Synthetic per-frame astronaut input, OR-ed into real keyboard input. */
export type AstronautInput = { left: boolean; right: boolean; jump: boolean };

/** A flat, serializable snapshot of the live scene for assertions. */
export type BridgeState = {
  sceneKey: string;
  won: boolean;
  enemyFrozen: boolean;
  astronautX: number;
  astronautY: number;
  respawnCount: number;
  platformCount: number;
  darkZonePresent: boolean;
  // True while a Phase Dash window is active (astronaut immune to the hazard
  // lane). Lets a headless driver prove Phase Dash is load-bearing.
  phaseActive: boolean;
  unlockedPlanets: string[];
  completed: Record<string, boolean>;
  // Juice observability (M5). lastSfxCue is the most recently requested sound
  // cue (set even when audio is silent/suspended); shakeActive is true mid
  // camera-shake; lastBurst is the most recent particle burst; audioState is the
  // WebAudio context state ('suspended' | 'running' | 'unavailable') for the
  // honest autoplay-resume caveat — audibility itself is perceptual.
  lastSfxCue: string | null;
  shakeActive: boolean;
  lastBurst: { kind: string; count: number } | null;
  audioState: string;
  // Music observability (M5). musicTrack is the active ambient track ('hub' |
  // 'planet' | null); musicState is the WebAudio context state of the music
  // engine — same perceptual autoplay-resume caveat as audioState.
  musicTrack: string | null;
  musicState: string;
};

/** The object exposed on `window.__constellation` when `?test=1`. */
export type ConstellationBridge = {
  enabled: true;
  input: AstronautInput;
  resetInput: () => void;
  getState: () => BridgeState;
  cast: (powerId: PowerId) => void;
  startPlanet: (id: string) => void;
};

declare global {
  interface Window {
    __constellation?: ConstellationBridge;
  }
}

/** True iff the page was loaded with `?test=1`. */
export function isTestMode(): boolean {
  return (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('test') === '1'
  );
}

/** Module-singleton synthetic input — all false at rest. */
const testInput: AstronautInput = { left: false, right: false, jump: false };

/**
 * The synthetic input singleton iff in test mode, else null. Astronaut.update()
 * ORs this into the real keyboard reads; a null return makes it fully inert.
 */
export function getTestInput(): AstronautInput | null {
  return isTestMode() ? testInput : null;
}

/** A zeroed snapshot used by the default no-op getState provider. */
function zeroedState(): BridgeState {
  return {
    sceneKey: '',
    won: false,
    enemyFrozen: false,
    astronautX: 0,
    astronautY: 0,
    respawnCount: 0,
    platformCount: 0,
    darkZonePresent: false,
    phaseActive: false,
    unlockedPlanets: [],
    completed: {},
    lastSfxCue: null,
    shakeActive: false,
    lastBurst: null,
    audioState: 'unavailable',
    musicTrack: null,
    musicState: 'unavailable',
  };
}

/**
 * Live providers, swapped in by whichever scene is active. They default to
 * safe no-ops so a `cast`/`startPlanet`/`getState` call before any scene wires
 * itself up is harmless rather than a crash.
 */
const providers: {
  getState: () => BridgeState;
  cast: (id: PowerId) => void;
  startPlanet: (id: string) => void;
} = {
  getState: zeroedState,
  cast: () => {},
  startPlanet: () => {},
};

/**
 * Merge scene-specific provider implementations into the bridge. No-op unless
 * in test mode, so production scenes that call this (guarded) do nothing.
 */
export function setBridgeProviders(
  p: Partial<{
    getState: () => BridgeState;
    cast: (id: PowerId) => void;
    startPlanet: (id: string) => void;
  }>,
): void {
  if (!isTestMode()) return;
  if (p.getState) providers.getState = p.getState;
  if (p.cast) providers.cast = p.cast;
  if (p.startPlanet) providers.startPlanet = p.startPlanet;
}

/**
 * Install the stable `window.__constellation` bridge object exactly once. No-op
 * unless in test mode (and a real window exists). The object delegates through
 * the mutable `providers` so scenes can re-wire behavior without replacing it.
 */
export function ensureBridge(): void {
  if (!isTestMode() || typeof window === 'undefined') return;
  if (window.__constellation) return;
  window.__constellation = {
    enabled: true,
    input: testInput,
    resetInput() {
      testInput.left = testInput.right = testInput.jump = false;
    },
    getState() {
      return providers.getState();
    },
    cast(id) {
      providers.cast(id);
    },
    startPlanet(id) {
      providers.startPlanet(id);
    },
  };
}
