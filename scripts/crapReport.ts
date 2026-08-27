/**
 * CRAP report (run via `npm run gate:crap`) — Phase 1 of the deterministic-gates
 * pilot (#44).
 *
 * CRAP = complexity² × (1 − coverage)³ + complexity, per function, ranked
 * worst-first. The cubed coverage term is the point: complexity is only
 * alarming to the degree nothing tests it. A complexity-12 function at full
 * coverage scores 12; the same function at 40% coverage scores 163.
 *
 * Scores above 6 are flagged. That is the agent calibration from the source
 * discussion — humans conventionally run under 4 — and it is deliberately one
 * explicit number rather than a per-review judgement call.
 *
 * The seam is this file's whole contract: a coverage-JSON path in, a ranked
 * report string out (see crapReport.test.ts). Coverage comes from vitest's v8
 * provider, which emits istanbul-shaped `coverage-final.json`; complexity is
 * computed with the TypeScript compiler the repo already ships, so counting one
 * number costs no new lint framework.
 *
 * Report-only during the pilot: no hook, no CI, and the CLI always exits 0 —
 * a ranking has no pass/fail to report, since there is always a worst function.
 * (The dependency gate does exit non-zero, because "is this import forbidden"
 * genuinely is yes/no.) A missing coverage file is still reported loudly on
 * stderr rather than passing silently.
 */
import { readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

/** Scores strictly above this are flagged. Agent calibration; humans use 4. */
const FLAG_LINE = 6;

/** The shape this report consumes out of istanbul-format `coverage-final.json`. */
interface FileCoverage {
  statementMap: Record<string, { start: { line: number } }>;
  s: Record<string, number>;
}

interface FunctionScore {
  name: string;
  file: string;
  line: number;
  complexity: number;
  coverage: number;
  crap: number;
}

/** Nodes that own a complexity score of their own. */
function isFunctionLike(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

/**
 * Cyclomatic complexity: one, plus one per decision point. Nested functions are
 * excluded — they get their own row — which matches how eslint's `complexity`
 * rule and crap4j both account for them.
 */
function complexityOf(fn: ts.Node): number {
  let score = 1;

  const visit = (node: ts.Node): void => {
    if (node !== fn && isFunctionLike(node)) return; // nested fn: its own row

    if (
      ts.isIfStatement(node) ||
      ts.isConditionalExpression(node) ||
      ts.isForStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isWhileStatement(node) ||
      ts.isDoStatement(node) ||
      ts.isCaseClause(node) ||
      ts.isCatchClause(node)
    ) {
      score += 1;
    }

    if (ts.isBinaryExpression(node)) {
      const op = node.operatorToken.kind;
      if (
        op === ts.SyntaxKind.AmpersandAmpersandToken ||
        op === ts.SyntaxKind.BarBarToken ||
        op === ts.SyntaxKind.QuestionQuestionToken
      ) {
        score += 1;
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(fn);
  return score;
}

/** Best-effort readable name, including `const foo = () => {}` and `{ foo() {} }`. */
function nameOf(node: ts.Node, source: ts.SourceFile): string {
  if (
    (ts.isFunctionDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node) ||
      ts.isFunctionExpression(node)) &&
    node.name
  ) {
    return node.name.getText(source);
  }
  if (ts.isConstructorDeclaration(node)) return 'constructor';

  const parent = node.parent;
  if (parent && ts.isVariableDeclaration(parent)) return parent.name.getText(source);
  if (parent && ts.isPropertyAssignment(parent)) return parent.name.getText(source);
  if (parent && ts.isPropertyDeclaration(parent) && parent.name) {
    return parent.name.getText(source);
  }
  return '<anonymous>';
}

/**
 * Fraction of the file's mapped statements that fall inside [startLine, endLine]
 * and were executed at least once. Statements inside nested functions count
 * toward the enclosing function too: an uncovered callback really does mean the
 * region is untested, even though its branches are scored on their own row.
 * Returns null when the range holds no mapped statements — no evidence either
 * way, so no score.
 */
function coverageOf(fileCoverage: FileCoverage, startLine: number, endLine: number): number | null {
  let total = 0;
  let covered = 0;

  for (const [id, location] of Object.entries(fileCoverage.statementMap)) {
    const line = location.start.line;
    if (line < startLine || line > endLine) continue;
    total += 1;
    if ((fileCoverage.s[id] ?? 0) > 0) covered += 1;
  }

  return total === 0 ? null : covered / total;
}

function scoreFile(displayPath: string, absolutePath: string, fileCoverage: FileCoverage): FunctionScore[] {
  const text = readFileSync(absolutePath, 'utf8');
  const source = ts.createSourceFile(
    absolutePath,
    text,
    ts.ScriptTarget.ES2022,
    /* setParentNodes */ true,
    absolutePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const scores: FunctionScore[] = [];

  const visit = (node: ts.Node): void => {
    if (isFunctionLike(node)) {
      const startLine = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
      const endLine = source.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
      const coverage = coverageOf(fileCoverage, startLine, endLine);

      if (coverage !== null) {
        const complexity = complexityOf(node);
        scores.push({
          name: nameOf(node, source),
          file: displayPath,
          line: startLine,
          complexity,
          coverage,
          crap: complexity ** 2 * (1 - coverage) ** 3 + complexity,
        });
      }
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(source, visit);
  return scores;
}

/**
 * Read an istanbul-shaped coverage JSON and return the ranked report.
 * Throws if the coverage file itself is unreadable; the CLI below turns that
 * into a loud message rather than a non-zero exit.
 */
export function crapReport(coverageJsonPath: string): string {
  const raw = readFileSync(resolve(process.cwd(), coverageJsonPath), 'utf8');
  const coverage = JSON.parse(raw) as Record<string, FileCoverage>;

  const scores: FunctionScore[] = [];
  for (const [key, fileCoverage] of Object.entries(coverage)) {
    const absolutePath = isAbsolute(key) ? key : resolve(process.cwd(), key);
    const displayPath = isAbsolute(key) ? relative(process.cwd(), key) : key;
    scores.push(...scoreFile(displayPath, absolutePath, fileCoverage));
  }

  scores.sort((a, b) => b.crap - a.crap || a.file.localeCompare(b.file) || a.line - b.line);

  const flagged = scores.filter((score) => score.crap > FLAG_LINE);
  const lines = [
    `CRAP report — ${flagged.length} of ${scores.length} function(s) above the flag line of ${FLAG_LINE}`,
    `Coverage: ${coverageJsonPath}`,
    '',
    '     CRAP   CX      COV  FUNCTION                            LOCATION',
  ];

  for (const score of scores) {
    lines.push(
      [
        score.crap > FLAG_LINE ? ' !' : '  ',
        score.crap.toFixed(2).padStart(7),
        String(score.complexity).padStart(4),
        `${(score.coverage * 100).toFixed(1)}%`.padStart(9),
        '  ',
        score.name.padEnd(34),
        `${score.file}:${score.line}`,
      ].join(''),
    );
  }

  lines.push(
    '',
    'CRAP = complexity² × (1 − coverage)³ + complexity. The flag line of 6 is the',
    'agent calibration; humans conventionally run under 4. Report-only: this',
    'command always exits 0 and nothing gates on it.',
  );

  return lines.join('\n');
}

const invokedDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const coveragePath = process.argv[2] ?? '.coverage/coverage-final.json';
  try {
    console.log(crapReport(coveragePath));
  } catch (err) {
    // Report-only means exit 0, but never means fail quietly: an absent or
    // malformed coverage file is the one way this gate can produce nothing
    // while looking fine, so say so unmistakably.
    console.error(`✗ CRAP report produced nothing — could not read ${coveragePath}`);
    console.error(`  ${err instanceof Error ? err.message : String(err)}`);
    console.error('  Run `npm run gate:crap`, which generates coverage first.');
  }
}
