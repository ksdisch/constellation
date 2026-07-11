/**
 * Procedural ambient-music engine.
 *
 * Native WebAudio only — no asset files, no dependency — the structural twin of
 * {@link ./audio}. A named {@link TrackName} maps to a {@link TrackSpec}: a
 * looping pentatonic motif of soft, long-enveloped tones over a quiet sustained
 * drone. Generative and asset-free, so it fits the locked, asset-free stack.
 *
 * Testability mirrors the SFX engine. Tracks play through an injectable
 * {@link MusicSink}; the default sink lazily builds a real `AudioContext` + a
 * lookahead scheduler on first `start`, so *importing* this module never touches
 * WebAudio (safe under jsdom/SSR, where there is no `AudioContext` and
 * `startMusic` simply records the track and plays nothing). Tests inject a mock
 * sink and assert the table + dispatch with no real audio and no timers.
 */

import { webAudioCtor } from './audio';
import { isMuted } from './mute';

export type TrackName = 'hub' | 'planet';

/** A generative ambient loop: a pentatonic motif over an optional drone. */
export type TrackSpec = {
  waveform: OscillatorType;
  rootFreq: number; // tonic, Hz
  scale: number[]; // semitone offsets from the tonic (one octave-ish)
  sequence: number[]; // indices into `scale`, the looping motif
  stepSeconds: number; // seconds per motif step
  noteGain: number; // peak gain per melody note (quiet — an ambient bed)
  droneGain: number; // peak gain of the sustained sub-octave drone (0 = none)
};

/**
 * The track registry — the pure, Vitest-asserted contract. Two cozy beds: the
 * hub airy and sparse (a slow, high major-pentatonic wander), the planet warmer
 * and a touch more present (a lower minor-pentatonic roll). Gains are
 * deliberately tiny — this is a background bed under the SFX, not a soundtrack.
 */
export const TRACKS: Record<TrackName, TrackSpec> = {
  hub: {
    waveform: 'sine',
    rootFreq: 261.63, // C4
    scale: [0, 2, 4, 7, 9, 12], // major pentatonic + octave
    sequence: [0, 2, 4, 3, 5, 4, 2, 1],
    stepSeconds: 0.9,
    noteGain: 0.07,
    droneGain: 0.025,
  },
  planet: {
    waveform: 'triangle',
    rootFreq: 196.0, // G3
    scale: [0, 3, 5, 7, 10, 12], // minor pentatonic + octave
    sequence: [0, 2, 1, 3, 2, 4, 3, 1],
    stepSeconds: 0.7,
    noteGain: 0.06,
    droneGain: 0.03,
  },
};

/** A loop target the engine drives. Swappable for tests. */
export interface MusicSink {
  /** (Re)start looping `spec`, replacing any track already playing. */
  start(spec: TrackSpec): void;
  /** Stop and tear down the current loop. Idempotent. */
  stop(): void;
  /** Best-effort context resume (WebAudio autoplay policy). Idempotent. */
  resume(): void;
  /** Underlying context state, for observability ('suspended' | 'running' | …). */
  readonly state: string;
  /** True while a loop is scheduling. */
  readonly playing: boolean;
}

// Standard WebAudio lookahead scheduler constants.
const LOOKAHEAD_MS = 50; // how often the scheduler wakes
const SCHEDULE_AHEAD = 0.2; // seconds of audio scheduled past `currentTime`
// How long a stopped track's master GainNode stays connected before release:
// past the 0.2s drone fade and the tail of any already-scheduled note
// (SCHEDULE_AHEAD + the longest note envelope ≈ 1.05s) — an immediate
// disconnect would audibly clip them.
const MASTER_RELEASE_MS = 1200;

/** Default sink: a real WebAudio graph driving a generative loop + drone. */
class WebAudioMusicSink implements MusicSink {
  private master: GainNode | null = null;
  private drone: OscillatorNode | null = null;
  private droneGainNode: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private spec: TrackSpec | null = null;
  private nextNoteTime = 0;
  private stepIndex = 0;
  private isPlaying = false;

  constructor(private readonly ctx: AudioContext) {}

  get state(): string {
    return this.ctx.state;
  }

  get playing(): boolean {
    return this.isPlaying;
  }

  start(spec: TrackSpec): void {
    this.stopInternal();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    const master = this.ctx.createGain();
    master.gain.setValueAtTime(1, this.ctx.currentTime);
    master.connect(this.ctx.destination);
    this.master = master;
    this.spec = spec;
    this.stepIndex = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.startDrone(spec);
    this.timer = setInterval(() => this.scheduler(), LOOKAHEAD_MS);
    this.isPlaying = true;
  }

  stop(): void {
    this.stopInternal();
  }

  resume(): void {
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** Schedule any melody notes that fall inside the lookahead window. */
  private scheduler(): void {
    const spec = this.spec;
    if (!spec) return;
    while (this.nextNoteTime < this.ctx.currentTime + SCHEDULE_AHEAD) {
      const idx = spec.sequence[this.stepIndex % spec.sequence.length];
      const semitone = spec.scale[idx % spec.scale.length];
      const freq = spec.rootFreq * Math.pow(2, semitone / 12);
      this.scheduleNote(this.nextNoteTime, freq, spec);
      this.nextNoteTime += spec.stepSeconds;
      this.stepIndex += 1;
    }
  }

  /** One soft-enveloped melody tone at `time`. */
  private scheduleNote(time: number, freq: number, spec: TrackSpec): void {
    const master = this.master;
    if (!master) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = spec.waveform;
    osc.frequency.setValueAtTime(freq, time);
    const dur = spec.stepSeconds * 0.92;
    const attack = Math.min(0.12, dur * 0.3);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(spec.noteGain, time + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  /** A sustained sub-octave drone under the motif (skipped if droneGain is 0). */
  private startDrone(spec: TrackSpec): void {
    if (spec.droneGain <= 0) return;
    const master = this.master;
    if (!master) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = spec.waveform;
    osc.frequency.setValueAtTime(spec.rootFreq / 2, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(spec.droneGain, now + 1.2);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    this.drone = osc;
    this.droneGainNode = g;
  }

  private stopInternal(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // The context keeps any CONNECTED node alive, so without this every track
    // switch leaked one master GainNode (F-41). Release after the fades/tails.
    if (this.master) {
      const oldMaster = this.master;
      this.master = null;
      setTimeout(() => oldMaster.disconnect(), MASTER_RELEASE_MS);
    }
    const now = this.ctx.currentTime;
    // Brief fade so switching tracks doesn't click.
    if (this.droneGainNode) {
      try {
        this.droneGainNode.gain.cancelScheduledValues(now);
        this.droneGainNode.gain.setValueAtTime(this.droneGainNode.gain.value, now);
        this.droneGainNode.gain.linearRampToValueAtTime(0.0001, now + 0.2);
      } catch {
        /* context may be closed — nothing to fade */
      }
    }
    if (this.drone) {
      try {
        this.drone.stop(now + 0.25);
      } catch {
        /* already stopped */
      }
      this.drone = null;
    }
    this.droneGainNode = null;
    this.spec = null;
    this.isPlaying = false;
  }
}

let sink: MusicSink | null = null;
let currentTrack: TrackName | null = null;

/**
 * Inject a sink (tests) or drop the current one (pass null). With no sink set,
 * the engine lazily builds a {@link WebAudioMusicSink} on the next start — or,
 * where WebAudio is unavailable, plays nothing while still recording the track.
 */
export function setMusicSink(s: MusicSink | null): void {
  sink = s;
}

function resolveSink(): MusicSink | null {
  if (sink) return sink;
  const Ctor = webAudioCtor();
  if (!Ctor) return null;
  sink = new WebAudioMusicSink(new Ctor());
  return sink;
}

/**
 * Start (or switch to) a named track. Idempotent for the already-playing track,
 * so a scene restart re-calling `startMusic('planet')` keeps the loop seamless
 * rather than restarting it. Records `currentTrack` regardless of audibility so
 * the test bridge can assert the track even when the context is suspended
 * (autoplay policy) or absent (jsdom).
 */
export function startMusic(track: TrackName): void {
  if (track === currentTrack && sink?.playing) return;
  currentTrack = track;
  // Record the active track regardless of audibility (like the SFX cue), then
  // stay silent while muted (M11). Un-muting resumes it via applyMusicMute().
  if (isMuted()) return;
  const s = resolveSink();
  if (!s) return;
  s.start(TRACKS[track]);
}

/** Stop all music and clear the active track. */
export function stopMusic(): void {
  currentTrack = null;
  sink?.stop();
}

/**
 * Reconcile the live music loop with the current mute flag (M11). The SFX engine
 * needs no equivalent — its cues are one-shot and consult the flag live — but a
 * continuous music loop can't silence itself retroactively, so the scene toggle
 * calls this right after flipping the flag:
 *
 *   - muted → STOP the loop (genuine silence + frees the lookahead scheduler).
 *     `currentTrack` is preserved so un-muting can resume the right bed.
 *   - un-muted → (re)start the active track. No-op when nothing is active yet.
 */
export function applyMusicMute(): void {
  if (isMuted()) {
    sink?.stop();
  } else if (currentTrack) {
    const s = resolveSink();
    s?.start(TRACKS[currentTrack]);
  }
}

/**
 * Resume a suspended AudioContext from inside a user gesture. The first Hub
 * visit calls startMusic with no gesture in the call stack, so the context can
 * sit 'suspended' — silent — until the user interacts (F-40); Hub wires this to
 * a one-time pointerdown. No-op when nothing is suspended or no sink exists.
 */
export function resumeMusic(): void {
  sink?.resume();
}

/** The track currently playing (for the test bridge), or null when stopped. */
export function getMusicTrack(): TrackName | null {
  return currentTrack;
}

/** The current audio-context state, or 'unavailable' when no sink exists yet. */
export function getMusicState(): string {
  return sink ? sink.state : 'unavailable';
}

/** Test helper: clear the active track and drop any sink. */
export function resetMusic(): void {
  currentTrack = null;
  sink = null;
}
