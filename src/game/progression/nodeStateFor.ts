import type { ProgressState } from './save';

/**
 * Visual/behavioral state of a planet node in the Hub.
 *
 * Pure — no Phaser, no I/O, no side effects. `completed` takes precedence over
 * `unlocked` so a finished planet reads as completed even though it stays
 * unlocked (replayable).
 */
export function nodeStateFor(
  progress: ProgressState,
  planetId: string,
): 'completed' | 'unlocked' | 'locked' {
  if (progress.completed[planetId]) return 'completed';
  if (progress.unlockedPlanets.includes(planetId)) return 'unlocked';
  return 'locked';
}
