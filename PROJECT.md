# PROJECT.md

## Purpose
Constellation is an asymmetric cozy co-op game for two: one player platforms through tiny planet worlds on the laptop (Phaser), the other solves quick puzzles on their phone (React) to cast tactical powers that reshape the world — glued together by a small `ws` relay.

## Scope
**In scope (current phase — post-M13 tail):**
- The two open BACKLOG items: (1) the fun-gate playtest with the real audience, (2) the credentialed public deploy (relay → Fly, clients → itch.io), with audit Phase 6 (deploy hardening) deliberately riding the deploy.

**Out / deferred:**
- Procedural planet generation (the M10 rhythm-portrait wedge landed telemetry-first; generation waits until the portrait proves itself — see `docs/ideas/planet-that-knows-you-two.md`)
- Role specialization exploration (`docs/ideas/specialization.md`)
- New dependencies (stack is locked), relay rewrite, power-architecture rework, code-splitting, major-version upgrades (all explicitly left alone by the 2026-07-09 audit plan)

## Current status
**Active** (nothing in flight). Playable end-to-end: galaxy hub, three planets, four powers, talent constellation, rhythm portrait, procedural audio + master mute. M11 shipped; M13 hardening (audit Phases 0–5) landed 2026-07-11; audit Phase 6 waits for the deploy. Last commit 2026-07-17 (vendored Claude Code tooling, PR #33).

## Next actions
1. Run the fun-gate playtest (BACKLOG Open) — one full co-op session: handshake → hub → planets 1–3 with real phone casts → spend stardust → read the portrait. Phase 2 of the audit fixed the feel bugs, so this is finally worth running. Human-gated (needs the partner).
2. Credentialed deploy (BACKLOG Open) — `fly deploy` the relay, build clients with `VITE_RELAY_URL`, upload `dist/` to itch.io, doing audit Phase 6 alongside. Account-gated (needs Kyle's Fly + itch.io accounts). Walkthrough: `docs/DEPLOY.md`.

## Boundaries
- **Stack locked:** Phaser 3, React 19, `ws`, Vite, tsx, TypeScript (strict). Adding anything else is a real decision.
- **Strict boundaries:** `src/shared/` holds only `protocol.ts` (wire types); the relay is an allowlist forwarder with zero game logic; protocol changes must land in both clients in the same commit.
- **Phone UI:** inline styles only, fixed palette, ≥44px touch targets.
- **Testing:** Vitest for pure framework-free logic only; the human playtest remains the integration gate for game feel; the `?test=1` bridge covers headless gameplay verification (`docs/AUTONOMY.md`).
- **Account/human gates:** deploy needs Kyle's Fly + itch.io accounts; the playtest needs his partner.
