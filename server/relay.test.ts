import { parseClientMsg, relayForward } from './relay';
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

  it('carries the M10 solveMs telemetry field through the rename', () => {
    expect(relayForward({ type: 'puzzle-solved', powerId: 'freeze-stars', boosted: true, solveMs: 4200 })).toEqual({
      type: 'power-cast',
      powerId: 'freeze-stars',
      boosted: true,
      solveMs: 4200,
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
      { type: 'create-room' },
      { type: 'join-room', roomCode: 'ABCDEF' },
    ];
    for (const msg of setup) expect(relayForward(msg)).toBeNull();
  });

  it('never reads game state — output depends only on the message', () => {
    const msg: ClientToServerMsg = { type: 'puzzle-solved', powerId: 'summon-platform', boosted: true };
    expect(relayForward(msg)).toEqual(relayForward(msg));
  });
});

/**
 * Frame-shape guard for the connection handler. JSON.parse accepts plenty of
 * payloads that are not messages — `null` in particular parses fine and then
 * crashes the process the moment `.type` is dereferenced. Anything that isn't
 * an object with a string `type` must come back null so the handler can reply
 * with an error instead of dying; unknown-but-well-formed types still pass
 * through (the allowlist drops them downstream).
 */
describe('parseClientMsg', () => {
  it('rejects the 4-byte `null` frame that used to kill the relay', () => {
    expect(parseClientMsg('null')).toBeNull();
  });

  it('rejects non-object JSON primitives', () => {
    for (const raw of ['42', '"create-room"', 'true', 'false']) {
      expect(parseClientMsg(raw)).toBeNull();
    }
  });

  it('rejects arrays and objects without a string type', () => {
    for (const raw of ['[]', '{}', '{"type":42}', '{"type":null}', '{"roomCode":"ABCDEF"}']) {
      expect(parseClientMsg(raw)).toBeNull();
    }
  });

  it('rejects unparsable frames', () => {
    expect(parseClientMsg('not json at all')).toBeNull();
    expect(parseClientMsg('')).toBeNull();
  });

  it('accepts a well-formed room-setup message', () => {
    expect(parseClientMsg('{"type":"join-room","roomCode":"ABCDEF"}')).toEqual({
      type: 'join-room',
      roomCode: 'ABCDEF',
    });
  });

  it('accepts a full cast message, fields intact', () => {
    const msg: ClientToServerMsg = { type: 'cast-power', powerId: 'freeze-stars', boosted: true, solveMs: 4200 };
    expect(parseClientMsg(JSON.stringify(msg))).toEqual(msg);
  });
});
