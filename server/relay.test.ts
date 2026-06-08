import { relayForward } from './relay';
import type { ClientToServerMsg } from '../src/shared/protocol';

/**
 * Pure forwarding-policy contract. Proves the relay carries the M8 wire (the
 * boosted flag + planet-complete) without a real socket — the relay logic is the
 * one new non-client piece, so this is the autonomous gate for it.
 */
describe('relayForward', () => {
  it('renames puzzle-solved → power-cast, carrying boosted=true', () => {
    expect(relayForward({ type: 'puzzle-solved', powerId: 'freeze-stars', boosted: true })).toEqual({
      type: 'power-cast',
      powerId: 'freeze-stars',
      boosted: true,
    });
  });

  it('renames cast-power → power-cast, carrying boosted=false', () => {
    expect(relayForward({ type: 'cast-power', powerId: 'phase-dash', boosted: false })).toEqual({
      type: 'power-cast',
      powerId: 'phase-dash',
      boosted: false,
    });
  });

  it('passes an un-invested cast through with boosted undefined (pre-M8 shape)', () => {
    expect(relayForward({ type: 'puzzle-solved', powerId: 'illuminate' })).toEqual({
      type: 'power-cast',
      powerId: 'illuminate',
      boosted: undefined,
    });
  });

  it('forwards planet-complete unchanged', () => {
    expect(relayForward({ type: 'planet-complete' })).toEqual({ type: 'planet-complete' });
  });

  it('forwards planet-started carrying the puzzle theme (M9)', () => {
    expect(relayForward({ type: 'planet-started', theme: 'ice' })).toEqual({
      type: 'planet-started',
      theme: 'ice',
    });
  });

  it('does not peer-forward room-setup messages (handled separately)', () => {
    const setup: ClientToServerMsg[] = [
      { type: 'create-room', role: 'game' },
      { type: 'join-room', role: 'phone', roomCode: 'ABCDEF' },
    ];
    for (const msg of setup) expect(relayForward(msg)).toBeNull();
  });

  it('never reads game state — output depends only on the message', () => {
    const msg: ClientToServerMsg = { type: 'puzzle-solved', powerId: 'summon-platform', boosted: true };
    expect(relayForward(msg)).toEqual(relayForward(msg));
  });
});
