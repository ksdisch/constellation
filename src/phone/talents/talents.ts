import type { PowerId } from '../../shared/protocol';

/**
 * Player Specialization — the phone-side talent constellation (v1).
 *
 * Pure, framework-free data + mapping. Nothing here imports React or touches the
 * DOM, so it's fully Vitest-testable. Persistence lives next door in `save.ts`
 * (a twin of `src/game/progression/save.ts`).
 *
 * Two flavors of talent (see `docs/m8-strength-talents-plan.md`):
 *  - ACCOMMODATION (M7) — makes YOUR puzzle cozier (shorter / slower / more
 *    forgiving / a free hint). Tunes the puzzle UI, never the laptop side.
 *  - STRENGTH (M8) — makes YOUR PARTNER's power stronger on the laptop (a longer
 *    freeze / platform / phase window). The boost rides the cast over the wire;
 *    the magnitude itself lives game-side. Every strength boost is monotonically
 *    *more forgiving* for the astronaut, so it can't soft-lock a level.
 *
 * Both kinds are pure data here; persistence lives next door in `save.ts`.
 */

export type TalentId =
  // Accommodation branch (M7) — tunes your own puzzle.
  | 'fewer-sums'
  | 'unhurried'
  | 'shorter-tune'
  | 'first-light'
  | 'more-thinking'
  | 'second-chance'
  | 'calm-dials'
  | 'extra-beat'
  // Strength branch (M8) — boosts your partner's power on the laptop.
  | 'deep-freeze'
  | 'lasting-platform'
  | 'long-phase';

/** Accommodation tunes your puzzle; strength boosts your partner's power. */
export type TalentKind = 'accommodation' | 'strength';

export type TalentNode = {
  id: TalentId;
  /** Which puzzle (by the power it casts) this talent tunes. */
  power: PowerId;
  /** Self-directed (accommodation) vs partner-directed (strength). */
  kind: TalentKind;
  title: string;
  /** Cozy one-liner describing the effect. */
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
  { id: 'fewer-sums', power: 'freeze-stars', kind: 'accommodation', title: 'Fewer Sums', blurb: 'Quick Math asks 2 problems instead of 3.', cost: 1, requires: null },
  { id: 'unhurried', power: 'freeze-stars', kind: 'accommodation', title: 'Unhurried', blurb: 'Quick Math gives you 45s instead of 30s.', cost: 2, requires: 'fewer-sums' },
  { id: 'deep-freeze', power: 'freeze-stars', kind: 'strength', title: 'Deep Freeze', blurb: "Your partner's Freeze holds enemies 5s instead of 3s.", cost: 2, requires: null },
  // Summon Platform — Tap Sequence
  { id: 'shorter-tune', power: 'summon-platform', kind: 'accommodation', title: 'Shorter Tune', blurb: 'Tap Sequence is 4 lights instead of 5.', cost: 1, requires: null },
  { id: 'first-light', power: 'summon-platform', kind: 'accommodation', title: 'First Light', blurb: 'Tap Sequence shows the first color for free.', cost: 2, requires: 'shorter-tune' },
  { id: 'lasting-platform', power: 'summon-platform', kind: 'strength', title: 'Lasting Platform', blurb: "Your partner's Platform stays 8s instead of 5s.", cost: 2, requires: null },
  // Illuminate — Trivia (no strength node: a permanent reveal has no duration to scale)
  { id: 'more-thinking', power: 'illuminate', kind: 'accommodation', title: 'More Thinking', blurb: 'Trivia gives you 45s instead of 30s.', cost: 1, requires: null },
  { id: 'second-chance', power: 'illuminate', kind: 'accommodation', title: 'Second Chance', blurb: 'A wrong answer no longer sends you back to question 1.', cost: 2, requires: 'more-thinking' },
  // Phase Dash — Phase Align
  { id: 'calm-dials', power: 'phase-dash', kind: 'accommodation', title: 'Calm Dials', blurb: 'Phase Align uses 3 dials instead of 4.', cost: 1, requires: null },
  { id: 'extra-beat', power: 'phase-dash', kind: 'accommodation', title: 'Extra Beat', blurb: 'Phase Align gives you 45s instead of 30s.', cost: 2, requires: 'calm-dials' },
  { id: 'long-phase', power: 'phase-dash', kind: 'strength', title: 'Long Phase', blurb: "Your partner's Phase Dash window lasts 4s instead of 2.5s.", cost: 2, requires: null },
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

/**
 * Maps each strength talent to the power it boosts. Single source of truth for
 * both {@link strengthFor} and any UI that wants to read the coupling.
 */
const STRENGTH_BOOSTS: ReadonlyMap<TalentId, PowerId> = new Map(
  TALENTS.filter((t) => t.kind === 'strength').map((t) => [t.id, t.power]),
);

/**
 * Pure: fold the unlocked STRENGTH talents into the set of powers whose cast
 * should be boosted on the laptop. Order-independent; unknown / accommodation
 * ids are ignored. The phone sends `boosted = result.has(power)` on each cast;
 * the game owns the actual magnitudes.
 */
export function strengthFor(unlocked: Iterable<TalentId>): Set<PowerId> {
  const boosted = new Set<PowerId>();
  for (const id of unlocked) {
    const power = STRENGTH_BOOSTS.get(id);
    if (power) boosted.add(power);
  }
  return boosted;
}
