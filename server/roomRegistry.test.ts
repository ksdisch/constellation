import { RoomRegistry } from './roomRegistry';

/**
 * Pure room-lifecycle contract — the state machine the connection handler
 * drives (F-21: both P0 crashes lived in that handler while only relayForward
 * was tested). Handles are plain strings; the registry never sees sockets.
 * The leave() cases double as the heartbeat-sweep contract: terminate() fires
 * 'close', 'close' calls leave(), and what leave() returns is exactly what
 * the survivors get told.
 */
describe('RoomRegistry', () => {
  it('create mints a 6-letter code from the unambiguous alphabet and registers membership', () => {
    const reg = new RoomRegistry<string>();
    const res = reg.create('game');
    if (!res.ok) throw new Error('create failed');
    expect(res.code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
    expect(reg.isMember('game')).toBe(true);
    expect(reg.roomCount()).toBe(1);
  });

  it('rejects a second create from a handle already in a room', () => {
    const reg = new RoomRegistry<string>();
    expect(reg.create('game').ok).toBe(true);
    expect(reg.create('game')).toEqual({ ok: false, reason: 'already-in-room' });
  });

  it('reports codes-exhausted instead of throwing when the generator only collides', () => {
    const reg = new RoomRegistry<string>(() => 'AAAAAA');
    expect(reg.create('game-1')).toEqual({ ok: true, code: 'AAAAAA' });
    expect(reg.create('game-2')).toEqual({ ok: false, reason: 'codes-exhausted' });
  });

  it('join pairs the phone with the room and returns the game handle to notify', () => {
    const reg = new RoomRegistry<string>(() => 'ABCDEF');
    reg.create('game');
    expect(reg.join('phone', 'ABCDEF')).toEqual({ ok: true, code: 'ABCDEF', game: 'game' });
    expect(reg.peerOf('game')).toBe('phone');
    expect(reg.peerOf('phone')).toBe('game');
  });

  it('join misses on an unknown code', () => {
    const reg = new RoomRegistry<string>();
    expect(reg.join('phone', 'NOSUCH')).toEqual({ ok: false, reason: 'not-found' });
    expect(reg.isMember('phone')).toBe(false);
  });

  it('join rejects a room that already has a phone', () => {
    const reg = new RoomRegistry<string>(() => 'ABCDEF');
    reg.create('game');
    reg.join('phone-1', 'ABCDEF');
    expect(reg.join('phone-2', 'ABCDEF')).toEqual({ ok: false, reason: 'occupied' });
  });

  it('join rejects a handle that is already in a room', () => {
    const reg = new RoomRegistry<string>();
    const a = reg.create('game-a');
    const b = reg.create('game-b');
    if (!a.ok || !b.ok) throw new Error('setup failed');
    reg.join('phone', a.code);
    expect(reg.join('phone', b.code)).toEqual({ ok: false, reason: 'already-in-room' });
    expect(reg.join('game-a', b.code)).toEqual({ ok: false, reason: 'already-in-room' });
  });

  it('a solo game has no peer; a non-member has no peer', () => {
    const reg = new RoomRegistry<string>();
    reg.create('game');
    expect(reg.peerOf('game')).toBeNull();
    expect(reg.peerOf('stranger')).toBeNull();
  });

  it('phone leave frees the slot and names the game to notify — same-code rejoin works (F-08)', () => {
    const reg = new RoomRegistry<string>(() => 'ABCDEF');
    reg.create('game');
    reg.join('phone-ghost', 'ABCDEF');
    // The sweep terminates the ghost → 'close' → leave().
    expect(reg.leave('phone-ghost')).toEqual({ role: 'phone', code: 'ABCDEF', peer: 'game' });
    expect(reg.isMember('phone-ghost')).toBe(false);
    expect(reg.roomCount()).toBe(1);
    // The couch scenario: the returning phone rejoins the SAME code.
    expect(reg.join('phone-again', 'ABCDEF')).toEqual({ ok: true, code: 'ABCDEF', game: 'game' });
  });

  it('game leave closes the room and names the orphaned phone to notify', () => {
    const reg = new RoomRegistry<string>(() => 'ABCDEF');
    reg.create('game');
    reg.join('phone', 'ABCDEF');
    expect(reg.leave('game')).toEqual({ role: 'game', code: 'ABCDEF', peer: 'phone' });
    expect(reg.roomCount()).toBe(0);
    expect(reg.join('phone-late', 'ABCDEF')).toEqual({ ok: false, reason: 'not-found' });
  });

  it('an orphaned phone is released with its room and may join a fresh one', () => {
    let code = 'AAAAAA';
    const reg = new RoomRegistry<string>(() => code);
    reg.create('game-1');
    reg.join('phone', 'AAAAAA');
    reg.leave('game-1');
    // Under the old in-handler state the phone stayed flagged as in-a-room
    // forever after its game left; the registry releases it.
    expect(reg.isMember('phone')).toBe(false);
    code = 'BBBBBB';
    reg.create('game-2');
    expect(reg.join('phone', 'BBBBBB')).toEqual({ ok: true, code: 'BBBBBB', game: 'game-2' });
  });

  it('leave is a no-op null for a handle that was never in a room', () => {
    const reg = new RoomRegistry<string>();
    expect(reg.leave('stranger')).toBeNull();
  });

  it('ghost games cannot grow the room count without bound (F-26)', () => {
    let n = 0;
    const reg = new RoomRegistry<string>(() => `ROOM${String(n).padStart(2, '0')}`.slice(0, 6));
    for (; n < 20; n++) {
      expect(reg.create(`game-${n}`).ok).toBe(true);
    }
    expect(reg.roomCount()).toBe(20);
    // The sweep terminates every ghost; each close funnels through leave().
    for (let i = 0; i < 20; i++) reg.leave(`game-${i}`);
    expect(reg.roomCount()).toBe(0);
  });
});
