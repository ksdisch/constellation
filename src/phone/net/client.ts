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

export class PhoneNetClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(serverUrl());
      const onOpen = () => {
        ws.removeEventListener('open', onOpen);
        ws.removeEventListener('error', onError);
        resolve();
      };
      const onError = () => {
        ws.removeEventListener('open', onOpen);
        ws.removeEventListener('error', onError);
        reject(new Error('failed to connect'));
      };
      ws.addEventListener('open', onOpen);
      ws.addEventListener('error', onError);
      ws.addEventListener('message', (e) => {
        let msg: ServerToClientMsg;
        try {
          msg = JSON.parse(e.data as string) as ServerToClientMsg;
        } catch (err) {
          console.error('bad message', err);
          return;
        }
        // Isolate handlers from each other: one throwing handler must not
        // swallow the message for the rest (mirrors the game client, F-06).
        this.handlers.forEach((h) => {
          try {
            h(msg);
          } catch (err) {
            console.error('handler error', err);
          }
        });
      });
      this.ws = ws;
    });
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
