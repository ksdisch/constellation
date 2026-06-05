import type Phaser from 'phaser';
import { type CueName, playCue } from './audio';

/**
 * Visual + audio juice for gameplay moments.
 *
 * {@link EFFECTS} is a pure table (cue + optional screen shake + optional
 * particle burst) so the *feel* is tuned in one place every planet and future
 * power inherits — and is Vitest-asserted with no scene. {@link JuiceController}
 * is the thin scene-bound applier: it plays the cue, runs `camera.shake`, and
 * fires a ONE-SHOT particle burst that tears itself down.
 *
 * Phaser is imported as a TYPE ONLY, so this module pulls no Phaser runtime into
 * the jsdom test environment (the controller is exercised live in the browser,
 * the table in Vitest).
 */

/** A gameplay moment that gets juiced. */
export type JuiceEvent =
  | 'jump'
  | 'freeze'
  | 'platform'
  | 'illuminate'
  | 'death'
  | 'win'
  | 'phase-dash';

export type ShakeSpec = { duration: number; intensity: number };
export type BurstSpec = {
  count: number;
  color: number;
  speed: number;
  lifespan: number;
  scale: number;
};

export type EffectSpec = {
  cue: CueName;
  shake?: ShakeSpec;
  burst?: BurstSpec;
};

/**
 * The juice registry. Colors match the project palette / per-power identity
 * (freeze cold-blue #7ad8ff, platform purple #9a7aff, illuminate warm #f6c971,
 * death error-pink #ff6b9d, win mint #98ffc8). Shake intensity is deliberately
 * gentle — this is a cozy game, a nudge not a jolt.
 */
export const EFFECTS: Record<JuiceEvent, EffectSpec> = {
  // Jump is audio-only — it fires on every hop, so no shake/burst.
  jump: { cue: 'jump' },
  freeze: {
    cue: 'freeze',
    burst: { count: 14, color: 0x7ad8ff, speed: 130, lifespan: 480, scale: 1.0 },
  },
  platform: {
    cue: 'platform',
    burst: { count: 16, color: 0x9a7aff, speed: 120, lifespan: 460, scale: 1.0 },
  },
  illuminate: {
    cue: 'illuminate',
    burst: { count: 20, color: 0xf6c971, speed: 110, lifespan: 620, scale: 1.1 },
  },
  death: {
    cue: 'death',
    shake: { duration: 260, intensity: 0.012 },
    burst: { count: 18, color: 0xff6b9d, speed: 150, lifespan: 420, scale: 1.0 },
  },
  win: {
    cue: 'win',
    shake: { duration: 220, intensity: 0.008 },
    burst: { count: 28, color: 0x98ffc8, speed: 160, lifespan: 700, scale: 1.2 },
  },
  // Phase-shift slip — teal shimmer, no shake (a cozy slip, not an impact).
  'phase-dash': {
    cue: 'phase',
    burst: { count: 18, color: 0x5eead4, speed: 150, lifespan: 460, scale: 1.0 },
  },
};

export type BurstInfo = { kind: JuiceEvent; count: number };

/**
 * Scene-bound applier of {@link EFFECTS}. One per Planet scene. Plays the cue
 * (module-global audio), runs camera shake, and fires a one-shot particle burst
 * that destroys its emitter once the last particle dies — so a long headless
 * drive never accumulates live emitters.
 */
export class JuiceController {
  private readonly scene: Phaser.Scene;
  private lastBurst: BurstInfo | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Fire the juice for `event`; the burst (if any) is placed at (x, y). */
  trigger(event: JuiceEvent, x = 0, y = 0): void {
    const spec = EFFECTS[event];
    playCue(spec.cue);
    if (spec.shake) {
      this.scene.cameras.main.shake(spec.shake.duration, spec.shake.intensity);
    }
    if (spec.burst) {
      this.burst(event, spec.burst, x, y);
    }
  }

  private burst(event: JuiceEvent, spec: BurstSpec, x: number, y: number): void {
    const emitter = this.scene.add.particles(x, y, 'spark', {
      lifespan: spec.lifespan,
      speed: { min: spec.speed * 0.4, max: spec.speed },
      angle: { min: 0, max: 360 },
      scale: { start: spec.scale, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: spec.color,
      gravityY: 120,
      emitting: false,
    });
    emitter.setDepth(60);
    emitter.explode(spec.count, x, y);
    this.lastBurst = { kind: event, count: spec.count };
    // One-shot teardown: drop the emitter once the last particle has died.
    this.scene.time.delayedCall(spec.lifespan + 120, () => emitter.destroy());
  }

  get lastBurstInfo(): BurstInfo | null {
    return this.lastBurst;
  }

  /** True while the camera shake effect is mid-run (read by the test bridge). */
  get shakeActive(): boolean {
    // Defensive against a torn-down scene: the bridge's getState provider is
    // module-global and may linger after this scene is destroyed (e.g. a driver
    // polling from the Hub), at which point cameras.main is gone.
    return this.scene.cameras?.main?.shakeEffect?.isRunning ?? false;
  }
}
