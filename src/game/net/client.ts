import type { ClientToServerMsg, ServerToClientMsg } from '../../shared/protocol';

type MessageHandler = (msg: ServerToClientMsg) => void;

const RELAY_PORT = 3081;

function serverUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.hostname}:${RELAY_PORT}`;
}

export class GameNetClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<MessageHandler>();

  connect(): void {
    const ws = new WebSocket(serverUrl());
    ws.addEventListener('open', () => {
      this.send({ type: 'create-room', role: 'game' });
    });
    ws.addEventListener('message', (e) => {
      try {
        const msg = JSON.parse(e.data as string) as ServerToClientMsg;
        this.handlers.forEach((h) => h(msg));
      } catch (err) {
        console.error('bad message', err);
      }
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
