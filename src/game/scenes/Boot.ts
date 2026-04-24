import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create() {
    this.makeSolidTexture('astronaut', 32, 48, 0xffd166);
    this.makeSolidTexture('ground', 64, 40, 0x4a5888);
    this.scene.start('Lobby');
  }

  private makeSolidTexture(key: string, w: number, h: number, color: number) {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(color);
    g.fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
