import Phaser from 'phaser';
import { Astronaut } from '../entities/Astronaut';
import { Enemy } from '../entities/Enemy';
import type { GameNetClient } from '../net/client';
import type { PowerId } from '../../shared/protocol';
import type { PlanetConfig } from '../planets/planet1';

const FREEZE_DURATION_MS = 3000;
const PLATFORM_LIFETIME_MS = 5000;
const PLATFORM_FADE_OUT_MS = 800;
const DARK_ZONE_FADE_MS = 800;

export class PlanetScene extends Phaser.Scene {
  private astronaut!: Astronaut;
  private enemy!: Enemy;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private hiddenPlatforms!: Phaser.Physics.Arcade.StaticGroup;
  private darkZone: Phaser.GameObjects.Rectangle | null = null;
  private net!: GameNetClient;
  private won = false;
  private solo = false;
  private config!: PlanetConfig;
  private unlockedPlanets: Set<string> = new Set();

  constructor() {
    super({ key: 'Planet' });
  }

  init(data: { net: GameNetClient; config: PlanetConfig; solo?: boolean; unlockedPlanets?: Set<string> }) {
    this.net = data.net;
    this.config = data.config;
    this.solo = data.solo ?? false;
    this.unlockedPlanets = data.unlockedPlanets ?? new Set();
    this.won = false;
  }

  create() {
    const ground = this.physics.add.staticGroup();
    for (let x = 32; x < 960; x += 64) {
      if (x >= this.config.pit.startX && x < this.config.pit.endX) continue;
      ground.create(x, 520, 'ground');
    }

    const ceiling = this.physics.add.staticGroup();
    ceiling.create(this.config.corridor.x, 360, 'ceiling');

    this.platforms = this.physics.add.staticGroup();

    this.hiddenPlatforms = this.physics.add.staticGroup();
    const hiddenPlatform = this.hiddenPlatforms.create(
      this.config.hiddenPlatform.x,
      this.config.hiddenPlatform.y,
      'hidden-platform',
    ) as Phaser.Physics.Arcade.Sprite;
    hiddenPlatform.refreshBody();

    this.darkZone = this.add
      .rectangle(this.config.darkZone.x, this.config.darkZone.y, this.config.darkZone.width, this.config.darkZone.height, 0x000000, 1)
      .setDepth(50);

    this.add
      .text(480, 60, this.config.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    this.add
      .text(480, 88, this.config.hint, {
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
      this.castPower(msg.powerId);
    });

    if (this.solo) {
      this.add
        .text(14, 14, 'SOLO  [1] freeze  [2] platform  [3] illuminate', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          color: '#f6c971',
        })
        .setOrigin(0, 0);
      this.input.keyboard!.on('keydown-ONE', () => this.castPower('freeze-stars'));
      this.input.keyboard!.on('keydown-TWO', () => this.castPower('summon-platform'));
      this.input.keyboard!.on('keydown-THREE', () => this.castPower('illuminate'));
    }

    this.astronaut = new Astronaut(this, this.config.spawn.x, this.config.spawn.y);
    this.physics.add.collider(this.astronaut.sprite, ground);
    this.physics.add.collider(this.astronaut.sprite, ceiling);
    this.physics.add.collider(this.astronaut.sprite, this.platforms);
    this.physics.add.collider(this.astronaut.sprite, this.hiddenPlatforms);

    this.enemy = new Enemy(this, this.config.corridor.x, 435);
    this.physics.add.collider(this.enemy.sprite, ground);

    this.physics.add.overlap(this.astronaut.sprite, this.enemy.sprite, () => {
      if (this.enemy.isFrozen || this.won) return;
      this.resetAstronaut();
    });

    const goal = this.physics.add.staticSprite(this.config.goal.x, this.config.goal.y, 'goal');
    this.tweens.add({
      targets: goal,
      y: this.config.goal.y - 8,
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
    if (this.astronaut.sprite.y > this.config.fallRespawnY) {
      this.resetAstronaut();
      return;
    }
    this.astronaut.update();
    this.enemy.update();
  }

  private castPower(powerId: PowerId) {
    switch (powerId) {
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
        const _exhaustive: never = powerId;
        void _exhaustive;
      }
    }
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
    const sprite = this.platforms.create(this.config.platformDrop.x, this.config.platformDrop.y, 'platform') as Phaser.Physics.Arcade.Sprite;
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
    this.astronaut.sprite.setPosition(this.config.spawn.x, this.config.spawn.y);
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

    // "Play again" — left button, mint green
    const restartButton = this.add
      .rectangle(380, 310, 180, 48, 0x98ffc8)
      .setStrokeStyle(2, 0xffffff, 0.4)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(380, 310, 'Play again', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#1a1b3a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    restartButton.on('pointerdown', () => this.scene.restart({
      net: this.net,
      config: this.config,
      solo: this.solo,
      unlockedPlanets: this.unlockedPlanets,
    }));

    // "Return to Hub" — right button, slate
    const hubButton = this.add
      .rectangle(580, 310, 180, 48, 0xa8b0d8)
      .setStrokeStyle(2, 0xffffff, 0.4)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(580, 310, 'Return to Hub', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#1a1b3a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    hubButton.on('pointerdown', () => this.scene.start('Hub', {
      net: this.net,
      solo: this.solo,
      unlockedPlanets: this.unlockedPlanets,
    }));
  }
}
