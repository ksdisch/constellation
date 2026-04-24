import Phaser from 'phaser';
import { GameNetClient } from '../net/client';

export class LobbyScene extends Phaser.Scene {
  private net!: GameNetClient;
  private codeText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'Lobby' });
  }

  create(): void {
    this.add
      .text(480, 90, 'Constellation', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '44px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(480, 150, 'Room code — enter on her phone', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#a8b0d8',
      })
      .setOrigin(0.5);

    this.codeText = this.add
      .text(480, 250, '· · · · · ·', {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '88px',
        color: '#ffd166',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.statusText = this.add
      .text(480, 360, 'Connecting to relay…', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#a8b0d8',
      })
      .setOrigin(0.5);

    const host = window.location.hostname;
    const port = window.location.port || '5180';
    this.add
      .text(480, 470, `Phone URL:  http://${host}:${port}/phone.html`, {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '14px',
        color: '#667a99',
      })
      .setOrigin(0.5);

    this.net = new GameNetClient();
    this.net.onMessage((msg) => {
      if (msg.type === 'room-created') {
        this.codeText.setText(msg.roomCode);
        this.statusText.setText('Waiting for phone…');
      } else if (msg.type === 'phone-joined') {
        this.statusText.setText('Phone connected!');
        this.statusText.setColor('#98ffc8');
      } else if (msg.type === 'error') {
        this.statusText.setText(`Error: ${msg.message}`);
        this.statusText.setColor('#ff9090');
      }
    });
    this.net.connect();
  }
}
