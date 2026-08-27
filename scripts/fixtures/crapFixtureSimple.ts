/**
 * CRAP report test fixture: the straight-line, fully-covered counterpart to
 * crapFixtureBranchy.ts.
 *
 * Cyclomatic complexity is 1 (no decision points). Paired with
 * crapCoverageFixture.json (its single statement covered, 100%), it must score
 * 1² × (1 − 1)³ + 1 = 1 and stay below the flag line.
 */
export function addStardust(current: number, earned: number): number {
  return current + earned;
}
