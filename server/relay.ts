import type { ClientToServerMsg, ServerToClientMsg } from '../src/shared/protocol';

/**
 * The relay's entire peer-forwarding policy, as a pure function: given a message
 * from one peer, what (if anything) does the OTHER peer receive?
 *
 * The relay is a DUMB forwarder — it adds no game logic. Its only jobs are an
 * allowlist (room-setup messages are handled separately in the connection
 * handler and never reach here) plus the historical `cast-power → power-cast`
 * rename. The optional `boosted` flag (M8) is passed straight through; the relay
 * never reads or decides it. Returns null for anything not peer-forwarded.
 */
export function relayForward(msg: ClientToServerMsg): ServerToClientMsg | null {
  if (msg.type === 'cast-power' || msg.type === 'puzzle-solved') {
    return { type: 'power-cast', powerId: msg.powerId, boosted: msg.boosted };
  }
  if (msg.type === 'planet-complete') {
    return { type: 'planet-complete' };
  }
  if (msg.type === 'planet-started') {
    return { type: 'planet-started', theme: msg.theme };
  }
  return null;
}
