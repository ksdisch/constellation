import { describe, it, expect, beforeEach } from 'vitest';
import {
  CUES,
  playCue,
  getLastCue,
  getAudioState,
  resetAudio,
  resetLastCue,
  setAudioSink,
  type CueName,
  type CueSpec,
  type AudioSink,
} from './audio';
import { setMuted, resetMuted } from './mute';

/**
 * Pure cue-engine contract. No real WebAudio (jsdom has none); a mock sink
 * stands in so we can assert the table values and the dispatch path without
 * sound. Audibility itself is perceptual (autoplay-resume needs a gesture) and
 * is documented in docs/AUTONOMY.md, not asserted here.
 */

const CUE_NAMES: CueName[] = [
  'jump',
  'freeze',
  'platform',
  'illuminate',
  'death',
  'win',
  'phase',
];

class MockSink implements AudioSink {
  played: CueSpec[] = [];
  resumeCount = 0;
  private current = 'suspended';
  get state(): string {
    return this.current;
  }
  resume(): void {
    this.resumeCount += 1;
    this.current = 'running';
  }
  play(spec: CueSpec): void {
    this.played.push(spec);
  }
}

describe('CUES table', () => {
  it('has a spec for every cue name', () => {
    for (const n of CUE_NAMES) expect(CUES[n]).toBeDefined();
  });

  it('every spec is well-formed: valid type, positive short duration, sane gain', () => {
    const validTypes = new Set(['sine', 'square', 'sawtooth', 'triangle']);
    for (const n of CUE_NAMES) {
      const c = CUES[n];
      expect(validTypes.has(c.type)).toBe(true);
      expect(c.freq).toBeGreaterThan(0);
      expect(c.duration).toBeGreaterThan(0);
      expect(c.duration).toBeLessThan(2); // short blips, not drones
      expect(c.gain).toBeGreaterThan(0);
      expect(c.gain).toBeLessThanOrEqual(1);
      if (c.endFreq !== undefined) expect(c.endFreq).toBeGreaterThan(0);
    }
  });
});

describe('playCue dispatch', () => {
  beforeEach(() => {
    resetAudio();
    resetMuted();
  });

  it('records the last cue even with no sink (jsdom has no WebAudio)', () => {
    expect(getLastCue()).toBeNull();
    playCue('freeze');
    expect(getLastCue()).toBe('freeze');
  });

  it('routes the matching spec to an injected sink and resumes it', () => {
    const mock = new MockSink();
    setAudioSink(mock);
    playCue('win');
    expect(mock.played).toHaveLength(1);
    expect(mock.played[0]).toEqual(CUES.win);
    expect(mock.resumeCount).toBe(1);
    expect(getLastCue()).toBe('win');
  });

  it('getAudioState reflects the injected sink, and resume flips it to running', () => {
    const mock = new MockSink();
    setAudioSink(mock);
    expect(getAudioState()).toBe('suspended');
    playCue('jump');
    expect(getAudioState()).toBe('running');
  });

  it('reports unavailable when no sink is set', () => {
    resetAudio();
    expect(getAudioState()).toBe('unavailable');
  });

  it('resetLastCue clears the cue but keeps the sink alive (scene-restart path)', () => {
    const mock = new MockSink();
    setAudioSink(mock);
    playCue('win');
    expect(getLastCue()).toBe('win');
    resetLastCue();
    expect(getLastCue()).toBeNull();
    // Sink survived, so the context state is still readable (not 'unavailable').
    expect(getAudioState()).toBe('running');
    // …and the next cue still routes to the same sink.
    playCue('jump');
    expect(mock.played).toHaveLength(2);
  });

  it('muted: records the cue but routes NOTHING to the sink (silence, M11)', () => {
    const mock = new MockSink();
    setAudioSink(mock);
    setMuted(true);
    playCue('freeze');
    // The cue is still recorded (the bridge can prove the cast happened)…
    expect(getLastCue()).toBe('freeze');
    // …but the sink saw nothing — no play, and not even a resume.
    expect(mock.played).toHaveLength(0);
    expect(mock.resumeCount).toBe(0);
  });

  it('un-muting resumes playback on the next cue', () => {
    const mock = new MockSink();
    setAudioSink(mock);
    setMuted(true);
    playCue('jump');
    expect(mock.played).toHaveLength(0);
    setMuted(false);
    playCue('jump');
    expect(mock.played).toHaveLength(1);
    expect(getLastCue()).toBe('jump');
  });
});
