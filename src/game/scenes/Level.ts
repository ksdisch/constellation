import Phaser from 'phaser';
import { Astronaut } from '../entities/Astronaut';
import { Enemy } from '../entities/Enemy';
import type { GameNetClient } from '../net/client';

const SPAWN = { x: 80, y: 440 };
const FREEZE_DURATION_MS = 5000;

export class LevelScene extends Phaser.Scene {
  private astronaut!: Astronaut;
  private enemy!: Enemy;
  private net!: GameNetClient;
  private won = false;

  constructor() {
    super({ key: 'Level' });
  }

  init(data: { net: GameNetClient }) {
    this.net = data.net;
    this.won = false;
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
      .text(480, 88, 'Reach the star. Dodge the enemy — or have her freeze it.', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#a8b0d8',
      })
      .setOrigin(0.5);

    const linkIndicator = this.add
      .text(950, 14, '● phone linked', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#98ffc8',
      })
      .setOrigin(1, 0);

    this.net.onMessage((msg) => {
      if (msg.type === 'error' && msg.message.includes('phone')) {
        linkIndicator.setText('● phone disconnected');
        linkIndicator.setColor('#ff9090');
      } else if (msg.type === 'power-cast' && msg.powerId === 'freeze-stars') {
        this.enemy.freeze(FREEZE_DURATION_MS, this);
        this.flashBanner('FREEZE!', '#7ad8ff');
      }
    });

    this.astronaut = new Astronaut(this, SPAWN.x, SPAWN.y);
    this.physics.add.collider(this.astronaut.sprite, ground);

    this.enemy = new Enemy(this, 500, 480);
    this.physics.add.collider(this.enemy.sprite, ground);

    this.physics.add.overlap(this.astronaut.sprite, this.enemy.sprite, () => {
      if (this.enemy.isFrozen || this.won) return;
      this.resetAstronaut();
    });

    const goal = this.physics.add.staticSprite(900, 470, 'goal');
    this.tweens.add({
      targets: goal,
      y: 462,
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: 'Sine.easeInOut',
    });
    this.physics.add.overlap(this.astronaut.sprite, goal, () => {
      if (!this.won) this.showWin();
    });
  }

  update() {
    if (this.won) return;
    this.astronaut.update();
    this.enemy.update();
  }

  private resetAstronaut() {
    const body = this.astronaut.sprite.body as Phaser.Physics.Arcade.Body;
    this.astronaut.sprite.setPosition(SPAWN.x, SPAWN.y);
    body.setVelocity(0, 0);
    this.astronaut.sprite.setTint(0xff6b9d);
    this.time.delayedCall(180, () => this.astronaut.sprite.clearTint());
  }

  private flashBanner(text: string, color: string) {
    const banner = this.add
      .text(480, 220, text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '56px',
        color,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.add({
      targets: banner,
      alpha: { from: 0, to: 1 },
      y: 200,
      duration: 180,
      yoyo: true,
      hold: 500,
      ease: 'Cubic.easeOut',
      onComplete: () => banner.destroy(),
    });
  }

  private showWin() {
    this.won = true;
    (this.astronaut.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);

    this.add.rectangle(480, 270, 960, 540, 0x000000, 0.65);
    this.add
      .text(480, 240, 'Level complete!', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '48px',
        color: '#98ffc8',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(480, 300, 'Refresh to play again.', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#a8b0d8',
      })
      .setOrigin(0.5);
  }
}
