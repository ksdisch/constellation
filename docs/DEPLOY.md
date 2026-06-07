# Deploying Constellation

Constellation has two deployables:

1. **The relay** (`server/`) — a tiny `ws` server. Runs on a public host with a
   `wss://` URL. The only server-side component (no game logic, no DB).
2. **The clients** (`src/game` + `src/phone`) — static files from `vite build`.
   Host anywhere static (itch.io, Netlify, GitHub Pages). Both HTML entries ship
   in one `dist/`.

The clients reach the relay over a URL baked in at **build time** via
`VITE_RELAY_URL`. So the order is: deploy the relay → get its URL → build the
clients with that URL → upload the clients.

---

## 1. Deploy the relay (Fly.io)

The repo ships a `Dockerfile` (relay-only image, runs `npm run start:relay`) and
a `fly.toml` (TLS-terminated `http_service`, `force_https`, `/healthz` check).

```bash
# one-time: install flyctl + log in
fly auth login

# create the app (edit the name/region in fly.toml first, or let launch pick)
fly launch --no-deploy        # reads the existing fly.toml + Dockerfile

# ship it
fly deploy
```

Your relay is now at `wss://<app-name>.fly.dev` (port 443, TLS via Fly). Verify:

```bash
curl https://<app-name>.fly.dev/healthz     # -> constellation relay ok
```

**Cold starts:** `fly.toml` scales to zero when idle (`min_machines_running = 0`)
to stay free-tier friendly; the first connection wakes the machine (a second or
two). Set `min_machines_running = 1` if you want instant joins.

> Any host that gives a Node process a `$PORT` and TLS works the same way — the
> relay serves HTTP health + the WS upgrade on a single port. Cloudflare Durable
> Objects would need a different adapter (out of scope here).

## 2. Build the clients pointed at the relay

```bash
VITE_RELAY_URL=wss://<app-name>.fly.dev npm run build
```

This bakes the relay URL into both bundles. (Without the var, the clients infer
`ws[s]://<page-host>:3081` — the LAN-dev default — which is wrong for a deployed
client, so the var is required for the upload build.) Output is in `dist/`:

- `dist/index.html` + `dist/assets/game-*.js` — the laptop game
- `dist/phone.html` + `dist/assets/phone-*.js` — the phone companion

## 3. Upload the clients (itch.io)

itch.io HTML5 projects serve a zip with an `index.html` at the root.

```bash
cd dist && zip -r ../constellation-web.zip . && cd ..
```

Upload `constellation-web.zip` as an HTML5 project; set the viewport to the
game's size and enable fullscreen. The laptop opens the project page; the phone
opens the same page with `/phone.html` appended.

> itch.io serves over `https`, so the relay **must** be `wss` (it is, via Fly's
> `force_https`). Mixed `ws`-from-`https` is blocked by browsers.

## 4. End-to-end check

1. Laptop opens the itch project → a room code appears.
2. Phone opens `…/phone.html` → enters the code → joins.
3. Solve a puzzle on the phone → the power fires on the laptop.

`?solo=1` still works on the deployed game for solo testing (skips the relay
entirely). `?test=1` exposes the bridge (`docs/AUTONOMY.md`).

---

## Local verification (no accounts needed)

These run in CI / locally and exercise the exact deploy path:

```bash
npm run smoke:relay   # boots the real relay, asserts health + full round-trip
VITE_RELAY_URL=wss://example.test npm run build   # confirms the URL bakes in
```

`npm run start:relay` is what the container runs (`tsx server/server.ts`,
honoring `$PORT`).
