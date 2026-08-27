/**
 * Constellation's architecture spec — dependency-conformance gate (issue #44).
 *
 * This file IS the specification. Every rule below encodes a boundary Kyle
 * intends to hold, drafted from CLAUDE.md's stated constraints and approved
 * rule-by-rule before it landed. It is deliberately NOT a baseline of the
 * current import graph: no `--ignore-known` file exists, and none should be
 * created. When a rule fires, the finding is a decision for Kyle — fix the
 * code, or amend the rule — never something to silence.
 *
 * Report-only during the pilot: run by hand via `npm run gate:deps`. No hook,
 * no CI, no pre-push wiring. A non-zero exit means "violations found" and is
 * the machine-readable signal a merge-proposing session cites as Preflight
 * evidence; nothing consumes it as a block. Promotion to a blocking gate is
 * Kyle's explicit, separate call (see claude-config's ADR 0001).
 *
 * `tsPreCompilationDeps: true` is load-bearing: src/shared/protocol.ts is a
 * types-only module, so most edges into it are `import type` and would be
 * invisible to a post-compilation graph.
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ---- Module boundaries between the three apps -------------------------
    {
      name: 'game-never-imports-phone',
      comment:
        'The laptop game client and the phone client are separate apps that only ever ' +
        'meet on the wire. Anything both sides need is a wire type in src/shared/protocol.ts.',
      severity: 'error',
      from: { path: '^src/game/' },
      to: { path: '^src/phone/' },
    },
    {
      name: 'phone-never-imports-game',
      comment:
        'The mirror of game-never-imports-phone. A phone component reaching into a Phaser ' +
        'scene or a planet config means shared state that has no wire message behind it.',
      severity: 'error',
      from: { path: '^src/phone/' },
      to: { path: '^src/game/' },
    },
    {
      name: 'shared-imports-nothing',
      comment:
        'src/shared/ holds wire message types and nothing else. It is imported by both ' +
        'clients, the relay, and the smoke harness, so anything it pulls in becomes a ' +
        'dependency of all four. It must stay a leaf — no app modules, no npm packages, ' +
        'no node builtins.',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { pathNot: '^src/shared/' },
    },
    {
      name: 'relay-only-touches-the-protocol',
      comment:
        'The relay is an allowlist forwarder with no game logic. The only first-party code ' +
        'it may import is src/shared/protocol.ts; reaching into src/game/ or src/phone/ ' +
        'means game state has leaked into the server.',
      severity: 'error',
      from: { path: '^server/' },
      to: { path: '^src/', pathNot: '^src/shared/' },
    },
    {
      name: 'relay-stays-framework-free',
      comment:
        'The package-level twin of relay-only-touches-the-protocol: the relay runs on bare ' +
        'node + ws. Phaser, React, or Vite appearing in server/ means rendering or client ' +
        'concerns have crossed into the server.',
      severity: 'error',
      from: { path: '^server/' },
      to: { path: '^node_modules/(phaser|react|react-dom|vite)/' },
    },
    {
      name: 'nothing-depends-on-scripts',
      comment:
        'scripts/ holds dev harnesses (smoke-relay, the CRAP report). They are leaves that ' +
        'consume the app; shipped code importing one would drag a harness into the bundle.',
      severity: 'error',
      from: { path: '^(src|server)/' },
      to: { path: '^scripts/' },
    },

    // ---- Boundaries inside the game client --------------------------------
    {
      name: 'entities-never-import-scenes',
      comment:
        'Entities are thin sprite wrappers a scene owns and drives. An entity importing a ' +
        'scene inverts that ownership and makes the entity un-reusable across planets.',
      severity: 'error',
      from: { path: '^src/game/entities/' },
      to: { path: '^src/game/scenes/' },
    },
    {
      name: 'planet-configs-stay-data',
      comment:
        'Planet configs are data the registry orders and Planet.ts interprets. Importing a ' +
        'scene, an entity, the socket, or the juice tables would turn declarative layout ' +
        'data into behavior that only runs inside a live Phaser scene.',
      severity: 'error',
      from: { path: '^src/game/planets/' },
      to: { path: '^src/game/(scenes|entities|net|juice)/' },
    },
    {
      name: 'progression-stays-framework-free',
      comment:
        'progression/ is the persistence + telemetry module, and it is unit-testable ' +
        'precisely because it touches no framework. Importing Phaser, a scene, an entity, ' +
        'or the juice layer would put it back behind the playtest gate.',
      severity: 'error',
      from: { path: '^src/game/progression/' },
      to: { path: '^src/game/(scenes|entities|juice)/|^node_modules/phaser/' },
    },

    // ---- Cross-cutting repo conventions -----------------------------------
    {
      name: 'no-circular',
      comment:
        'A cycle means neither module can be understood, tested, or replaced on its own.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-style-imports',
      comment:
        'The phone client is inline-style-only by convention: no CSS files, no frameworks, ' +
        'no style imports. This is the one repo rule tsc cannot see at all.',
      severity: 'error',
      from: { pathNot: '^node_modules' },
      to: { path: '\\.(css|scss|sass|less|styl)$' },
    },
    {
      name: 'no-dev-deps-in-shipped-code',
      comment:
        'Shipped code (src/ and server/, excluding colocated tests) must not import a ' +
        'devDependency — it would resolve in dev and break the built bundle or the ' +
        'deployed relay.',
      severity: 'error',
      from: { path: '^(src|server)/', pathNot: '\\.test\\.ts$' },
      to: { dependencyTypes: ['npm-dev'], dependencyTypesNot: ['type-only'] },
    },
  ],

  options: {
    // node_modules is *not followed* but is deliberately still *in the graph*:
    // excluding it would drop every npm edge and silently make the package-level
    // rules (relay-stays-framework-free, no-dev-deps-in-shipped-code, phaser in
    // progression) match nothing at all. A vacuous rule is worse than no rule.
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '^dist' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
