import Phaser from 'phaser';
import { Astronaut } from '../entities/Astronaut';
import { Enemy } from '../entities/Enemy';
import type { GameNetClient } from '../net/client';

const SPAWN = { x: 80, y: 440 };
const FREEZE_DURATION_MS = 3000;
const CORRIDOR_X = 420;
const PIT = { startX: 660, endX: 880 };
const GOAL_POS = { x: 920, y: 300 };
const PLATFORM_POS = { x: 770, y: 460 };
const PLATFORM_LIFETIME_MS = 5000;
const PLATFORM_FADE_OUT_MS = 800;
const HIDDEN_PLATFORM_POS = { x: 920, y: 420 };
const DARK_ZONE = { x: 920, y: 420, width: 160, height: 100 };
const DARK_ZONE_FADE_MS = 800;
const FALL_RESPAWN_Y = 600;

export class LevelScene extends Phaser.Scene {
  private astronaut!: Astronaut;
  private enemy!: Enemy;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private hiddenPlatforms!: Phaser.Physics.Arcade.StaticGroup;
  private darkZone: Phaser.GameObjects.Rectangle | null = null;
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
      if (x >= PIT.startX && x < PIT.endX) continue;
      ground.create(x, 520, 'ground');
    }

    const ceiling = this.physics.add.staticGroup();
    ceiling.create(CORRIDOR_X, 360, 'ceiling');

    this.platforms = this.physics.add.staticGroup();

    this.hiddenPlatforms = this.physics.add.staticGroup();
    const hiddenPlatform = this.hiddenPlatforms.create(
      HIDDEN_PLATFORM_POS.x,
      HIDDEN_PLATFORM_POS.y,
      'hidden-platform',
    ) as Phaser.Physics.Arcade.Sprite;
    hiddenPlatform.refreshBody();

    this.darkZone = this.add
      .rectangle(DARK_ZONE.x, DARK_ZONE.y, DARK_ZONE.width, DARK_ZONE.height, 0x000000, 1)
      .setDepth(50);

    this.add
      .text(480, 60, 'Constellation', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(480, 88, 'Freeze her past the plasma column, bridge the chasm, then illuminate the hidden path.', {
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
        return;
      }
      if (msg.type !== 'power-cast') return;
      switch (msg.powerId) {
        case 'freeze-stars':
          this.enemy.freeze(FREEZE_DURATION_MS, this);
          this.flashBanner('FREEZE!', '#7ad8ff');
          break;
        case 'summon-platform':
          if (this.platforms.getChildren().length > 0) break;
          this.summonPlatform();
          this.flashBanner('PLATFORM!', '#9a7aff');
          break;
        case 'illuminate':
          this.illuminate();
          break;
        default: {
          const _exhaustive: never = msg.powerId;
          void _exhaustive;
        }
      }
    });

    this.astronaut = new Astronaut(this, SPAWN.x, SPAWN.y);
    this.physics.add.collider(this.astronaut.sprite, ground);
    this.physics.add.collider(this.astronaut.sprite, ceiling);
    this.physics.add.collider(this.astronaut.sprite, this.platforms);
    this.physics.add.collider(this.astronaut.sprite, this.hiddenPlatforms);

    this.enemy = new Enemy(this, CORRIDOR_X, 435);
    this.physics.add.collider(this.enemy.sprite, ground);

    this.physics.add.overlap(this.astronaut.sprite, this.enemy.sprite, () => {
      if (this.enemy.isFrozen || this.won) return;
      this.resetAstronaut();
    });

    const goal = this.physics.add.staticSprite(GOAL_POS.x, GOAL_POS.y, 'goal');
    this.tweens.add({
      targets: goal,
      y: GOAL_POS.y - 8,
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
    if (this.astronaut.sprite.y > FALL_RESPAWN_Y) {
      this.resetAstronaut();
      return;
    }
    this.astronaut.update();
    this.enemy.update();
  }

  private illuminate() {
    this.flashBanner('ILLUMINATE!', '#f6c971');
    // Re-cast behavior: banner-only. The trivia puzzle is a 30s investment,
    // so even a redundant cast gets visible feedback. The hidden platform
    // remains revealed across resets (permanent reveal semantics).
    if (!this.darkZone) return;
    const zone = this.darkZone;
    this.darkZone = null;
    this.tweens.add({
      targets: zone,
      alpha: 0,
      duration: DARK_ZONE_FADE_MS,
      onComplete: () => zone.destroy(),
    });
  }

  private summonPlatform() {
    const sprite = this.platforms.create(PLATFORM_POS.x, PLATFORM_POS.y, 'platform') as Phaser.Physics.Arcade.Sprite;
    sprite.setAlpha(0);
    sprite.refreshBody();
    this.tweens.add({ targets: sprite, alpha: 1, duration: 200 });
    this.time.delayedCall(PLATFORM_LIFETIME_MS - PLATFORM_FADE_OUT_MS, () => {
      this.tweens.add({
        targets: sprite,
        alpha: 0,
        duration: PLATFORM_FADE_OUT_MS,
        onComplete: () => sprite.destroy(),
      });
    });
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
