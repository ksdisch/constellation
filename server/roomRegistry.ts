/**
 * Pure room-lifecycle bookkeeping for the relay: the create/join/leave state
 * machine, extracted from the socket layer so it is unit-testable — both P0
 * process-crash findings lived in the untested connection handler (F-21).
 *
 * Generic over the member handle: the server passes WebSockets, tests pass
 * plain tokens. The registry never touches sockets, timers, or wire formats,
 * and holds no game state — same charter as relayForward.
 */

// Unambiguous room-code alphabet (no I or O — they read as 1 and 0).
const ROOM_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export type Role = 'game' | 'phone';

export type CreateResult =
  | { ok: true; code: string }
  | { ok: false; reason: 'already-in-room' | 'codes-exhausted' };

export type JoinResult<T> =
  | { ok: true; code: string; game: T }
  | { ok: false; reason: 'already-in-room' | 'not-found' | 'occupied' };

/**
 * What a departure means for the survivors: who left which room, and the peer
 * (if any) still there to notify. `null` = the handle wasn't in a room.
 */
export type LeaveResult<T> = { role: Role; code: string; peer: T | null } | null;

interface Room<T> {
  code: string;
  game: T;
  phone?: T;
}

export class RoomRegistry<T> {
  private rooms = new Map<string, Room<T>>();
  private members = new Map<T, Room<T>>();

  /** The code generator is injectable so tests can force collisions. */
  constructor(private generateCode: () => string = randomCode) {}

  create(game: T): CreateResult {
    if (this.members.has(game)) return { ok: false, reason: 'already-in-room' };
    const code = this.freshCode();
    if (code === null) return { ok: false, reason: 'codes-exhausted' };
    const room: Room<T> = { code, game };
    this.rooms.set(code, room);
    this.members.set(game, room);
    return { ok: true, code };
  }

  join(phone: T, roomCode: string): JoinResult<T> {
    if (this.members.has(phone)) return { ok: false, reason: 'already-in-room' };
    const room = this.rooms.get(roomCode);
    if (!room) return { ok: false, reason: 'not-found' };
    if (room.phone !== undefined) return { ok: false, reason: 'occupied' };
    room.phone = phone;
    this.members.set(phone, room);
    return { ok: true, code: room.code, game: room.game };
  }

  /**
   * Close cleanup. A leaving game takes its room down — the orphaned phone's
   * membership is released too, so the same socket can join a fresh room. A
   * leaving phone only frees the slot, so a same-code rejoin works (the
   * couch-playtest path, F-08).
   */
  leave(member: T): LeaveResult<T> {
    const room = this.members.get(member);
    if (!room) return null;
    this.members.delete(member);
    if (room.game === member) {
      this.rooms.delete(room.code);
      const phone = room.phone ?? null;
      if (phone !== null) this.members.delete(phone);
      return { role: 'game', code: room.code, peer: phone };
    }
    room.phone = undefined;
    return { role: 'phone', code: room.code, peer: room.game };
  }

  isMember(member: T): boolean {
    return this.members.has(member);
  }

  /** The other occupant of member's room, when both ends are present. */
  peerOf(member: T): T | null {
    const room = this.members.get(member);
    if (!room) return null;
    const other = room.game === member ? room.phone : room.game;
    return other ?? null;
  }

  /** Ghost games must not grow this without bound (F-26) — the heartbeat
   *  sweep's terminate() funnels every dead socket through leave(). */
  roomCount(): number {
    return this.rooms.size;
  }

  private freshCode(): string | null {
    // 10 attempts against the live room set — collisions are astronomically
    // unlikely at this room count, so exhaustion is an error result (never a
    // throw: that used to be a process-killer inside the message listener).
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = this.generateCode();
      if (!this.rooms.has(code)) return code;
    }
    return null;
  }
}

function randomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += ROOM_LETTERS[Math.floor(Math.random() * ROOM_LETTERS.length)];
  }
  return code;
}
