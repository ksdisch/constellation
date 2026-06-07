/// Vite build-time environment variables exposed to the clients.
///
/// Only `VITE_`-prefixed vars are inlined by Vite into the bundle. We type just
/// the ones we read so `import.meta.env.VITE_RELAY_URL` is strict-safe without
/// pulling in all of `vite/client`.
interface ImportMetaEnv {
  /**
   * Absolute relay URL the clients connect to, e.g.
   * `wss://constellation-relay.fly.dev`. When unset (local dev), the net
   * clients fall back to inferring `ws[s]://<page-host>:3081` from the LAN.
   */
  readonly VITE_RELAY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
