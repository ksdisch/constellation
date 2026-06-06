/**
 * Procedural sound-cue engine.
 *
 * Native WebAudio only — no asset files, no dependency. Each named cue maps to a
 * short oscillator "blip" (a {@link CueSpec}). The engine is a module singleton
 * so any code (a scene, an entity) can `playCue('jump')` without threading a
 * reference around.
 *
 * Testability: cues play through an injectable {@link AudioSink}. The default
 * sink lazily builds a real `AudioContext` on first use, so *importing* this
 * module never touches WebAudio — safe under jsdom/SSR, where there is no
 * `AudioContext` and `playCue` simply records the cue and skips playback. Tests
 * inject a mock sink and assert the table + dispatch with no real audio.
 */

export type CueName =
  | 'jump'
  | 'freeze'
  | 'platform'
  | 'illuminate'
  | 'death'
  | 'win'
  | 'phase';

/** A short synthesized blip. `endFreq` (when set) sweeps freq → endFreq. */
export type CueSpec = {
  type: OscillatorType;
  freq: number; // start frequency, Hz
  endFreq?: number; // optional linear sweep target, Hz
  duration: number; // seconds
  gain: number; // peak gain, 0..1
};

/**
 * The cue registry — hand-tuned tiny blips. Frequencies/durations are the pure,
 * Vitest-asserted contract: keep them in a musical range and short, so casts
 * feel snappy rather than droning. This one table is the reusable SFX palette
 * every power and future planet inherits.
 */
export const CUES: Record<CueName, CueSpec> = {
  // light upward hop
  jump: { type: 'sine', freq: 320, endFreq: 540, duration: 0.12, gain: 0.18 },
  // cold shimmer — high and bright
  freeze: { type: 'triangle', freq: 880, endFreq: 1320, duration: 0.22, gain: 0.2 },
  // solid materialize — mid, rising
  platform: { type: 'square', freq: 220, endFreq: 440, duration: 0.18, gain: 0.16 },
  // warm reveal — gentle and soft
  illuminate: { type: 'sine', freq: 520, endFreq: 780, duration: 0.3, gain: 0.18 },
  // harsh down-thunk
  death: { type: 'sawtooth', freq: 300, endFreq: 90, duration: 0.28, gain: 0.22 },
  // bright triumphant rise
  win: { type: 'sine', freq: 660, endFreq: 990, duration: 0.45, gain: 0.24 },
  // ethereal phase-shift zip — quick rising shimmer
  phase: { type: 'triangle', freq: 700, endFreq: 1500, duration: 0.2, gain: 0.2 },
};

/** A play target the engine writes cues to. Swappable for tests. */
export interface AudioSink {
  /** Render one cue. */
  play(spec: CueSpec): void;
  /** Best-effort resume (WebAudio autoplay policy). Idempotent. */
  resume(): void;
  /** Underlying context state, for observability ('suspended' | 'running' | …). */
  readonly state: string;
}

export type AudioCtor = new () => AudioContext;

/**
 * The platform's AudioContext constructor, or null where WebAudio is absent
 * (jsdom/SSR). Exported so the sibling music engine shares one "is WebAudio
 * here?" seam rather than duplicating the feature check.
 */
export function webAudioCtor(): AudioCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: AudioCtor;
    webkitAudioContext?: AudioCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

/** Default sink: a real WebAudio context rendering each cue as an oscillator. */
class WebAudioSink implements AudioSink {
  constructor(private readonly ctx: AudioContext) {}

  get state(): string {
    return this.ctx.state;
  }

  resume(): void {
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  play(spec: CueSpec): void {
    const { ctx } = this;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.freq, now);
    if (spec.endFreq !== undefined) {
      osc.frequency.linearRampToValueAtTime(spec.endFreq, now + spec.duration);
    }
    // Quick attack, then decay toward (near) silence by the end of the blip.
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(spec.gain, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + spec.duration);
  }
}

let sink: AudioSink | null = null;
let lastCue: CueName | null = null;

/**
 * Inject a sink (tests) or drop the current one (pass null). With no sink set,
 * the engine lazily builds a {@link WebAudioSink} on the next cue — or, where
 * WebAudio is unavailable, plays nothing while still recording the cue.
 */
export function setAudioSink(s: AudioSink | null): void {
  sink = s;
}

function resolveSink(): AudioSink | null {
  if (sink) return sink;
  const Ctor = webAudioCtor();
  if (!Ctor) return null;
  sink = new WebAudioSink(new Ctor());
  return sink;
}

/**
 * Play a named cue. Records it as `lastCue` *regardless* of audibility, so the
 * test bridge can assert the cue was requested even when the audio context is
 * suspended (autoplay policy) or absent (jsdom).
 */
export function playCue(name: CueName): void {
  lastCue = name;
  const s = resolveSink();
  if (!s) return;
  s.resume();
  s.play(CUES[name]);
}

/** The most recently requested cue (for the test bridge). */
export function getLastCue(): CueName | null {
  return lastCue;
}

/** The current audio-context state, or 'unavailable' when no sink exists yet. */
export function getAudioState(): string {
  return sink ? sink.state : 'unavailable';
}

/**
 * Clear only the recorded cue, keeping the resolved sink (and its live audio
 * context) intact. Scenes call this on (re)start so a stale `lastCue` — e.g.
 * 'win' from the previous run — does not bleed into the next planet's bridge
 * reads. Distinct from {@link resetAudio}, which also drops the sink.
 */
export function resetLastCue(): void {
  lastCue = null;
}

/** Test helper: clear the recorded cue and drop any sink. */
export function resetAudio(): void {
  lastCue = null;
  sink = null;
}
