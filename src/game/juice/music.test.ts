import { describe, it, expect, beforeEach } from 'vitest';
import {
  TRACKS,
  startMusic,
  stopMusic,
  applyMusicMute,
  resumeMusic,
  getMusicTrack,
  getMusicState,
  resetMusic,
  setMusicSink,
  type TrackName,
  type TrackSpec,
  type MusicSink,
} from './music';
import { setMuted, resetMuted } from './mute';

/**
 * Pure track-engine contract. No real WebAudio (jsdom has none); a mock sink
 * stands in so we can assert the table and the dispatch path without sound or
 * timers. Audibility itself is perceptual (autoplay-resume needs a gesture) and
 * is documented in docs/AUTONOMY.md, not asserted here.
 */

const TRACK_NAMES: TrackName[] = ['hub', 'planet'];

class MockMusicSink implements MusicSink {
  started: TrackSpec[] = [];
  stopCount = 0;
  playing = false;
  private current = 'suspended';
  get state(): string {
    return this.current;
  }
  start(spec: TrackSpec): void {
    this.started.push(spec);
    this.playing = true;
    this.current = 'running';
  }
  stop(): void {
    this.stopCount += 1;
    this.playing = false;
  }
  resume(): void {
    this.resumeCount += 1;
    this.current = 'running';
  }
  resumeCount = 0;
}

describe('TRACKS table', () => {
  it('has a spec for every track name', () => {
    for (const n of TRACK_NAMES) expect(TRACKS[n]).toBeDefined();
  });

  it('every spec is well-formed: valid waveform, quiet gains, in-range motif', () => {
    const validTypes = new Set(['sine', 'square', 'sawtooth', 'triangle']);
    for (const n of TRACK_NAMES) {
      const t = TRACKS[n];
      expect(validTypes.has(t.waveform)).toBe(true);
      expect(t.rootFreq).toBeGreaterThan(0);
      expect(t.scale.length).toBeGreaterThan(0);
      expect(t.sequence.length).toBeGreaterThan(0);
      expect(t.stepSeconds).toBeGreaterThan(0);
      expect(t.stepSeconds).toBeLessThan(3); // a loop step, not a drone
      // A background bed sits well under the SFX cues (peak gain ~0.24).
      expect(t.noteGain).toBeGreaterThan(0);
      expect(t.noteGain).toBeLessThanOrEqual(0.15);
      expect(t.droneGain).toBeGreaterThanOrEqual(0);
      expect(t.droneGain).toBeLessThanOrEqual(0.15);
      // Every motif index must point at a real scale degree.
      for (const idx of t.sequence) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(t.scale.length);
      }
    }
  });
});

describe('startMusic dispatch', () => {
  beforeEach(() => {
    resetMusic();
    resetMuted();
  });

  it('records the active track even with no sink (jsdom has no WebAudio)', () => {
    expect(getMusicTrack()).toBeNull();
    startMusic('hub');
    expect(getMusicTrack()).toBe('hub');
    expect(getMusicState()).toBe('unavailable'); // no sink resolved under jsdom
  });

  it('routes the matching spec to an injected sink', () => {
    const mock = new MockMusicSink();
    setMusicSink(mock);
    startMusic('planet');
    expect(mock.started).toHaveLength(1);
    expect(mock.started[0]).toEqual(TRACKS.planet);
    expect(getMusicTrack()).toBe('planet');
    expect(getMusicState()).toBe('running');
  });

  it('is idempotent for the already-playing track (no restart on scene restart)', () => {
    const mock = new MockMusicSink();
    setMusicSink(mock);
    startMusic('planet');
    startMusic('planet');
    expect(mock.started).toHaveLength(1);
  });

  it('switches tracks: a different track stops nothing-implicitly but re-starts', () => {
    const mock = new MockMusicSink();
    setMusicSink(mock);
    startMusic('hub');
    startMusic('planet');
    expect(mock.started).toHaveLength(2);
    expect(mock.started[1]).toEqual(TRACKS.planet);
    expect(getMusicTrack()).toBe('planet');
  });

  it('stopMusic stops the sink and clears the active track', () => {
    const mock = new MockMusicSink();
    setMusicSink(mock);
    startMusic('hub');
    stopMusic();
    expect(mock.stopCount).toBe(1);
    expect(getMusicTrack()).toBeNull();
    // A subsequent start re-dispatches (track was cleared).
    startMusic('hub');
    expect(mock.started).toHaveLength(2);
  });

  it('reports unavailable state when no sink is set', () => {
    resetMusic();
    expect(getMusicState()).toBe('unavailable');
  });

  it('muted: records the active track but does NOT start the sink (M11)', () => {
    const mock = new MockMusicSink();
    setMusicSink(mock);
    setMuted(true);
    startMusic('planet');
    expect(mock.started).toHaveLength(0); // silence
    expect(getMusicTrack()).toBe('planet'); // …but the track is recorded
  });

  it('applyMusicMute stops the live loop when muted, preserving the track', () => {
    const mock = new MockMusicSink();
    setMusicSink(mock);
    startMusic('planet');
    expect(mock.playing).toBe(true);
    setMuted(true);
    applyMusicMute();
    expect(mock.stopCount).toBe(1);
    // currentTrack is preserved for resume, not cleared like stopMusic().
    expect(getMusicTrack()).toBe('planet');
  });

  it('applyMusicMute resumes the active track when un-muted', () => {
    const mock = new MockMusicSink();
    setMusicSink(mock);
    setMuted(true);
    startMusic('hub'); // silent; records currentTrack='hub'
    expect(mock.started).toHaveLength(0);
    setMuted(false);
    applyMusicMute();
    expect(mock.started).toHaveLength(1);
    expect(mock.started[0]).toEqual(TRACKS.hub);
    expect(getMusicTrack()).toBe('hub');
  });

  it('resumeMusic pokes the sink (gesture-driven autoplay un-suspend, F-40)', () => {
    const mock = new MockMusicSink();
    setMusicSink(mock);
    startMusic('hub');
    resumeMusic();
    expect(mock.resumeCount).toBe(1);
    expect(getMusicState()).toBe('running');
  });

  it('resumeMusic is safe with no sink resolved (jsdom / pre-first-start)', () => {
    resetMusic();
    expect(() => resumeMusic()).not.toThrow();
  });

  it('applyMusicMute is a no-op when no track is active', () => {
    const mock = new MockMusicSink();
    setMusicSink(mock);
    setMuted(false);
    applyMusicMute(); // currentTrack is null after resetMusic
    expect(mock.started).toHaveLength(0);
    expect(mock.stopCount).toBe(0);
  });
});
