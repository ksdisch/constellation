# M5 — Deploy readiness ("the ship")

Goal: make Constellation deployable to a public host so it can leave the LAN.
The autonomous scope is **everything up to the final `fly deploy` / itch.io
upload**, which needs the user's own accounts (autonomy boundary). After this
work, shipping is a documented one-command finish.

## The two blockers (from the survey)

1. **Clients hardcode the relay URL.** Both `src/game/net/client.ts` and
   `src/phone/net/client.ts` derive `ws://<page-host>:3081`. On a deployed
   client (itch.io static host) the relay lives on a *different* host and on the
   TLS port (443 / `wss`), so the inferred URL is wrong. Need a build-time
   override.
2. **The relay has no host config.** No container, no health endpoint (a bare
   `WebSocketServer({ port })` serves no HTTP, so platform health checks fail),
   no `fly.toml`. Can't be deployed as-is.

## Plan (sequenced)

1. **Env-driven relay URL.** Add `VITE_RELAY_URL` support to both net clients:
   if set at build time, use it verbatim; otherwise fall back to the current LAN
   inference (so `npm run dev` is byte-identical). Type `import.meta.env` via a
   new `src/vite-env.d.ts`. Ship `.env.example` documenting the var.
2. **Relay: single-port HTTP + WS with a health endpoint.** Attach the
   `WebSocketServer` to a `node:http` server that answers `GET /` (and
   `/healthz`) with `200 ok`. Same port for HTTP and the WS upgrade — exactly
   what a platform `http_service` wants (one internal port, TLS-terminated,
   WebSocket upgrade forwarded). Relay forwarding logic is untouched.
3. **Containerization + Fly config.** `Dockerfile` (Node, `npm ci`, run the
   relay via `tsx`), `.dockerignore`, `fly.toml` (`http_service` on the internal
   port, `force_https` so clients use `wss`). Add a `start:relay` script.
4. **Real-socket smoke.** `scripts/smoke-relay.ts` (run via `tsx`) spins up the
   relay, connects a fake game + phone over real sockets, and asserts the full
   round-trip: create-room → join → boosted cast → `power-cast` → planet-complete
   + the new health endpoint. Wired as `npm run smoke:relay`.
5. **Docs.** `docs/DEPLOY.md` (relay → Fly, client → itch.io/static, env wiring,
   end-to-end test), README status bump, BACKLOG tidy (mark hub/persistence
   shipped; move Deploy to reflect groundwork done + the boundary).

## Verification (autonomous)

- `npm run typecheck` clean, `npm run test` green (105 + any new).
- `npm run smoke:relay` passes against the real http+ws relay.
- A **production-style client build** with `VITE_RELAY_URL` set, served by
  `vite preview`, plus the relay running with the new health endpoint — confirm
  the built bundle targets the configured relay (no LAN inference leak) and the
  health endpoint answers.

## Autonomy boundary

The actual `fly deploy` and itch.io upload require the user's Fly + itch
accounts/tokens. I stop there and hand over the one-command finish in
`docs/DEPLOY.md`. No writes to any external service.
