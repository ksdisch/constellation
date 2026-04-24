import type { ClientToServerMsg, ServerToClientMsg } from '../../shared/protocol';

type MessageHandler = (msg: ServerToClientMsg) => void;

const RELAY_PORT = 3081;

function serverUrl(): string {
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
        try {
          const msg = JSON.parse(e.data as string) as ServerToClientMsg;
          this.handlers.forEach((h) => h(msg));
        } catch (err) {
          console.error('bad message', err);
        }
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
