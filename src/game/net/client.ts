import type { ClientToServerMsg, ServerToClientMsg } from '../../shared/protocol';

type MessageHandler = (msg: ServerToClientMsg) => void;

const RELAY_PORT = 3081;

function serverUrl(): string {
  // Deploy override: a build with VITE_RELAY_URL set (e.g. the itch.io build
  // pointing at the Fly relay) uses it verbatim. Unset → infer the LAN URL so
  // `npm run dev` is unchanged.
  const configured = import.meta.env.VITE_RELAY_URL;
  if (configured) return configured;
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.hostname}:${RELAY_PORT}`;
}

export class GameNetClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();

  connect(): void {
    const ws = new WebSocket(serverUrl());
    ws.addEventListener('open', () => {
      this.send({ type: 'create-room' });
    });
    ws.addEventListener('message', (e) => {
      let msg: ServerToClientMsg;
      try {
        msg = JSON.parse(e.data as string) as ServerToClientMsg;
      } catch (err) {
        console.error('bad message', err);
        return;
      }
      // Isolate handlers from each other: with one shared try, a stale scene
      // handler throwing (e.g. setText on a destroyed Text) silently dropped
      // the message for every handler registered after it (F-06).
      this.handlers.forEach((h) => {
        try {
          h(msg);
        } catch (err) {
          console.error('handler error', err);
        }
      });
    });
    ws.addEventListener('close', () => {
      console.warn('relay connection closed');
    });
    this.ws = ws;
  }

  onMessage(handler: MessageHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  send(msg: ClientToServerMsg): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }
}
