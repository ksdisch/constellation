import { describe, it, expect } from 'vitest';
import { crapReport } from './crapReport';

/**
 * The CRAP report's seam is the whole script: a coverage-JSON path in, a ranked
 * report string out. Nothing here reaches into how the score is computed, which
 * functions the TypeScript AST walk finds, or how coverage is attributed — all
 * of that is free to change as long as these two fixtures keep their places.
 *
 * The expected scores are worked by hand from the formula in the issue,
 * complexity² × (1 − coverage)³ + complexity, NOT recomputed the way the script
 * computes them:
 *
 *   classifyScore  complexity 5 (1 base + three ifs + one &&), 3 of 8
 *                  statements covered = 0.375
 *                  → 25 × 0.625³ + 5 = 25 × 0.244140625 + 5 = 11.103515625
 *   addStardust    complexity 1 (no decision points), 1 of 1 covered = 1.0
 *                  → 1 × 0³ + 1 = 1
 *
 * crapCoverageFixture.json is hand-authored in v8-via-istanbul's real shape
 * (it carries fnMap/branchMap/f/b for fidelity even though the report reads
 * only statementMap and s) so those two coverage fractions are exact rather
 * than whatever a live run happens to produce.
 */
const FIXTURE = 'scripts/fixtures/crapCoverageFixture.json';

describe('crapReport', () => {
  it('ranks functions worst-CRAP-first', () => {
    const report = crapReport(FIXTURE);

    expect(report.indexOf('classifyScore')).toBeGreaterThan(-1);
    expect(report.indexOf('addStardust')).toBeGreaterThan(-1);
    expect(report.indexOf('classifyScore')).toBeLessThan(report.indexOf('addStardust'));
  });

  it('reports each function with its score, complexity and coverage', () => {
    const report = crapReport(FIXTURE);

    expect(report).toMatch(/11\.10\s+5\s+37\.5%\s+classifyScore/);
    expect(report).toMatch(/1\.00\s+1\s+100\.0%\s+addStardust/);
  });

  it('locates each function at its source file and line', () => {
    const report = crapReport(FIXTURE);

    expect(report).toContain('scripts/fixtures/crapFixtureBranchy.ts:9');
    expect(report).toContain('scripts/fixtures/crapFixtureSimple.ts:9');
  });

  it('flags only the functions scoring above the line, and counts them', () => {
    const report = crapReport(FIXTURE);

    expect(report).toContain('1 of 3 function(s) above the flag line of 6');
    expect(rowFor(report, 'classifyScore')).toMatch(/^\s*!/);
    expect(rowFor(report, 'describeStreak')).not.toMatch(/^\s*!/);
    expect(rowFor(report, 'addStardust')).not.toMatch(/^\s*!/);
  });

  it('does not flag a function sitting exactly on the flag line', () => {
    const report = crapReport(FIXTURE);

    // describeStreak is complexity 4 at 50% coverage: 16 × 0.125 + 4 = 6.00
    // exactly. "Above 6" has to mean above, or the threshold is really 5.
    expect(rowFor(report, 'describeStreak')).toMatch(/6\.00\s+4\s+50\.0%/);
    expect(rowFor(report, 'describeStreak')).not.toMatch(/^\s*!/);
  });
});

function rowFor(report: string, name: string): string {
  return report.split('\n').find((line) => line.includes(name)) ?? '';
}
