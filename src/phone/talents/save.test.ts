import {
  CURRENT_SCHEMA_VERSION,
  STORAGE_KEY,
  defaultTalentState,
  loadTalents,
  saveTalents,
  migrate,
  earnStardust,
  canUnlock,
  unlockTalent,
  type TalentState,
} from './save';

beforeEach(() => {
  window.localStorage.clear();
});

describe('defaultTalentState', () => {
  it('is zero stardust, nothing unlocked, at the current version', () => {
    expect(defaultTalentState()).toEqual({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      stardust: 0,
      unlocked: [],
    });
  });

  it('returns a fresh object every call', () => {
    const a = defaultTalentState();
    a.unlocked.push('fewer-sums');
    expect(defaultTalentState().unlocked).toEqual([]);
  });
});

describe('load / save round-trip', () => {
  it('loads default when nothing is stored', () => {
    expect(loadTalents()).toEqual(defaultTalentState());
  });

  it('round-trips a saved state', () => {
    const state: TalentState = { schemaVersion: 1, stardust: 3, unlocked: ['fewer-sums'] };
    saveTalents(state);
    expect(loadTalents()).toEqual(state);
  });

  it('falls back to default on corrupt JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadTalents()).toEqual(defaultTalentState());
  });

  it('falls back to default on wrong shape', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 1 }));
    expect(loadTalents()).toEqual(defaultTalentState());
  });

  it('scrubs unknown unlocked ids and clamps negative stardust on load', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, stardust: -5, unlocked: ['fewer-sums', 'ghost', 'fewer-sums'] }),
    );
    expect(loadTalents()).toEqual({ schemaVersion: 1, stardust: 0, unlocked: ['fewer-sums'] });
  });

  it('does not mutate the input on save', () => {
    const state: TalentState = { schemaVersion: 1, stardust: 2, unlocked: [] };
    const copy = structuredClone(state);
    saveTalents(state);
    expect(state).toEqual(copy);
  });
});

describe('migrate', () => {
  it('stamps the current version and salvages known fields', () => {
    const out = migrate({ schemaVersion: 0, stardust: 4, unlocked: ['unhurried', 'bad'] });
    expect(out.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(out.stardust).toBe(4);
    expect(out.unlocked).toEqual(['unhurried']);
  });

  it('routes a wrong-version blob through migrate on load', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 99, stardust: 1, unlocked: ['calm-dials'] }),
    );
    const loaded = loadTalents();
    expect(loaded.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(loaded.unlocked).toEqual(['calm-dials']);
  });
});

describe('earnStardust', () => {
  it('adds one by default, purely', () => {
    const s = defaultTalentState();
    const next = earnStardust(s);
    expect(next.stardust).toBe(1);
    expect(s.stardust).toBe(0); // unchanged
  });

  it('adds an explicit positive amount and ignores non-positive', () => {
    expect(earnStardust(defaultTalentState(), 3).stardust).toBe(3);
    expect(earnStardust({ ...defaultTalentState(), stardust: 5 }, -2).stardust).toBe(5);
  });
});

describe('canUnlock / unlockTalent', () => {
  it('rejects an unaffordable node', () => {
    const s: TalentState = { schemaVersion: 1, stardust: 0, unlocked: [] };
    expect(canUnlock(s, 'fewer-sums')).toBe(false);
    expect(unlockTalent(s, 'fewer-sums')).toBe(s); // unchanged ref
  });

  it('unlocks an affordable tier-1 node, deducting cost', () => {
    const s: TalentState = { schemaVersion: 1, stardust: 1, unlocked: [] };
    expect(canUnlock(s, 'fewer-sums')).toBe(true);
    const next = unlockTalent(s, 'fewer-sums');
    expect(next.unlocked).toEqual(['fewer-sums']);
    expect(next.stardust).toBe(0);
    expect(s.unlocked).toEqual([]); // input unchanged
  });

  it('blocks a tier-2 node until its prerequisite is unlocked', () => {
    const noPrereq: TalentState = { schemaVersion: 1, stardust: 9, unlocked: [] };
    expect(canUnlock(noPrereq, 'unhurried')).toBe(false);

    const withPrereq: TalentState = { schemaVersion: 1, stardust: 9, unlocked: ['fewer-sums'] };
    expect(canUnlock(withPrereq, 'unhurried')).toBe(true);
    expect(unlockTalent(withPrereq, 'unhurried').stardust).toBe(7); // cost 2
  });

  it('refuses to unlock an already-owned node', () => {
    const s: TalentState = { schemaVersion: 1, stardust: 5, unlocked: ['fewer-sums'] };
    expect(canUnlock(s, 'fewer-sums')).toBe(false);
    expect(unlockTalent(s, 'fewer-sums')).toBe(s);
  });

  it('refuses an unknown id', () => {
    const s: TalentState = { schemaVersion: 1, stardust: 9, unlocked: [] };
    // @ts-expect-error — exercising the runtime guard with a bad id
    expect(canUnlock(s, 'ghost')).toBe(false);
  });
});
