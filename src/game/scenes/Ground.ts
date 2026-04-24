import Phaser from 'phaser';
import { Astronaut } from '../entities/Astronaut';

const SPAWN = { x: 80, y: 440 };

export class GroundScene extends Phaser.Scene {
  private astronaut!: Astronaut;

  constructor() {
    super({ key: 'Ground' });
  }

  create() {
    const ground = this.physics.add.staticGroup();
    for (let x = 32; x < 960; x += 64) {
      ground.create(x, 520, 'ground');
    }

    this.add
      .text(480, 60, 'Constellation', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(480, 88, 'Walk around: A/D or ← →  ·  Jump: W / ↑ / space', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#a8b0d8',
      })
      .setOrigin(0.5);

    this.astronaut = new Astronaut(this, SPAWN.x, SPAWN.y);
    this.physics.add.collider(this.astronaut.sprite, ground);
  }

  update() {
    this.astronaut.update();
  }
}
