/**
 * Pure Phase Align dial logic (F-55) — framework-free so it's Vitest-testable.
 * The component (`PhaseAlign.tsx`) renders it; nothing here imports React or
 * touches the DOM.
 */

/**
 * Default countdown length. The component uses it as its `totalSeconds`
 * default; App.tsx imports it to cap the reported `solveMs` at what the timer
 * actually allowed (F-50).
 */
export const PHASE_ALIGN_TOTAL_SECONDS = 30;

export const MISALIGNED = [90, 180, 270] as const;

/** A random non-aligned rotation so a dial never starts already solved. */
export function randomMisaligned(): number {
  return MISALIGNED[Math.floor(Math.random() * MISALIGNED.length)];
}
