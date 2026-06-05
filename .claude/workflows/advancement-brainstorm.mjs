export const meta = {
  name: 'constellation-advancement-brainstorm',
  description: 'Brainstorm a significant, autonomously-shippable advancement for the Constellation co-op game and return a ranked shortlist',
  phases: [
    { title: 'Map', detail: 'parallel readers establish ground truth across subsystems' },
    { title: 'Ideate', detail: '8 diverse-lens agents generate candidate advancements' },
    { title: 'Synthesize', detail: '4 synthesizers cross-pollinate and combine the idea pool' },
    { title: 'Curate', detail: 'one curator dedupes into a distinct candidate slate' },
    { title: 'Judge', detail: 'adversarial 3-lens panel scores each candidate' },
    { title: 'Report', detail: 'final ranked shortlist with autonomous-build plans' },
  ],
}

const BRIEF = [
  'Constellation — asymmetric cozy 2-player co-op game.',
  '- Laptop runs a Phaser 3 platformer (the "Astronaut"). Phone runs React 19 puzzles (the "Starglow" star-companion). A tiny Node ws relay pairs the two devices by a 6-letter room code and forwards messages opaquely — NO game logic on the server.',
  '- Core loop: phone player taps a power tile, solves a puzzle, the relay forwards a power-cast, and the laptop PlanetScene casts the power, reshaping the level. Both players are load-bearing; neither side is decorative.',
  '- 3 powers wired today: Freeze Stars (QuickMath puzzle, freezes enemy 3s), Summon Platform (TapSequence/Simon-Says, spawns a bridge platform for 5s), Illuminate (3-question Trivia, fades a dark zone revealing a load-bearing hidden platform). Each power is wired across FOUR sides that MUST stay in sync: (1) a PowerId literal in src/shared/protocol.ts, (2) a Spellbook tile, (3) a puzzle component under src/phone/components/puzzles/, (4) a castPower() handler in src/game/scenes/Planet.ts (guarded by an exhaustive never check).',
  '- 1 planet exists (planet1Config) rendered by a data-driven PlanetScene that takes a PlanetConfig (every magic number is data). M4 in progress: a galaxy HubScene with one playable planet node + two locked placeholders; the data-driven planet refactor is done. Branch: feat/m4-hub-foundation.',
  '- Stack is LOCKED: Phaser 3, React 19, ws, Vite 6, tsx, TypeScript strict (noUnusedLocals/Params/noImplicitReturns, no any). Adding any dependency is a deliberate decision. NO CSS files/frameworks — phone UI is inline style objects only, palette: panels #1a1b3a, cold accent #7ad8ff, error #ff6b9d, warm #f6c971, purple #9a7aff. Touch targets >= 44px. The game uses GENERATED solid-color textures (no art assets) registered in Boot.ts.',
  '- NOT yet built: persistence (unlock state is in-memory only, relay forgets rooms on disconnect), deployment, tests (NONE exist — the stated integration gate is a HUMAN "is it fun?" playtest), real audio/SFX/music, the Starglow companion as an actual on-screen entity, planets 2..N, any meta-progression, reconnection.',
  '- Deferred idea already on file: phone-side player specialization / talent tree (docs/ideas/specialization.md) — talents tweak puzzle UI not power magnitude; blocked on a persistence decision + the playtest gate.',
  '- Conventions (from CLAUDE.md): "extend, do not refactor" (model new powers on the existing three); keep src/shared minimal (protocol types only); no game logic in the relay; conventional commits with milestone prefix (e.g. feat(m4): ...). Do not break Freeze Stars when adding powers.',
  '',
  'THE META-GOAL OF THIS BRAINSTORM: the winning idea will be handed to a FULLY AUTONOMOUS Claude Code workflow that must PLAN -> IMPLEMENT -> TEST -> REPORT with NO human in the loop. Therefore an idea value is gated by a hard question: can a workflow both BUILD it AND VERIFY it WITHOUT relying on the human "is it fun?" playtest and WITHOUT new art/audio assets that need human taste? Verifiability is gold when it comes from: tsc typecheck + vite build passing, wire-protocol round-trip, deterministic reach/collision math (M3 proved win tiles unreachable without a power by ~21px), localStorage/state assertions, or headless-browser smoke (Playwright-style, though Playwright is not currently a dependency — adding a dev-only test dep is permissible if justified). Procedurally-generated audio via the Web Audio API counts as assetless and is verifiable by existence/wiring. Pure "feel" features that ONLY a human can validate are weaker UNLESS paired with a concrete programmatic verification strategy. Scope each idea so a single focused autonomous run can realistically finish it.',
].join('\n')

const GT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['subsystem', 'findings', 'gaps', 'autonomySignals', 'groundTruthCorrections'],
  properties: {
    subsystem: { type: 'string' },
    findings: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['topic','detail'], properties: { topic: {type:'string'}, detail: {type:'string'} } } },
    gaps: { type: 'array', items: { type: 'string' } },
    autonomySignals: { type: 'array', items: { type: 'string' }, description: 'Things relevant to whether features in this subsystem can be autonomously built AND verified without a human' },
    groundTruthCorrections: { type: 'array', items: { type: 'string' }, description: 'Where the actual code diverges from the docs/brief' },
  },
}

const IDEA_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['lens', 'ideas'],
  properties: {
    lens: { type: 'string' },
    ideas: {
      type: 'array', minItems: 2, maxItems: 4,
      items: {
        type: 'object', additionalProperties: false,
        required: ['title','oneLiner','what','whySignificant','fitWithVision','autonomousBuildAndVerify','risks','roughScope'],
        properties: {
          title: { type: 'string' },
          oneLiner: { type: 'string' },
          what: { type: 'string', description: 'Concrete description of what gets built' },
          whySignificant: { type: 'string' },
          fitWithVision: { type: 'string' },
          autonomousBuildAndVerify: { type: 'string', description: 'How a workflow would BUILD it and, critically, how it would VERIFY it without a human playtest or new art assets' },
          risks: { type: 'string' },
          roughScope: { type: 'string', enum: ['S','M','L','XL'] },
        },
      },
    },
  },
}

const REFINED_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['angle','candidates'],
  properties: {
    angle: { type: 'string' },
    candidates: {
      type: 'array', minItems: 2, maxItems: 3,
      items: {
        type: 'object', additionalProperties: false,
        required: ['name','pitch','combinesIdeas','whatShips','whySignificant','autonomousPlan','verification','risks','scope'],
        properties: {
          name: { type: 'string' },
          pitch: { type: 'string', description: 'One-paragraph pitch' },
          combinesIdeas: { type: 'array', items: { type: 'string' }, description: 'Which phase-2 idea titles this builds on / fuses' },
          whatShips: { type: 'string', description: 'The concrete deliverable at the end of the autonomous run' },
          whySignificant: { type: 'string' },
          autonomousPlan: { type: 'array', items: { type: 'string' }, description: 'Rough ordered phases a workflow would execute' },
          verification: { type: 'string', description: 'Exactly how the workflow proves it works with no human' },
          risks: { type: 'string' },
          scope: { type: 'string', enum: ['S','M','L','XL'] },
        },
      },
    },
  },
}

const SLATE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['candidates'],
  properties: {
    candidates: {
      type: 'array', minItems: 5, maxItems: 8,
      items: {
        type: 'object', additionalProperties: false,
        required: ['name','pitch','whatShips','whySignificant','autonomousPlan','verification','risks','scope','sourceAngles'],
        properties: {
          name: { type: 'string' },
          pitch: { type: 'string' },
          whatShips: { type: 'string' },
          whySignificant: { type: 'string' },
          autonomousPlan: { type: 'array', items: { type: 'string' } },
          verification: { type: 'string' },
          risks: { type: 'string' },
          scope: { type: 'string', enum: ['S','M','L','XL'] },
          sourceAngles: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['candidateName','scores','overall','rationale','redFlags','improvements'],
  properties: {
    candidateName: { type: 'string' },
    scores: {
      type: 'object', additionalProperties: false,
      required: ['significance','autonomousImplementability','verifiability','visionFit','safety','scopeFit'],
      properties: {
        significance: { type: 'integer', minimum: 1, maximum: 10, description: 'How much it advances the project' },
        autonomousImplementability: { type: 'integer', minimum: 1, maximum: 10, description: 'Can a workflow build it end-to-end with no human' },
        verifiability: { type: 'integer', minimum: 1, maximum: 10, description: 'Can success be proven WITHOUT the human fun-gate or new art' },
        visionFit: { type: 'integer', minimum: 1, maximum: 10, description: 'Fit with cozy asymmetric co-op + conventions' },
        safety: { type: 'integer', minimum: 1, maximum: 10, description: 'Low blast radius / unlikely to break Freeze Stars etc. Higher = safer' },
        scopeFit: { type: 'integer', minimum: 1, maximum: 10, description: 'Right size for one focused autonomous run' },
      },
    },
    overall: { type: 'integer', minimum: 1, maximum: 10 },
    rationale: { type: 'string' },
    redFlags: { type: 'array', items: { type: 'string' } },
    improvements: { type: 'array', items: { type: 'string' } },
  },
}

// ---------- Phase 1: Map ground truth ----------
phase('Map')
const READERS = [
  { key: 'game-client', focus: 'The Phaser GAME client. Read src/game/ exhaustively: main.ts, scenes/ (Boot, Lobby, Hub, Planet), entities/ (Astronaut, Enemy — and check whether any Starglow companion entity actually exists), planets/ (planet1 config + PlanetConfig type), net/client.ts. Report exactly what is implemented vs aspirational, how PlanetScene/castPower/win-screen/hub-unlock work today, and what is easy vs hard to extend or verify headlessly.' },
  { key: 'phone-client', focus: 'The React PHONE client. Read src/phone/ exhaustively: main.tsx, App.tsx (the Phase state machine), components/ (RoomJoin, Spellbook) and components/puzzles/ (QuickMath, TapSequence, Trivia). Report the exact puzzle component contract, how puzzles are wired to powers, the inline-style palette in use, and how easily puzzle logic could be unit-tested or driven headlessly.' },
  { key: 'protocol-relay', focus: 'The wire boundary. Read src/shared/protocol.ts and server/server.ts and both net/client.ts files. Report the full message set, the four-side power invariant, what the relay does and does NOT do, and CRITICALLY: what classes of new feature would force a protocol change or relay change (e.g. richer power payloads, shared authoritative state, presence, reconnection) vs what stays purely client-side.' },
  { key: 'project-roadmap', focus: 'The roadmap and intent. Read BACKLOG.md, docs/ideas/specialization.md, CLAUDE.md, README.md, PROJECT_GUIDE.md, and (via bash) ~/.claude/plans/i-ve-started-this-in-fluttering-tiger.md. Report what is planned/deferred/done, the stated milestones (M4/M5), the explicit constraints and do-or-do-not rules, the open questions (persistence, etc.), and which planned directions are highest-leverage.' },
  { key: 'autonomy-testability', focus: 'AUTONOMOUS-SHIPPABILITY. Read package.json, tsconfig.json, vite.config.ts, and scan for ANY existing test setup. Report: the exact npm scripts, what typecheck/build verify, whether there is any test runner/headless browser, the asset-dependency situation (are there real assets or all generated textures?), and a concrete assessment of WHAT KINDS OF FEATURES could be fully verified by a workflow with no human — and what verification scaffolding (test harness, headless puzzle solver, deterministic seeding, Playwright smoke) is currently missing but would be cheap to add within the locked stack.' },
]
const groundTruth = (await parallel(READERS.map(r => () =>
  agent(BRIEF + '\n\nYou are a codebase ground-truth mapper. Working dir is the Constellation repo root. ' + r.focus + '\n\nRead the ACTUAL code/files — do not trust the brief where code can be checked. Be concrete and cite file paths. Your output feeds a brainstorm about what significant, autonomously-shippable advancement to build next.',
  { label: 'map:' + r.key, phase: 'Map', agentType: 'Explore', schema: GT_SCHEMA })
))).filter(Boolean)

const gtDigest = groundTruth.map(g =>
  '### ' + g.subsystem + '\n' +
  'Findings:\n' + g.findings.map(f => '  - ' + f.topic + ': ' + f.detail).join('\n') + '\n' +
  'Gaps: ' + (g.gaps||[]).join(' | ') + '\n' +
  'Autonomy signals: ' + (g.autonomySignals||[]).join(' | ') + '\n' +
  'Ground-truth corrections: ' + (g.groundTruthCorrections||[]).join(' | ')
).join('\n\n')
log('Mapped ' + groundTruth.length + ' subsystems. Generating ideas across 8 lenses...')

// ---------- Phase 2: Ideate across diverse lenses ----------
phase('Ideate')
const LENSES = [
  { key: 'mechanics-powers', prompt: 'NEW MECHANICS & POWERS. New powers (4th+), power combos/synergies, enemy variety & AI, level hazards, movement abilities for the astronaut, new puzzle types that pair with them. Lean on the proven four-side power pattern.' },
  { key: 'content-pipeline', prompt: 'CONTENT SCALE & PIPELINE. Getting from 1 planet to many: Planet 2 (ice) / Planet 3 (library), themed power/puzzle variants, a level/planet authoring pipeline, procedural/seeded planet generation, a planet-progression arc. What multiplies content without bespoke art?' },
  { key: 'game-feel-companion', prompt: 'GAME FEEL, JUICE & THE STARGLOW COMPANION. The companion orb as a real on-screen entity (it is in the design but may not be built); particles, camera follow/lerp, screen shake, cast telegraphs, procedurally-SYNTHESIZED audio via the Web Audio API (assetless, code-only SFX/music). Emphasize how each is programmatically verifiable.' },
  { key: 'meta-progression', prompt: 'META-PROGRESSION & PERSISTENCE. The deferred talent-tree/specialization (phone-side, accommodation vs strength branches), localStorage save state, planet unlocks that persist, run stats, a constellation-themed progression UI. Persistence is currently in-memory only — this lens may need to ship the persistence foundation.' },
  { key: 'netcode-multiplayer', prompt: 'NETCODE & MULTIPLAYER ROBUSTNESS. Reconnection (a known gap), session resume, presence/heartbeat, spectators, 3+ players (multiple phones / co-op puzzles), shared authoritative room state, latency-hiding. Note honestly which of these force relay/protocol changes vs stay client-side.' },
  { key: 'dev-autonomy-foundation', prompt: 'DEV INFRASTRUCTURE & THE AUTONOMOUS-TEST FOUNDATION. This is the lens that directly serves the meta-goal: a headless test harness, puzzle-solver bots, a scriptable end-to-end planet playthrough, deterministic seeding, a Playwright (or similar) smoke suite, CI, an automated "playtest bot" that drives a full cast loop. Treat building the verification substrate itself as a candidate advancement — it unblocks every future autonomous feature.' },
  { key: 'onboarding-accessibility', prompt: 'ONBOARDING, ACCESSIBILITY & DIFFICULTY. A tutorial/first-contact planet, dynamic or selectable difficulty, the accommodation branch (meet players where they struggle), colorblind-safe palette, hints, the cozy/low-twitch framing. What raises the floor for a real couple playing for the first time?' },
  { key: 'novel-asymmetric-wow', prompt: 'NOVEL ASYMMETRIC "WOW". Design space unique to phone+laptop asymmetry that nobody has used here: second-screen mechanics (phone as map/radar/scanner of the laptop world), draw-a-constellation gesture casting, phone tilt/gyro/touch as power modifiers, the companion influencing the world in real time (not just discrete casts), timed two-player coordination puzzles, fog-of-war the phone clears. Push for the distinctive portfolio moment — but pair each with a concrete verification strategy.' },
]
const ideaResults = (await parallel(LENSES.map(l => () =>
  agent(BRIEF + '\n\n--- GROUND TRUTH FROM CODEBASE ---\n' + gtDigest + '\n--- END GROUND TRUTH ---\n\nYou are an ideation specialist working the lens: ' + l.prompt + '\n\nGenerate 2-4 candidate "significant advancements" for THIS project through your lens. Each must be concrete, fit the locked stack and the extend-do-not-refactor ethos, and — most importantly — be scoped so a fully-autonomous workflow could PLAN/BUILD/TEST/REPORT it with NO human. For every idea, the autonomousBuildAndVerify field MUST give a real, specific way to verify success without the human fun-gate and without new art assets. Prefer ambition that is still verifiable over safe-but-trivial.',
  { label: 'ideate:' + l.key, phase: 'Ideate', schema: IDEA_SCHEMA })
))).filter(Boolean)

const ideaPool = ideaResults.flatMap(r => (r.ideas||[]).map(i => Object.assign({ lens: r.lens }, i)))
const poolDigest = ideaPool.map((i, n) =>
  '[' + (n+1) + '] (' + i.lens + ') "' + i.title + '" — ' + i.oneLiner + '\n    What: ' + i.what + '\n    Significant: ' + i.whySignificant + '\n    Build+Verify: ' + i.autonomousBuildAndVerify + '\n    Scope: ' + i.roughScope + ' | Risks: ' + i.risks
).join('\n\n')
log(ideaPool.length + ' raw ideas generated. Cross-pollinating into candidates...')

// ---------- Phase 3: Synthesize / cross-pollinate ----------
phase('Synthesize')
const ANGLES = [
  { key: 'most-shippable', angle: 'MOST AUTONOMOUSLY-SHIPPABLE-AND-VERIFIABLE. Optimize purely for the meta-goal: the candidate a workflow is most likely to fully complete AND prove correct with zero human input. Verification rigor is the top priority.' },
  { key: 'biggest-fun-leap', angle: 'BIGGEST LEAP IN THE CORE ASYMMETRIC FUN. What most improves the actual experience of two people playing together — making the cast loop more rewarding, more cooperative, more cozy — while still being verifiable.' },
  { key: 'portfolio-wow', angle: 'MOST DISTINCTIVE / PORTFOLIO WOW. The candidate that makes someone say "whoa, I have not seen that before" — leaning into the unique phone+laptop asymmetry — without sacrificing autonomous verifiability.' },
  { key: 'highest-leverage-foundation', angle: 'HIGHEST-LEVERAGE FOUNDATION. The platform investment that unlocks the most future work (e.g. a content pipeline, a test/verification substrate, a persistence layer, or a companion/effects framework). What pays off across many future milestones?' },
]
const refinedResults = (await parallel(ANGLES.map(a => () =>
  agent(BRIEF + '\n\n--- GROUND TRUTH ---\n' + gtDigest + '\n\n--- THE FULL IDEA POOL (' + ideaPool.length + ' ideas from 8 lenses) ---\n' + poolDigest + '\n--- END POOL ---\n\nYou are a synthesis architect with the angle: ' + a.angle + '\n\nDo NOT just pick favorites. COMBINE, FUSE, and UPGRADE ideas from the pool into 2-3 strong, coherent candidate advancements (each a single focused milestone the autonomous workflow would target). Each candidate should explicitly cite which pool ideas it draws from and weave them into something better than any single idea. Give a realistic ordered autonomousPlan and a concrete verification strategy that needs no human. Be honest about scope — right-size for one autonomous run.',
  { label: 'synth:' + a.key, phase: 'Synthesize', schema: REFINED_SCHEMA })
))).filter(Boolean)

const rawCandidates = refinedResults.flatMap(r => (r.candidates||[]).map(c => Object.assign({ angle: r.angle }, c)))
const candDigest = rawCandidates.map((c, n) =>
  '[' + (n+1) + '] (angle: ' + c.angle + ') "' + c.name + '" [' + c.scope + ']\n    Pitch: ' + c.pitch + '\n    Ships: ' + c.whatShips + '\n    Significant: ' + c.whySignificant + '\n    Combines: ' + (c.combinesIdeas||[]).join(', ') + '\n    Plan: ' + (c.autonomousPlan||[]).join(' -> ') + '\n    Verify: ' + c.verification + '\n    Risks: ' + c.risks
).join('\n\n')
log(rawCandidates.length + ' candidates from 4 angles. Curating into a distinct slate...')

// ---------- Phase 4a: Curate into a deduplicated slate ----------
phase('Curate')
const slateResult = await agent(
  BRIEF + '\n\n--- GROUND TRUTH ---\n' + gtDigest + '\n\n--- ' + rawCandidates.length + ' RAW CANDIDATES (from 4 synthesis angles, expect overlap) ---\n' + candDigest + '\n--- END ---\n\nYou are the curator. Merge near-duplicates and consolidate the raw candidates into a clean slate of 5-8 DISTINCT advancement candidates that span the space (do not let one theme dominate). Preserve the best framing, plan, and verification strategy from the merged sources. Each surviving candidate must be a single focused milestone that a fully-autonomous workflow could realistically PLAN/BUILD/TEST/REPORT with no human, and must carry a concrete no-human verification strategy. Keep the distinct strategic flavors (e.g. a pure-foundation play, a fun-loop play, a wow play) represented.',
  { label: 'curate:slate', phase: 'Curate', schema: SLATE_SCHEMA }
)
const slate = (slateResult && slateResult.candidates) ? slateResult.candidates : []
log('Curated to ' + slate.length + ' distinct candidates. Convening the judge panel...')

// ---------- Phase 4b: Adversarial judge panel ----------
phase('Judge')
const JUDGES = [
  { key: 'autonomy-skeptic', lens: 'THE AUTONOMY & VERIFIABILITY SKEPTIC. Be harsh. Could a workflow REALLY finish this with zero human input, and PROVE it works without the human fun-gate or new art? Hunt for hidden human-taste dependencies, un-testable "feel", and verification hand-waving. Default to low verifiability scores unless the strategy is genuinely concrete.' },
  { key: 'product-vision', lens: 'THE PRODUCT & VISION JUDGE. Does this actually make Constellation better as a cozy asymmetric co-op game a real couple would enjoy? Does it respect the asymmetry, the cozy/low-twitch framing, and both-players-load-bearing? Does it fit conventions, or fight them?' },
  { key: 'engineering-risk', lens: 'THE ENGINEERING & RISK JUDGE. Assess scope realism for one autonomous run, blast radius (could it break Freeze Stars / the four-side invariant / the dumb relay?), dependency discipline (locked stack), and technical soundness. Reward clean fits; penalize sprawling refactors.' },
]
const judged = (await parallel(slate.map(cand => () =>
  parallel(JUDGES.map(j => () =>
    agent(BRIEF + '\n\n--- GROUND TRUTH ---\n' + gtDigest + '\n\n--- CANDIDATE UNDER REVIEW ---\nName: ' + cand.name + '\nPitch: ' + cand.pitch + '\nShips: ' + cand.whatShips + '\nWhy significant: ' + cand.whySignificant + '\nAutonomous plan: ' + (cand.autonomousPlan||[]).join(' -> ') + '\nVerification: ' + cand.verification + '\nRisks: ' + cand.risks + '\nScope: ' + cand.scope + '\n--- END ---\n\nYou are ' + j.lens + '\n\nScore this candidate on all six dimensions (1-10) and give an overall (1-10). Be specific and critical; surface red flags and concrete improvements. Your overall should reflect the meta-goal: a great candidate is significant AND fully autonomously buildable AND verifiable with no human.',
      { label: 'judge:' + j.key + ':' + cand.name.slice(0,24), phase: 'Judge', schema: VERDICT_SCHEMA })
  )).then(vs => ({ candidate: cand, verdicts: vs.filter(Boolean) }))
))).filter(Boolean)

const DIMS = ['significance','autonomousImplementability','verifiability','visionFit','safety','scopeFit']
const scored = judged.map(j => {
  const vs = j.verdicts
  const n = vs.length || 1
  const dimAvg = {}
  for (const d of DIMS) dimAvg[d] = +(vs.reduce((s,v)=>s+((v.scores&&v.scores[d])||0),0)/n).toFixed(2)
  const overallAvg = +(vs.reduce((s,v)=>s+(v.overall||0),0)/n).toFixed(2)
  const allFlags = vs.flatMap(v => v.redFlags||[])
  const allImprovements = vs.flatMap(v => v.improvements||[])
  return { name: j.candidate.name, candidate: j.candidate, dimAvg, overallAvg, judgeCount: n, redFlags: allFlags, improvements: allImprovements, rationales: vs.map(v=>v.rationale) }
})
scored.sort((a,b) => b.overallAvg - a.overallAvg)
log('Judging complete. Top candidate: "' + (scored[0] && scored[0].name) + '" (' + (scored[0] && scored[0].overallAvg) + '). Writing final report...')

// ---------- Phase 5: Final ranked shortlist report ----------
phase('Report')
const rankedDigest = scored.map((s, n) =>
  '#' + (n+1) + ' "' + s.name + '" — overall ' + s.overallAvg + '/10 (' + s.judgeCount + ' judges)\n' +
  '   scores: significance ' + s.dimAvg.significance + ' | autonomy ' + s.dimAvg.autonomousImplementability + ' | verifiability ' + s.dimAvg.verifiability + ' | visionFit ' + s.dimAvg.visionFit + ' | safety ' + s.dimAvg.safety + ' | scopeFit ' + s.dimAvg.scopeFit + '\n' +
  '   ships: ' + s.candidate.whatShips + '\n' +
  '   verify: ' + s.candidate.verification + '\n' +
  '   plan: ' + (s.candidate.autonomousPlan||[]).join(' -> ') + '\n' +
  '   red flags: ' + ([...new Set(s.redFlags)].slice(0,6).join(' | ') || 'none noted') + '\n' +
  '   improvements: ' + ([...new Set(s.improvements)].slice(0,6).join(' | ') || 'none noted')
).join('\n\n')

const report = await agent(
  BRIEF + '\n\n--- GROUND TRUTH ---\n' + gtDigest + '\n\n--- RANKED, JUDGED CANDIDATES ---\n' + rankedDigest + '\n--- END ---\n\nYou are the lead synthesizer writing the final brainstorm report for the project owner (a solo dev building this as a portfolio piece). The owner will read this, PICK one direction, and then we will design an autonomous workflow prompt to build it.\n\nWrite a tight, decision-ready markdown report:\n1. A 2-3 sentence framing of the strategic choice in front of them (the real tension is significance/fun vs. how autonomously-verifiable a thing is given there are zero tests today).\n2. A "Top Recommendations" section detailing the BEST 3-4 candidates. For each: a punchy name, the one-paragraph pitch, why it is significant, exactly what ships, the concrete no-human verification story, rough autonomous build phases, key risks, and an honest scope. Note where a candidate could be combined with another.\n3. A short "Also considered" list (one line each) for the rest.\n4. A crisp closing recommendation: if you had to pick ONE for a first fully-autonomous run, which and why — and call out that several candidates pair naturally (e.g. a verification-foundation play makes every later gameplay play safely autonomous).\n\nBe concrete and opinionated. This is for a human to choose from, so make the tradeoffs legible.',
  { label: 'report:final', phase: 'Report' }
)

return {
  report,
  ranked: scored.map(s => ({ name: s.name, overall: s.overallAvg, dims: s.dimAvg, ships: s.candidate.whatShips, verification: s.candidate.verification, plan: s.candidate.autonomousPlan, scope: s.candidate.scope, redFlags: [...new Set(s.redFlags)] })),
  counts: { subsystems: groundTruth.length, ideas: ideaPool.length, rawCandidates: rawCandidates.length, slate: slate.length },
}
