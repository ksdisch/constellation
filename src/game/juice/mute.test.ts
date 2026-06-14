import { describe, it, expect, beforeEach } from 'vitest';
import { isMuted, setMuted, resetMuted } from './mute';

/**
 * The shared master-mute flag — a pure, framework-free boolean. The interesting
 * behavior (silence while still recording the cue/track) is asserted against the
 * engines in audio.test.ts / music.test.ts; here we just pin the flag contract.
 */
describe('mute flag', () => {
  beforeEach(() => {
    resetMuted();
  });

  it('defaults to unmuted', () => {
    expect(isMuted()).toBe(false);
  });

  it('set/get round-trips both ways', () => {
    setMuted(true);
    expect(isMuted()).toBe(true);
    setMuted(false);
    expect(isMuted()).toBe(false);
  });

  it('resetMuted restores the default', () => {
    setMuted(true);
    resetMuted();
    expect(isMuted()).toBe(false);
  });
});
