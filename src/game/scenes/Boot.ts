import Phaser from 'phaser';
import { GameNetClient } from '../net/client';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create() {
    this.makeSolidTexture('astronaut', 32, 48, 0xffd166);
    this.makeSolidTexture('ground', 64, 40, 0x4a5888);
    this.makeSolidTexture('ceiling', 400, 20, 0x2a3a6a);
    this.makeSolidTexture('enemy', 32, 130, 0xff6b9d);
    this.makeSolidTexture('goal', 28, 28, 0xffef7a);
    this.makeSolidTexture('platform', 96, 14, 0x9a7aff);
    this.makeSolidTexture('hidden-platform', 120, 16, 0x4a5888);

    const isSolo = new URLSearchParams(window.location.search).get('solo') === '1';
    if (isSolo) {
      const net = new GameNetClient();
      // Do not call net.connect() — solo mode bypasses the relay entirely.
      this.scene.start('Hub', {
        net,
        solo: true,
        unlockedPlanets: new Set(['planet-1']),
      });
    } else {
      this.scene.start('Lobby');
    }
  }

  private makeSolidTexture(key: string, w: number, h: number, color: number) {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(color);
    g.fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
