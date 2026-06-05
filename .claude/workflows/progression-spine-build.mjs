export const meta = {
  name: 'progression-spine-build',
  description: 'Autonomously implement the Constellation Progression Spine (persistence + unlock chain + Hub registry) with tests, adversarial review, and a Planet-2 handoff',
  phases: [
    { title: 'Plan', detail: 'create branch, scout touchpoints, write a file-level implementation plan' },
    { title: 'Implement', detail: 'sequential build: tooling + save.ts, registry + Hub, showWin wiring + integration test' },
    { title: 'Verify', detail: 'typecheck + build + vitest, self-heal loop up to 3 rounds' },
    { title: 'Review', detail: 'adversarial regression / conventions / test-quality reviewers, then fix' },
    { title: 'Commit', detail: 'commit the green change to the new branch (no push)' },
    { title: 'Report', detail: 'report what shipped + a ready-to-run Planet-2 handoff' },
  ],
}

const BRANCH = 'feat/m4-progression-spine'

const CONTEXT = [
  'PROJECT: Constellation — asymmetric cozy 2-player co-op. Laptop runs a Phaser 3 platformer; phone runs React 19 puzzles; a tiny Node ws relay forwards messages by room code. Repo root is the working dir. TypeScript strict (noUnusedLocals, noUnusedParameters, noImplicitReturns, no any). Locked stack: Phaser 3, React 19, ws, Vite 6 (multi-entry index.html + phone.html), tsx, TypeScript. NO CSS files/frameworks. Generated solid-color textures (no art assets). Conventions in CLAUDE.md: "extend, do not refactor"; keep src/shared minimal (protocol types only); NO game logic in the relay; conventional commits with milestone prefix.',
  '',
  'CURRENT STATE (verify against code): Boot scene reads ?solo and starts Hub with scene data { net, solo, unlockedPlanets: Set<string> } (default Set(["planet-1"])). HubScene renders a starfield with one playable planet node ("planet-1") plus two HARD-CODED locked placeholder nodes; clicking an unlocked node does scene.start("Planet", { net, config, solo, unlockedPlanets }). PlanetScene is data-driven from a PlanetConfig (src/game/planets/planet1.ts holds planet1Config + the PlanetConfig type). PlanetScene.showWin() renders "Play again" (scene.restart preserving { net, config, solo, unlockedPlanets }) and "Return to Hub" (scene.start("Hub", ...)) buttons. THE LIVE BUG: completing a planet unlocks NOTHING — unlock state is in-memory only and showWin never advances the chain. There are currently ZERO tests in the repo.',
  '',
  'FEATURE TO BUILD — "Progression Spine" (scope is LOCKED to: persistence module + Hub generalization; do NOT author a real second planet this run — planet-2/planet-3 stay as not-yet-playable stubs, but the registry + unlock chain must make adding Planet 2 trivial later):',
  '1. src/game/progression/save.ts — a PURE, versioned persistence module. ProgressState { schemaVersion: number; unlockedPlanets: string[]; completed: Record<string, boolean> }. Functions: loadProgress() (reads localStorage, returns a sane default on missing/corrupt/wrong-version, never throws — guarded by typeof window !== "undefined" and try/catch), saveProgress(state), markPlanetComplete(state, planetId) -> NEW state (pure, does NOT mutate its input) that marks the planet completed AND unlocks the next planet in PLANETS order, and migrate(legacy) -> current-version state. Keep it dependency-free and framework-free so it unit-tests trivially.',
  '2. An ordered PLANETS registry (e.g. src/game/planets/registry.ts) — an array of { id, label, config? } in chain order. planet-1 has its real config (planet1Config); planet-2 and planet-3 are registered WITHOUT a config (stubs). Design so adding Planet 2 later is just: drop a config file in and attach it to the planet-2 entry — no other edits needed.',
  '3. A PURE nodeStateFor(progress, planetId) -> "completed" | "unlocked" | "locked" helper (unit-testable, no Phaser).',
  '4. Generalize HubScene to render N nodes by mapping the PLANETS registry (no hard-coded three) using nodeStateFor for visuals. Click behavior: locked -> no-op/locked feedback; unlocked WITH a config -> launch the Planet; unlocked WITHOUT a config (a stub) -> a gentle "Coming soon" feedback (NOT a crash). This is what lets Planet 2 light up automatically once its config exists.',
  '5. Wire Boot to call loadProgress() and pass the derived unlockedPlanets Set to Hub — KEEP the existing scene-data contract shape ({ net, solo, unlockedPlanets: Set }) so nothing downstream breaks; persistence is additive.',
  '6. Wire PlanetScene.showWin() to call markPlanetComplete + saveProgress on win, and thread the UPDATED unlocked Set through BOTH win buttons. CRITICAL: clone, do not mutate; do NOT regress planet-1 Play-again / Return-to-Hub behavior; do NOT touch Freeze Stars or the planet-1 level sequence.',
  '',
  'VERIFICATION APPROACH (no human, no art): Vitest is the sanctioned new dev dependency (add vitest + jsdom as devDependencies). Use vitest with the jsdom environment so the save module sees a REAL window.localStorage. Prove: default/corrupt/wrong-version fallback; saveProgress -> loadProgress round-trip deep-equals; markPlanetComplete advances the chain AND returns a new object (input unchanged); migrate(legacy) -> v1; nodeStateFor truth table; AND the headline integration assertion — simulate "complete planet-1 -> save -> reload" by saving the post-complete state then a FRESH loadProgress, asserting planet-2 is now durably unlocked (the bug fix, asserted). Do NOT attempt to instantiate Phaser scenes in tests — the Phaser wiring (Boot/Hub/showWin) is covered by `npm run typecheck` + `npm run build` only. GOTCHA: ensure `npm run typecheck` (tsc --noEmit) still passes with test files present (configure vitest globals/types and tsconfig include/exclude appropriately) and ensure the production `vite build` does NOT bundle test files. Strict mode forbids unused locals/params and any.',
].join('\n')

const SETUP_SCHEMA = { type: 'object', additionalProperties: false, required: ['branch','baseSha','created','notes'], properties: { branch: {type:'string'}, baseSha: {type:'string'}, created: {type:'boolean'}, notes: {type:'string'} } }
const SCOUT_SCHEMA = { type: 'object', additionalProperties: false, required: ['area','findings','extensionPoints','cautions'], properties: { area: {type:'string'}, findings: { type:'array', items: { type:'object', additionalProperties:false, required:['topic','detail','filePath'], properties: { topic:{type:'string'}, detail:{type:'string'}, filePath:{type:'string'} } } }, extensionPoints: { type:'array', items:{type:'string'} }, cautions: { type:'array', items:{type:'string'} } } }
const PLAN_SCHEMA = { type:'object', additionalProperties:false, required:['summary','files','apis','testPlan','steps','risks'], properties: {
  summary: {type:'string'},
  files: { type:'array', items:{ type:'object', additionalProperties:false, required:['path','action','purpose'], properties:{ path:{type:'string'}, action:{type:'string', enum:['create','edit']}, purpose:{type:'string'} } } },
  apis: { type:'array', items:{ type:'object', additionalProperties:false, required:['name','signature','notes'], properties:{ name:{type:'string'}, signature:{type:'string'}, notes:{type:'string'} } } },
  testPlan: { type:'array', items:{ type:'object', additionalProperties:false, required:['file','asserts'], properties:{ file:{type:'string'}, asserts:{ type:'array', items:{type:'string'} } } } },
  steps: { type:'array', items:{type:'string'} },
  risks: { type:'array', items:{type:'string'} },
} }
const IMPL_SCHEMA = { type:'object', additionalProperties:false, required:['summary','filesTouched','selfCheck','notes'], properties: { summary:{type:'string'}, filesTouched:{ type:'array', items:{type:'string'} }, selfCheck:{type:'string', description:'What you ran to confirm your slice works and the result'}, notes:{type:'string'} } }
const VERIFY_SCHEMA = { type:'object', additionalProperties:false, required:['green','typecheck','build','tests','failureLog','notes'], properties: { green:{type:'boolean'}, typecheck:{type:'string', enum:['pass','fail','skipped']}, build:{type:'string', enum:['pass','fail','skipped']}, tests:{type:'string', enum:['pass','fail','skipped']}, failureLog:{type:'string', description:'Trimmed but specific failing output; empty if green'}, notes:{type:'string'} } }
const REVIEW_SCHEMA = { type:'object', additionalProperties:false, required:['reviewer','findings','regressionRisk','verdict'], properties: { reviewer:{type:'string'}, findings:{ type:'array', items:{ type:'object', additionalProperties:false, required:['severity','issue','file','fix'], properties:{ severity:{type:'string', enum:['high','med','low']}, issue:{type:'string'}, file:{type:'string'}, fix:{type:'string'} } } }, regressionRisk:{type:'string'}, verdict:{type:'string'} } }
const COMMIT_SCHEMA = { type:'object', additionalProperties:false, required:['committed','sha','branch','message','filesCommitted','notes'], properties: { committed:{type:'boolean'}, sha:{type:'string'}, branch:{type:'string'}, message:{type:'string'}, filesCommitted:{ type:'array', items:{type:'string'} }, notes:{type:'string'} } }

// ---------- Phase 0: branch + scout + plan ----------
phase('Plan')
const setup = await agent(CONTEXT + '\n\nTASK: Prepare git for the build. The working tree is currently clean on branch feat/m4-hub-foundation. Create and check out a NEW branch named ' + BRANCH + ' off the current HEAD (if it already exists, just check it out). Do NOT modify any files, do NOT commit, do NOT push. Report the branch name, the base commit SHA (git rev-parse --short HEAD), whether you created it, and any notes (e.g. if the tree was not clean).', { label: 'setup:branch', phase: 'Plan', schema: SETUP_SCHEMA })
log('On branch ' + (setup && setup.branch) + ' (base ' + (setup && setup.baseSha) + '). Scouting touchpoints...')

const SCOUT_AREAS = [
  { key: 'set-dataflow', focus: 'Trace the unlockedPlanets Set end to end. Read src/game/scenes/Boot.ts, Hub.ts, Planet.ts (especially showWin and the two win buttons), and how scene data is passed at every scene.start/scene.restart. Report the EXACT current shapes/signatures, where the Set is created/read/passed, and exactly which lines showWin must touch to advance + persist the chain without regressing Play-again / Return-to-Hub.' },
  { key: 'hub-rendering', focus: 'Read src/game/scenes/Hub.ts fully. Report exactly how the three nodes are currently built (hard-coded positions, labels, locked vs playable visuals, click handlers, any "coming soon"/locked feedback), so it can be generalized to map an ordered registry. Note the node visual states needed (completed/unlocked/locked) and how a click currently launches a Planet.' },
  { key: 'tooling-conventions', focus: 'Read package.json (scripts + deps), tsconfig.json (strict flags, include/exclude), vite.config.ts (multi-entry inputs), and src/game/planets/planet1.ts (PlanetConfig type + planet1Config shape). Report the exact test/typecheck/build commands, and a concrete, low-risk way to add Vitest + jsdom as devDependencies such that (a) `npm run typecheck` still passes with test files present, (b) the production `vite build` does NOT bundle tests, and (c) the save module can see a real localStorage under the jsdom test environment. Note how a future Planet-2 config would plug into a registry.' },
]
const scouts = (await parallel(SCOUT_AREAS.map(a => () =>
  agent(CONTEXT + '\n\nYou are a read-only scout. ' + a.focus + '\n\nCite file paths and line numbers. Your findings feed an implementation plan.', { label: 'scout:' + a.key, phase: 'Plan', agentType: 'Explore', schema: SCOUT_SCHEMA })
))).filter(Boolean)

const scoutDigest = scouts.map(s =>
  '### ' + s.area + '\n' +
  s.findings.map(f => '  - ' + f.topic + ' (' + f.filePath + '): ' + f.detail).join('\n') + '\n' +
  'Extension points: ' + (s.extensionPoints||[]).join(' | ') + '\n' +
  'Cautions: ' + (s.cautions||[]).join(' | ')
).join('\n\n')

const plan = await agent(CONTEXT + '\n\n--- SCOUT FINDINGS ---\n' + scoutDigest + '\n--- END ---\n\nYou are the implementation planner. Produce a precise, file-level plan for the Progression Spine exactly as specified in the feature section above, honoring the scout findings and the locked scope (NO real second planet this run; registry + chain must make Planet 2 trivial to add later). Specify: every file to create/edit with its purpose; the exact public API signatures for save.ts (ProgressState, loadProgress, saveProgress, markPlanetComplete, migrate), the PLANETS registry shape, and nodeStateFor; the full test plan (which files, what each asserts, including the durable-unlock integration assertion under jsdom); an ordered list of build steps; and the key risks (showWin threading regression, Set mutation, tsconfig/test-types gotcha, vite not bundling tests). Be concrete — implementers will follow this verbatim.', { label: 'plan:impl', phase: 'Plan', schema: PLAN_SCHEMA })
const planText = JSON.stringify(plan, null, 2)
log('Plan ready: ' + (plan.files||[]).length + ' files, ' + (plan.testPlan||[]).length + ' test targets. Implementing...')

// ---------- Phase 1: Implement (strictly sequential, shared working tree) ----------
phase('Implement')
const IMPL_RULES = '\n\nRULES: Follow the plan faithfully. Read the current files before editing. Strict TypeScript (no any, no unused locals/params, no implicit returns). Do NOT touch src/shared/ or server/. Do NOT break Freeze Stars or the planet-1 sequence. Make minimal, surgical edits. After your slice, RUN the relevant command(s) yourself to confirm your slice is sound, and report the result honestly in selfCheck.'

const implA = await agent(CONTEXT + '\n\n--- PLAN ---\n' + planText + '\n--- END PLAN ---\n\nIMPLEMENTER STEP A — TOOLING + PERSISTENCE CORE. (1) Add Vitest + jsdom as devDependencies and a test script (e.g. "test": "vitest run") and run npm install. Configure vitest (jsdom environment, globals) and adjust tsconfig/types so `npm run typecheck` still passes and `vite build` will not bundle tests. (2) Create src/game/progression/save.ts exactly per the plan (pure, versioned, never-throws, typeof window guarded). (3) Write its unit tests per the test plan (default/corrupt/wrong-version fallback, save->load round-trip, markPlanetComplete purity + chain advance, migrate). Run `npm test` and confirm these pass before returning.' + IMPL_RULES, { label: 'impl:tooling+save', phase: 'Implement', schema: IMPL_SCHEMA })

const implB = await agent(CONTEXT + '\n\n--- PLAN ---\n' + planText + '\n--- END PLAN ---\n\nIMPLEMENTER STEP B — REGISTRY + HUB GENERALIZATION. save.ts and the test runner already exist (read them). (1) Create the ordered PLANETS registry per the plan: planet-1 with planet1Config, planet-2 and planet-3 as config-less stubs; designed so a future Planet 2 plugs in by attaching a config only. (2) Add the pure nodeStateFor(progress, id) helper + its truth-table unit test. (3) Generalize HubScene to render N nodes by mapping the registry using nodeStateFor; click behavior: locked -> locked feedback, unlocked+config -> launch Planet, unlocked+no-config -> gentle "Coming soon" feedback (no crash). Keep visuals consistent with the existing starfield style. Run `npm test` and `npm run typecheck` and confirm green before returning.' + IMPL_RULES, { label: 'impl:registry+hub', phase: 'Implement', schema: IMPL_SCHEMA })

const implC = await agent(CONTEXT + '\n\n--- PLAN ---\n' + planText + '\n--- END PLAN ---\n\nIMPLEMENTER STEP C — BOOT + SHOWWIN WIRING + INTEGRATION TEST. (1) Wire Boot to call loadProgress() and pass the derived unlockedPlanets Set to Hub, keeping the existing scene-data contract shape. (2) Wire PlanetScene.showWin() to markPlanetComplete + saveProgress on win and thread the UPDATED unlocked Set through BOTH win buttons (clone, never mutate; preserve net/config/solo). Do NOT regress planet-1 Play-again / Return-to-Hub. (3) Write the headline integration test under the jsdom env: save the post-complete state, then a FRESH loadProgress, asserting planet-2 is durably unlocked (the bug fix, asserted). Run `npm test`, `npm run typecheck`, and `npm run build` and report results in selfCheck.' + IMPL_RULES, { label: 'impl:showWin+integration', phase: 'Implement', schema: IMPL_SCHEMA })
log('Implementation drafted. Running full verification...')

// ---------- Phase 2: Verify + self-heal loop ----------
phase('Verify')
const VERIFY_PROMPT = CONTEXT + '\n\nVERIFY GATE. Ensure node_modules are installed (run npm install if needed). Then run, in order: `npm run typecheck`, then `npm run build`, then `npm test`. Report each as pass/fail, whether ALL are green, and a TRIMMED but specific failureLog (the actual error lines) if anything fails. Do NOT edit any files — this is a read-only gate. Be strictly honest: green only if all three genuinely pass.'
let verify = await agent(VERIFY_PROMPT, { label: 'verify:1', phase: 'Verify', schema: VERIFY_SCHEMA })
let attempt = 1
while (!verify.green && attempt < 4) {
  attempt = attempt + 1
  log('Verify red (attempt ' + (attempt-1) + '). Self-healing...')
  await agent(CONTEXT + '\n\n--- PLAN ---\n' + planText + '\n--- END PLAN ---\n\nFIX GATE. The verification failed. Diagnose and fix MINIMALLY and surgically, honoring the plan, strict TS, and the no-regression rules (Freeze Stars + planet-1 + showWin buttons + src/shared/server untouched). Do not delete tests to make them pass; fix the real cause. Re-run the failing command(s) to confirm locally before returning.\n\nFAILURE OUTPUT:\n' + (verify.failureLog || '(none captured)'), { label: 'fix:' + attempt, phase: 'Verify', schema: IMPL_SCHEMA })
  verify = await agent(VERIFY_PROMPT, { label: 'verify:' + attempt, phase: 'Verify', schema: VERIFY_SCHEMA })
}
log(verify.green ? 'All green (typecheck + build + tests). Convening reviewers...' : 'Still red after ' + attempt + ' attempts — reviewers will assess, commit will be skipped.')

// ---------- Phase 3: Adversarial review + fix ----------
phase('Review')
const REVIEWERS = [
  { key: 'regression', lens: 'REGRESSION SKEPTIC. Diff the change (git diff). Verify: showWin still preserves net/config/solo and threads the unlocked Set correctly through BOTH "Play again" (scene.restart) and "Return to Hub" (scene.start) — no broken button. Verify the Set is CLONED, never mutated in place. Verify Freeze Stars, the enemy freeze, the chasm/platform/illuminate sequence, and planet-1 are untouched. Verify the Boot->Hub scene-data contract shape is unchanged. Flag any regression as high severity with the exact file and fix.' },
  { key: 'conventions', lens: 'CONVENTIONS AUDITOR. Verify: strict TS holds (no any, no unused locals/params, no implicit returns); src/shared/ and server/ are untouched; no CSS files added; vite build does not bundle test files; tsconfig still typechecks cleanly with tests present; only vitest + jsdom were added as deps (no scope-creep dependencies); the save module is pure and framework-free. Flag violations with severity + fix.' },
  { key: 'test-quality', lens: 'TEST-QUALITY SKEPTIC. Read the tests. Are they meaningful or tautological? Confirm they actually assert: corruption/wrong-version fallback, save->load round-trip, markPlanetComplete purity (input not mutated) AND chain advance, migrate, nodeStateFor truth table, AND the durable-unlock integration (complete planet-1 -> save -> fresh load -> planet-2 unlocked). Try a quick mutation in your head (or by temporarily breaking a function) — would any test stay green when it should not? Flag weak/always-green tests as high severity with a concrete strengthening fix.' },
]
const reviews = (await parallel(REVIEWERS.map(r => () =>
  agent(CONTEXT + '\n\n--- PLAN ---\n' + planText + '\n--- END PLAN ---\n\nYou are the ' + r.lens + '\n\nInspect the actual working tree (git diff, read files, you may run npm test/typecheck read-only). Do NOT edit files. Return findings with severity, the file, and a concrete fix; plus an overall regressionRisk note and verdict.', { label: 'review:' + r.key, phase: 'Review', schema: REVIEW_SCHEMA })
))).filter(Boolean)

const allFindings = reviews.flatMap(r => (r.findings||[]).map(f => Object.assign({ reviewer: r.reviewer }, f)))
const highFindings = allFindings.filter(f => f.severity === 'high')
let finalVerify = verify
if (highFindings.length > 0) {
  log(highFindings.length + ' high-severity finding(s). Applying fixes...')
  const findingsText = allFindings.map(f => '[' + f.severity + '] (' + f.file + ') ' + f.issue + ' -> FIX: ' + f.fix).join('\n')
  await agent(CONTEXT + '\n\n--- PLAN ---\n' + planText + '\n--- END PLAN ---\n\nREVIEW-FIX GATE. Apply the HIGH-severity review findings (and any clearly-correct MED ones) MINIMALLY, honoring strict TS and the no-regression rules. Do not over-reach. After fixing, run `npm run typecheck`, `npm run build`, and `npm test` to confirm still green.\n\nFINDINGS:\n' + findingsText, { label: 'review:fix', phase: 'Review', schema: IMPL_SCHEMA })
  finalVerify = await agent(VERIFY_PROMPT, { label: 'verify:postreview', phase: 'Review', schema: VERIFY_SCHEMA })
}
log(finalVerify.green ? 'Green after review.' : 'Not green after review — commit will be skipped.')

// ---------- Phase 4: Commit (only if green) ----------
phase('Commit')
let commit = null
if (finalVerify.green) {
  commit = await agent(CONTEXT + '\n\nCOMMIT GATE. You are on branch ' + BRANCH + ' and verification is green. Also update CLAUDE.md\'s "Do not add tests yet" guidance to reflect that Vitest now exists (the section itself says it will be revised when tests are introduced) — keep it brief and accurate. Then stage ALL changes (git add -A) and create ONE commit. Do NOT push. Use a conventional-commit message with the m4 prefix, for example subject: "feat(m4): persistence + progression spine — durable unlock chain + Vitest". In the body, briefly list what shipped (save.ts, PLANETS registry, nodeStateFor, Hub generalization, Boot/showWin wiring, tests) and end the message with exactly this trailer line: Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>. Report the commit SHA (git rev-parse --short HEAD), the branch, the message subject, and the list of files committed. Confirm you did NOT push.', { label: 'commit', phase: 'Commit', schema: COMMIT_SCHEMA })
  log('Committed ' + (commit && commit.sha) + ' on ' + BRANCH + ' (not pushed).')
} else {
  log('Skipping commit — verification not green.')
}

// ---------- Phase 5: Report + Planet-2 handoff ----------
phase('Report')
const reviewDigest = reviews.map(r => '- ' + r.reviewer + ': ' + r.verdict + ' (high: ' + (r.findings||[]).filter(f=>f.severity==='high').length + ', med: ' + (r.findings||[]).filter(f=>f.severity==='med').length + ')').join('\n')
const report = await agent(CONTEXT + '\n\n--- IMPLEMENTATION PLAN (for reference) ---\n' + planText + '\n\n--- FINAL VERIFY ---\ntypecheck=' + finalVerify.typecheck + ' build=' + finalVerify.build + ' tests=' + finalVerify.tests + ' green=' + finalVerify.green + '\n' + (finalVerify.green ? '' : ('failureLog: ' + (finalVerify.failureLog||''))) + '\n\n--- REVIEW SUMMARY ---\n' + reviewDigest + '\n\n--- COMMIT ---\n' + (commit ? JSON.stringify(commit) : '(no commit — not green)') + '\n--- END ---\n\nYou are writing the final report for the project owner. Inspect the actual committed/working tree as needed (git diff --stat, read the new files). Write a tight markdown report with these sections:\n1. OUTCOME — done/green or not, the commit SHA + branch (' + BRANCH + ', not pushed), and the headline: the dead unlock chain is fixed and now persists + is proven by tests.\n2. WHAT SHIPPED — files created/changed (with a diff --stat), the save.ts API, the PLANETS registry, Hub generalization, Boot/showWin wiring, and the test suite (list each test and what it proves, especially the durable-unlock integration assertion).\n3. VERIFICATION — the exact commands and their results (typecheck/build/test), and how the bug fix is proven with no human.\n4. RISKS / RESIDUAL — anything covered only by typecheck+build (Phaser wiring), and any follow-ups.\n5. PLANET-2 HANDOFF (make this genuinely ready-to-run) — the EXACT steps to add a themed Planet 2 next: where its PlanetConfig goes, how to attach it to the planet-2 registry entry so the Hub node lights up automatically, guidance for a themed puzzle/power variant (ice theme), and a copy-paste-ready prompt the owner can drop into a fresh Claude Code ultracode session to autonomously build Planet 2 on top of this branch. Also propose the one-line BACKLOG.md status update. Be concrete and honest.', { label: 'report:final', phase: 'Report' })

return {
  report,
  green: finalVerify.green,
  branch: BRANCH,
  commit,
  verify: { typecheck: finalVerify.typecheck, build: finalVerify.build, tests: finalVerify.tests },
  reviewHighFindings: highFindings.length,
  planFiles: (plan.files||[]).map(f => f.path),
}
