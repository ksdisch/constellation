# Deploy-And-Ops

## Purpose
Answers "what does deployment actually entail, what's genuinely done vs. still open, and what risks exist?" This synthesizes `docs/DEPLOY.md` (the walkthrough), `docs/m5-deploy-plan.md` (the original plan + deliberate cuts), `Decisions.md` (open decisions that affect deploy), and `docs/AUDIT-2026-07-09.md` Phase 6 findings — which `docs/DEPLOY.md` does not mention. The walkthrough alone gives the commands; this page gives the context.

## Key understanding

### What M5 shipped (deploy-readiness groundwork)

**Fact** ([`docs/m5-deploy-plan.md`](../docs/m5-deploy-plan.md), [`docs/DEPLOY.md`](../docs/DEPLOY.md)): M5 delivered everything up to the credentialed finish:
- `VITE_RELAY_URL` build-time override on both net clients (unset → LAN inference unchanged; `npm run dev` is byte-identical)
- Relay wrapped in `node:http` so it serves both `GET /healthz` and WS upgrades on a single port — what a TLS-terminated `http_service` needs
- `Dockerfile` + `.dockerignore` + `fly.toml` (force_https, `/healthz` health check, scale-to-zero with `min_machines_running = 0`)
- `npm run start:relay` (the container CMD, honors `$PORT`)
- `npm run smoke:relay` (real-socket harness: boots the relay, asserts health + full boosted-cast round-trip)
- `docs/DEPLOY.md` (four-step walkthrough: relay → Fly, clients → itch.io, env wiring, e2e check)

**Fact** ([`docs/DEPLOY.md`](../docs/DEPLOY.md)): `docs/DEPLOY.md` was called out as "impressively accurate" by the 2026-07-09 audit — every concrete claim spot-checked held. The commands, URLs, and TLS reasoning are trustworthy.

### What remains account-gated (the one-command finish)

**Fact** ([`BACKLOG.md`](../BACKLOG.md), [`PROJECT.md`](../PROJECT.md)): The actual `fly deploy` and itch.io upload require Kyle's Fly + itch.io accounts. This is the Open BACKLOG item "Deploy — push the relay + clients to a public host." The step-by-step is in `docs/DEPLOY.md`.

**Fact** ([`docs/DEPLOY.md`](../docs/DEPLOY.md)): Correct deploy order matters because the relay URL is baked into the client bundle at build time:
1. Deploy the relay → get its `wss://` URL
2. Build the clients with `VITE_RELAY_URL=wss://<app>.fly.dev`
3. Upload `dist/` to itch.io

If the URL is not baked in, clients infer `ws[s]://<page-host>:3081` — wrong for a deployed static host.

### Open decisions that affect the deploy

**Fact** ([`Decisions.md`](../Decisions.md), D6): The Docker slim approach is Unresolved. The current image ships `tsx` as a dev dependency; `--omit=dev` during `npm ci` drops `tsx`, breaking the relay start. Two options documented: (a) move `tsx` to `dependencies` (simple, larger image) vs. (b) esbuild-bundle the relay and run plain `node` (smallest image, faster cold starts). D6 notes this "only matters at deploy time — decide with Phase 6."

**Fact** ([`Decisions.md`](../Decisions.md), D8): Audit Phase 6 findings deliberately ride the actual deploy — the phase's gate needs the deploy context. These are not optional polish; they address real operational risks.

### Phase 6 audit findings (not in docs/DEPLOY.md)

**Fact** ([`docs/AUDIT-2026-07-09.md`](../docs/AUDIT-2026-07-09.md) §Phase 6, F-34): The relay's `fly.toml` currently has no machine-count pin. Fly's default HA configuration could spin up 2 machines. Rooms are in-process — a game's room on machine A and a phone on machine B would produce "room not found." Fix: `fly scale count 1` (and document it in `docs/DEPLOY.md`). This is the most operationally significant unfixed finding for a public deploy.

**Fact** ([`docs/AUDIT-2026-07-09.md`](../docs/AUDIT-2026-07-09.md), F-60): Relay Docker image ships ~296 MB of `node_modules` for a ~200 KB runtime dep. This increases cold-start time on scale-to-zero (the default `fly.toml` setting). D6 tracks the fix options.

**Fact** ([`docs/AUDIT-2026-07-09.md`](../docs/AUDIT-2026-07-09.md), F-61): Dockerfile hygiene: missing `USER node` (runs as root), `CMD` uses `npm` as PID 1 (npm forwards signals poorly vs direct `node`/`tsx`), test files not in `.dockerignore`. These are independent of D6 and can land alongside the deploy.

**Fact** ([`docs/AUDIT-2026-07-09.md`](../docs/AUDIT-2026-07-09.md), F-37, F-38b, F-39): Three optional hardening items: role-blind forwarding (benign per audit — traced end-to-end, worst case a mischievous peer mints phone-local stardust), join-rate-limit / Origin check (no cap on join attempts per socket on a public endpoint), structured one-line JSON logs (would make Fly log grepping useful). All classified P3 (polish) and optional until deploy.

### What is already solid (do not re-examine)

**Fact** ([`docs/AUDIT-2026-07-09.md`](../docs/AUDIT-2026-07-09.md) §"What's genuinely solid"): The audit specifically called out the deploy alignment as solid: "the deploy alignment (healthz ↔ fly.toml ↔ PORT ↔ Dockerfile)" — these four items already agree correctly. The relay's `GET /healthz` → `fly.toml` health check → `$PORT` binding → `Dockerfile CMD` chain is consistent.

**Fact** ([`docs/DEPLOY.md`](../docs/DEPLOY.md)): `?solo=1` still works on the deployed game (skips the relay entirely — the relay is only needed for the real two-client path). `?test=1` also works on deploy.

**Fact** ([`docs/DEPLOY.md`](../docs/DEPLOY.md)): itch.io serves over `https`, so the relay must be `wss`. Fly's `force_https` in `fly.toml` ensures this. A mixed `ws`-from-`https` page is blocked by browsers.

### Local verification (no accounts needed)

**Fact** ([`docs/DEPLOY.md`](../docs/DEPLOY.md)): Two commands exercise the deploy path without accounts:
```bash
npm run smoke:relay                               # boots real relay, asserts health + round-trip
VITE_RELAY_URL=wss://example.test npm run build   # confirms URL bakes into both bundles
```
CI runs both on every PR/main push (Decision D1, Approved 2026-07-11, landed Phase 4 PR #30).

## Sources
- [`docs/DEPLOY.md`](../docs/DEPLOY.md)
- [`docs/m5-deploy-plan.md`](../docs/m5-deploy-plan.md)
- [`docs/AUDIT-2026-07-09.md`](../docs/AUDIT-2026-07-09.md) (§Phase 6 + F-34, F-37, F-38b, F-39, F-60, F-61)
- [`Decisions.md`](../Decisions.md) (D6, D8)
- [`BACKLOG.md`](../BACKLOG.md) (Deploy Open item + M5 Done note)
- [`fly.toml`](../fly.toml)
- [`Dockerfile`](../Dockerfile)

## Uncertainties & contradictions

**Unresolved** (D6): Docker slim approach not decided. The image size / cold-start cost is real but only becomes user-visible after the deploy.

**Unresolved** (F-34): Multi-machine HA risk is the highest-priority deploy-time finding not yet landed. `fly scale count 1` is the fix; it should be the first command run after `fly deploy`.

**Unresolved** (D8): Phase 6 scope (F-34, F-37, F-38b, F-39, F-60, F-61) deliberately rides the actual deploy. None of these are CI-blocked — they need the live deploy context.

None identified as contradictions between `docs/DEPLOY.md` and the other sources.

## Related pages
- [Milestone-Feature-Map](Milestone-Feature-Map.md)
- [Puzzle-and-Planet-Data-Model](Puzzle-and-Planet-Data-Model.md)
- [History](History.md)

## Relevance to current work
The deploy is one of the two open BACKLOG items. The walkthrough in `docs/DEPLOY.md` is accurate and actionable. Before running `fly deploy`, review this page's Phase 6 findings — particularly F-34 (machine count) — and resolve D6 (Docker slim). The fun-gate playtest (the other open item) should ideally run before the public deploy, but the audit's Phase 2 fixes make it finally worth running now regardless of deploy order.

_Last reviewed: 2026-07-26_
