/**
 * CRAP report test fixture: a function sitting exactly on the flag line.
 *
 * Cyclomatic complexity is 4 by hand: 1 base + one `&&` + two `if`s. Paired
 * with crapCoverageFixture.json (3 of its 6 statements covered, 50%), it scores
 * 4² × (1 − 0.5)³ + 4 = 2 + 4 = 6.00 — equal to the flag line, not above it,
 * so it must be reported and ranked but NOT flagged.
 */
export function describeStreak(streak: number, boosted: boolean): string {
  const hot = boosted && streak > 5;
  if (streak > 10) {
    return 'blazing';
  }
  if (hot) {
    return 'warm';
  }
  return 'cold';
}
