/**
 * CRAP report test fixture: a deliberately branchy, thinly-covered function.
 *
 * Cyclomatic complexity is 5 by hand: 1 base + three `if`s + one `&&`.
 * Paired with crapCoverageFixture.json (3 of its 8 statements covered, 37.5%),
 * it must score 5² × (1 − 0.375)³ + 5 = 11.103515625 and land above the flag
 * line. Do not "clean this up" — the shape is the assertion.
 */
export function classifyScore(score: number, streak: number): string {
  const rallying = streak > 3;
  if (score > 90) {
    return 'brilliant';
  }
  if (score > 70) {
    return 'solid';
  }
  if (rallying && score > 40) {
    return 'rallying';
  }
  return 'dim';
}
