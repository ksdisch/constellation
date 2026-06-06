import { TALENTS, tuningFor, talentById, isTalentId, type TalentId } from './talents';

describe('TALENTS table', () => {
  it('has unique ids', () => {
    const ids = TALENTS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every requires points at a real, cheaper-or-equal tier-1 node', () => {
    for (const node of TALENTS) {
      if (node.requires === null) continue;
      const parent = talentById(node.requires);
      expect(parent).toBeDefined();
      // prereq is a tier-1 (no further requirement) — keeps the tree 2 deep
      expect(parent!.requires).toBeNull();
    }
  });

  it('talentById finds known nodes and misses unknown', () => {
    expect(talentById('fewer-sums')?.title).toBe('Fewer Sums');
    expect(talentById('nope' as TalentId)).toBeUndefined();
  });

  it('isTalentId guards real ids only', () => {
    expect(isTalentId('fewer-sums')).toBe(true);
    expect(isTalentId('first-light')).toBe(true);
    expect(isTalentId('bogus')).toBe(false);
    expect(isTalentId(42)).toBe(false);
    expect(isTalentId(null)).toBe(false);
  });
});

describe('tuningFor', () => {
  it('returns all-empty overrides for no talents', () => {
    const t = tuningFor([]);
    expect(t).toEqual({
      'freeze-stars': {},
      'summon-platform': {},
      'illuminate': {},
      'phase-dash': {},
    });
  });

  it('maps each talent to its expected override', () => {
    expect(tuningFor(['fewer-sums'])['freeze-stars']).toEqual({ problemCount: 2 });
    expect(tuningFor(['unhurried'])['freeze-stars']).toEqual({ totalSeconds: 45 });
    expect(tuningFor(['shorter-tune'])['summon-platform']).toEqual({ sequenceLength: 4 });
    expect(tuningFor(['first-light'])['summon-platform']).toEqual({ revealFirst: true });
    expect(tuningFor(['more-thinking'])['illuminate']).toEqual({ timerSeconds: 45 });
    expect(tuningFor(['second-chance'])['illuminate']).toEqual({ forgiveMistakes: true });
    expect(tuningFor(['calm-dials'])['phase-dash']).toEqual({ dialCount: 3 });
    expect(tuningFor(['extra-beat'])['phase-dash']).toEqual({ totalSeconds: 45 });
  });

  it('combines talents within one puzzle', () => {
    const t = tuningFor(['fewer-sums', 'unhurried']);
    expect(t['freeze-stars']).toEqual({ problemCount: 2, totalSeconds: 45 });
  });

  it('is order-independent and ignores unknown ids', () => {
    const a = tuningFor(['unhurried', 'fewer-sums']);
    const b = tuningFor(['fewer-sums', 'unhurried', 'ghost' as TalentId]);
    expect(a).toEqual(b);
  });

  it('applies the full tree across all puzzles', () => {
    const all = TALENTS.map((t) => t.id);
    const t = tuningFor(all);
    expect(t).toEqual({
      'freeze-stars': { problemCount: 2, totalSeconds: 45 },
      'summon-platform': { sequenceLength: 4, revealFirst: true },
      'illuminate': { timerSeconds: 45, forgiveMistakes: true },
      'phase-dash': { dialCount: 3, totalSeconds: 45 },
    });
  });

  it('returns a fresh object (no shared mutable refs)', () => {
    const a = tuningFor([]);
    a['freeze-stars'].problemCount = 99;
    expect(tuningFor([])['freeze-stars']).toEqual({});
  });
});
