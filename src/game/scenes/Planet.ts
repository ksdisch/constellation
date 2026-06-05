import Phaser from 'phaser';
import { Astronaut } from '../entities/Astronaut';
import { Enemy } from '../entities/Enemy';
import type { GameNetClient } from '../net/client';
import type { PowerId } from '../../shared/protocol';
import type { PlanetConfig } from '../planets/planet1';
import { loadProgress, markPlanetComplete, saveProgress } from '../progression/save';
import { PLANETS } from '../planets/registry';
import { isTestMode, setBridgeProviders } from '../testBridge';
import { JuiceController } from '../juice/effects';
import { getLastCue, getAudioState, resetLastCue } from '../juice/audio';

const FREEZE_DURATION_MS = 3000;
const PLATFORM_LIFETIME_MS = 5000;
const PLATFORM_FADE_OUT_MS = 800;
const DARK_ZONE_FADE_MS = 800;
// Phase Dash: an invulnerability WINDOW vs. the hazard lane (the load-bearing
// part — a calm walk-through, not a reaction), plus a brief dash speed boost so
// the cast reads as a dash. Teal matches the power's phone accent.
const PHASE_DURATION_MS = 2500;
const PHASE_DASH_BOOST_MS = 350;
const PHASE_DASH_SPEED_MULTIPLIER = 1.9;
const HAZARD_COLOR = 0x5eead4;

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
  private juice!: JuiceController;
  // Counts respawns (pit-fall, enemy hit, or un-phased hazard contact) for the
  // test bridge snapshot.
  private respawnCount = 0;
  // Phase Dash window state. phaseActive gates the hazard-lane respawn; phaseToken
  // lets a re-cast supersede a prior window's expiry callback cleanly.
  private phaseActive = false;
  private phaseToken = 0;

  constructor() {
    super({ key: 'Planet' });
  }

  /**
   * Resolve a texture key against the active config's theme. With a theme set,
   * returns the per-planet key `<key>-<id>` (generated in Boot); without one,
   * returns the default key unchanged. Planet-1 has no theme, so every lookup
   * returns the original key and its render path is pixel-identical.
   */
  private tex(key: string): string {
    return this.config.theme ? `${key}-${this.config.id}` : key;
  }

  // `unlockedPlanets` is part of the scene-data contract (Hub passes it), but
  // Planet no longer tracks it: on win, showWin() derives the authoritative
  // unlock state from persisted progress (loadProgress + markPlanetComplete).
  init(data: { net: GameNetClient; config: PlanetConfig; solo?: boolean; unlockedPlanets?: Set<string> }) {
    this.net = data.net;
    this.config = data.config;
    this.solo = data.solo ?? false;
    this.won = false;
    this.respawnCount = 0;
    this.phaseActive = false;
    // Drop any cue recorded by a prior run so the bridge starts clean (keeps the
    // audio context alive — see resetLastCue vs resetAudio).
    resetLastCue();
  }

  create() {
    // Opt-in themed camera background. Default (themeless) planets keep the
    // game-config background, so planet-1 is visually unchanged.
    if (this.config.theme) {
      this.cameras.main.setBackgroundColor(this.config.theme.background);
    }

    // Scene-bound juice applier (SFX + screen shake + particle bursts).
    this.juice = new JuiceController(this);

    // The floor is the ground tiles, NOT the world's bottom edge. Disabling the
    // world bottom edge lets a missed pit jump fall past `fallRespawnY` (600,
    // below the 540 canvas) so the update() respawn fires — otherwise
    // setCollideWorldBounds(true) clamps the fall at y≈516 and the astronaut
    // soft-locks in the pit. This makes Summon Platform genuinely load-bearing.
    this.physics.world.checkCollision.down = false;

    const ground = this.physics.add.staticGroup();
    for (let x = 32; x < 960; x += 64) {
      if (x >= this.config.pit.startX && x < this.config.pit.endX) continue;
      ground.create(x, 520, this.tex('ground'));
    }

    const ceiling = this.physics.add.staticGroup();
    ceiling.create(this.config.corridor.x, 360, this.tex('ceiling'));

    this.platforms = this.physics.add.staticGroup();

    this.hiddenPlatforms = this.physics.add.staticGroup();
    const hiddenPlatform = this.hiddenPlatforms.create(
      this.config.hiddenPlatform.x,
      this.config.hiddenPlatform.y,
      this.tex('hidden-platform'),
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
        .text(14, 14, 'SOLO  [1] freeze  [2] platform  [3] illuminate  [4] phase', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          color: '#f6c971',
        })
        .setOrigin(0, 0);
      this.input.keyboard!.on('keydown-ONE', () => this.castPower('freeze-stars'));
      this.input.keyboard!.on('keydown-TWO', () => this.castPower('summon-platform'));
      this.input.keyboard!.on('keydown-THREE', () => this.castPower('illuminate'));
      this.input.keyboard!.on('keydown-FOUR', () => this.castPower('phase-dash'));
    }

    this.astronaut = new Astronaut(this, this.config.spawn.x, this.config.spawn.y);
    this.physics.add.collider(this.astronaut.sprite, ground);
    this.physics.add.collider(this.astronaut.sprite, ceiling);
    this.physics.add.collider(this.astronaut.sprite, this.platforms);
    this.physics.add.collider(this.astronaut.sprite, this.hiddenPlatforms);

    this.enemy = new Enemy(this, this.config.corridor.x, 435, 140, this.tex('enemy'));
    this.physics.add.collider(this.enemy.sprite, ground);

    this.physics.add.overlap(this.astronaut.sprite, this.enemy.sprite, () => {
      if (this.enemy.isFrozen || this.won) return;
      this.resetAstronaut();
    });

    // Opt-in Phase Dash hazard: a full-height "plasma curtain" (tall enough that
    // a running jump can neither clear it horizontally nor get above it, so it is
    // robustly un-passable without phasing — no reach-math soft-lock). A static
    // body backs a translucent Rectangle; contact respawns UNLESS phaseActive.
    if (this.config.hazardLane) {
      const h = this.config.hazardLane;
      const hazard = this.add
        .rectangle(h.x, h.y, h.width, h.height, HAZARD_COLOR, 0.32)
        .setStrokeStyle(2, HAZARD_COLOR, 0.85)
        .setDepth(40);
      this.physics.add.existing(hazard, true);
      this.physics.add.overlap(this.astronaut.sprite, hazard, () => {
        if (!this.phaseActive && !this.won) this.resetAstronaut();
      });
      // Gentle plasma pulse so the curtain reads as live energy, not a wall.
      this.tweens.add({
        targets: hazard,
        alpha: { from: 0.32, to: 0.52 },
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const goal = this.physics.add.staticSprite(this.config.goal.x, this.config.goal.y, this.tex('goal'));
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

    // Wire the flag-gated test bridge providers. Inert unless ?test=1: the
    // getState closure reads the live scene, cast/startPlanet drive it. All
    // entities above are constructed, so the closures capture valid refs.
    if (isTestMode()) {
      setBridgeProviders({
        getState: () => {
          const progress = loadProgress();
          return {
            sceneKey: 'Planet',
            won: this.won,
            enemyFrozen: this.enemy.isFrozen,
            astronautX: this.astronaut.sprite.x,
            astronautY: this.astronaut.sprite.y,
            respawnCount: this.respawnCount,
            platformCount: this.platforms.getChildren().length,
            darkZonePresent: this.darkZone !== null,
            phaseActive: this.phaseActive,
            unlockedPlanets: progress.unlockedPlanets,
            completed: progress.completed,
            lastSfxCue: getLastCue(),
            shakeActive: this.juice.shakeActive,
            lastBurst: this.juice.lastBurstInfo,
            audioState: getAudioState(),
          };
        },
        cast: (id) => this.castPower(id),
        startPlanet: (id) => this.startPlanetById(id),
      });
    }
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
        this.juice.trigger('freeze', this.enemy.sprite.x, this.enemy.sprite.y);
        this.flashBanner('FREEZE!', '#7ad8ff');
        break;
      case 'summon-platform':
        if (this.platforms.getChildren().length > 0) break;
        this.summonPlatform();
        this.juice.trigger('platform', this.config.platformDrop.x, this.config.platformDrop.y);
        this.flashBanner('PLATFORM!', '#9a7aff');
        break;
      case 'illuminate':
        this.illuminate();
        break;
      case 'phase-dash':
        this.activatePhase();
        this.juice.trigger('phase-dash', this.astronaut.sprite.x, this.astronaut.sprite.y);
        this.flashBanner('PHASE!', '#5eead4');
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
    this.juice.trigger('illuminate', this.config.darkZone.x, this.config.darkZone.y);
    this.darkZone = null;
    this.tweens.add({
      targets: zone,
      alpha: 0,
      duration: DARK_ZONE_FADE_MS,
      onComplete: () => zone.destroy(),
    });
  }

  /**
   * Phase Dash: open an immunity window vs. the hazard lane and apply a brief
   * forward dash boost. A re-cast bumps phaseToken so an in-flight expiry
   * callback from the prior window can't end the new one early.
   */
  private activatePhase() {
    this.phaseActive = true;
    this.astronaut.setSpeedMultiplier(PHASE_DASH_SPEED_MULTIPLIER);
    this.astronaut.sprite.setTint(HAZARD_COLOR).setAlpha(0.55);
    const token = ++this.phaseToken;
    // The dash boost is short; the immunity window outlasts it so a calm
    // walk-through is never punished.
    this.time.delayedCall(PHASE_DASH_BOOST_MS, () => {
      if (token === this.phaseToken) this.astronaut.setSpeedMultiplier(1);
    });
    this.time.delayedCall(PHASE_DURATION_MS, () => {
      if (token !== this.phaseToken) return; // superseded by a newer cast
      this.phaseActive = false;
      this.astronaut.setSpeedMultiplier(1);
      this.astronaut.sprite.clearTint().setAlpha(1);
    });
  }

  private summonPlatform() {
    const sprite = this.platforms.create(this.config.platformDrop.x, this.config.platformDrop.y, this.tex('platform')) as Phaser.Physics.Arcade.Sprite;
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

  /**
   * Test-bridge navigation: jump straight to a planet by id. Looks up the
   * registry; only launches entries that have an authored config. Forwards the
   * current persisted unlock set so the new scene's launch contract is intact.
   */
  private startPlanetById(id: string) {
    const entry = PLANETS.find((p) => p.id === id);
    if (entry?.config) {
      this.scene.start('Planet', {
        net: this.net,
        config: entry.config,
        solo: this.solo,
        unlockedPlanets: new Set(loadProgress().unlockedPlanets),
      });
    }
  }

  private resetAstronaut() {
    this.respawnCount += 1;
    const body = this.astronaut.sprite.body as Phaser.Physics.Arcade.Body;
    // Death juice at the point of failure. Clamp the burst into the visible band
    // so a pit fall (astronaut below the 540 canvas, the most common death) still
    // shows sparks near the bottom edge rather than wasting them off-screen; the
    // shake fires regardless.
    this.juice.trigger('death', this.astronaut.sprite.x, Math.min(this.astronaut.sprite.y, 500));
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

    // Win beat: mint burst + cue at the goal, plus a soft camera flash. No
    // physics/timeScale slow-mo — the next scene (Hub/replay) inherits a clean
    // camera, so there is nothing to reset on the restart/return paths.
    this.juice.trigger('win', this.config.goal.x, this.config.goal.y);
    this.cameras.main.flash(220, 152, 255, 200);

    // Durably record the completion: mark this planet complete (which unlocks
    // the next in the chain) and persist. markPlanetComplete is pure, so we
    // read the latest persisted state, derive the new state, and save it.
    const next = markPlanetComplete(loadProgress(), this.config.id);
    saveProgress(next);
    const nextUnlocked = new Set(next.unlockedPlanets);

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
      // Fresh clone per button so no scene shares a mutable Set reference.
      unlockedPlanets: new Set(nextUnlocked),
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
      // Fresh clone per button so no scene shares a mutable Set reference.
      unlockedPlanets: new Set(nextUnlocked),
    }));
  }
}
