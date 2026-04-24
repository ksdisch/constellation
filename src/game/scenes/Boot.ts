import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create() {
    this.makeSolidTexture('astronaut', 32, 48, 0xffd166);
    this.makeSolidTexture('ground', 64, 40, 0x4a5888);
    this.makeSolidTexture('enemy', 36, 36, 0xff6b9d);
    this.makeSolidTexture('goal', 28, 28, 0xffef7a);
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
