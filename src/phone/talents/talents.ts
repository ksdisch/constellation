import type { PowerId } from '../../shared/protocol';

/**
 * Player Specialization — the phone-side talent constellation (v1).
 *
 * Pure, framework-free data + mapping. Nothing here imports React or touches the
 * DOM, so it's fully Vitest-testable. Persistence lives next door in `save.ts`
 * (a twin of `src/game/progression/save.ts`).
 *
 * v1 is ACCOMMODATION-only: every talent makes its puzzle cozier (shorter /
 * slower / more forgiving / a free hint). Talents tune the puzzle UI — never
 * power magnitude on the laptop — which keeps level balancing decoupled from
 * progression. See `docs/m7-talents-plan.md` for the scope rationale.
 */

export type TalentId =
  | 'fewer-sums'
  | 'unhurried'
  | 'shorter-tune'
  | 'first-light'
  | 'more-thinking'
  | 'second-chance'
  | 'calm-dials'
  | 'extra-beat';

export type TalentNode = {
  id: TalentId;
  /** Which puzzle (by the power it casts) this talent tunes. */
  power: PowerId;
  title: string;
  /** Cozy one-liner describing the accommodation. */
  blurb: string;
  /** Stardust cost to unlock. */
  cost: number;
  /** Prerequisite node that must be unlocked first, or null for a tier-1 node. */
  requires: TalentId | null;
};

/**
 * The tree: four mini-branches (one per puzzle), each a tier-1 node and a
 * tier-2 node gated behind it. Object/array order is the display order.
 */
export const TALENTS: readonly TalentNode[] = [
  // Freeze Stars — Quick Math
  { id: 'fewer-sums', power: 'freeze-stars', title: 'Fewer Sums', blurb: 'Quick Math asks 2 problems instead of 3.', cost: 1, requires: null },
  { id: 'unhurried', power: 'freeze-stars', title: 'Unhurried', blurb: 'Quick Math gives you 45s instead of 30s.', cost: 2, requires: 'fewer-sums' },
  // Summon Platform — Tap Sequence
  { id: 'shorter-tune', power: 'summon-platform', title: 'Shorter Tune', blurb: 'Tap Sequence is 4 lights instead of 5.', cost: 1, requires: null },
  { id: 'first-light', power: 'summon-platform', title: 'First Light', blurb: 'Tap Sequence shows the first color for free.', cost: 2, requires: 'shorter-tune' },
  // Illuminate — Trivia
  { id: 'more-thinking', power: 'illuminate', title: 'More Thinking', blurb: 'Trivia gives you 45s instead of 30s.', cost: 1, requires: null },
  { id: 'second-chance', power: 'illuminate', title: 'Second Chance', blurb: 'A wrong answer no longer sends you back to question 1.', cost: 2, requires: 'more-thinking' },
  // Phase Dash — Phase Align
  { id: 'calm-dials', power: 'phase-dash', title: 'Calm Dials', blurb: 'Phase Align uses 3 dials instead of 4.', cost: 1, requires: null },
  { id: 'extra-beat', power: 'phase-dash', title: 'Extra Beat', blurb: 'Phase Align gives you 45s instead of 30s.', cost: 2, requires: 'calm-dials' },
];

/** O(1) lookup by id. */
const BY_ID: ReadonlyMap<TalentId, TalentNode> = new Map(TALENTS.map((t) => [t.id, t]));

export function talentById(id: TalentId): TalentNode | undefined {
  return BY_ID.get(id);
}

/** Type guard: is `value` a known TalentId? Used to filter persisted blobs. */
export function isTalentId(value: unknown): value is TalentId {
  return typeof value === 'string' && BY_ID.has(value as TalentId);
}

/**
 * Per-puzzle prop OVERRIDES (deltas only) derived from the unlocked talents.
 * Keyed by PowerId so the mapping is exhaustive against the power set. Each
 * field is optional: unspecified props fall back to the component's own default,
 * so we never duplicate the components' baseline numbers here.
 */
export type PuzzleOverrides = {
  'freeze-stars': { totalSeconds?: number; problemCount?: number };
  'summon-platform': { totalSeconds?: number; sequenceLength?: number; revealFirst?: boolean };
  'illuminate': { timerSeconds?: number; forgiveMistakes?: boolean };
  'phase-dash': { totalSeconds?: number; dialCount?: number };
};

/** A fresh, all-empty override set (no talents applied). New object each call. */
function emptyOverrides(): PuzzleOverrides {
  return {
    'freeze-stars': {},
    'summon-platform': {},
    'illuminate': {},
    'phase-dash': {},
  };
}

/**
 * Pure: fold the unlocked talents into per-puzzle prop overrides. Order-
 * independent; unknown ids are ignored. Returns a fresh object (no shared refs).
 */
export function tuningFor(unlocked: Iterable<TalentId>): PuzzleOverrides {
  const set = new Set(unlocked);
  const o = emptyOverrides();
  if (set.has('fewer-sums')) o['freeze-stars'].problemCount = 2;
  if (set.has('unhurried')) o['freeze-stars'].totalSeconds = 45;
  if (set.has('shorter-tune')) o['summon-platform'].sequenceLength = 4;
  if (set.has('first-light')) o['summon-platform'].revealFirst = true;
  if (set.has('more-thinking')) o['illuminate'].timerSeconds = 45;
  if (set.has('second-chance')) o['illuminate'].forgiveMistakes = true;
  if (set.has('calm-dials')) o['phase-dash'].dialCount = 3;
  if (set.has('extra-beat')) o['phase-dash'].totalSeconds = 45;
  return o;
}
