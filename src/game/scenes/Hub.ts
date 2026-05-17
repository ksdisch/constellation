import Phaser from 'phaser';
import type { GameNetClient } from '../net/client';
import { planet1Config } from '../planets/planet1';

type Star = { x: number; y: number; r: number; alpha: number };

const STARS: Star[] = [
  { x: 60, y: 40, r: 1, alpha: 0.7 },
  { x: 140, y: 200, r: 2, alpha: 0.8 },
  { x: 90, y: 470, r: 1, alpha: 0.5 },
  { x: 200, y: 100, r: 1, alpha: 0.6 },
  { x: 320, y: 200, r: 1, alpha: 0.55 },
  { x: 360, y: 460, r: 2, alpha: 0.75 },
  { x: 410, y: 30, r: 1, alpha: 0.5 },
  { x: 450, y: 440, r: 1, alpha: 0.6 },
  { x: 520, y: 180, r: 1, alpha: 0.65 },
  { x: 560, y: 470, r: 2, alpha: 0.8 },
  { x: 620, y: 50, r: 1, alpha: 0.55 },
  { x: 660, y: 200, r: 1, alpha: 0.5 },
  { x: 700, y: 420, r: 1, alpha: 0.6 },
  { x: 800, y: 100, r: 2, alpha: 0.75 },
  { x: 820, y: 220, r: 1, alpha: 0.55 },
  { x: 870, y: 460, r: 1, alpha: 0.65 },
  { x: 900, y: 40, r: 1, alpha: 0.5 },
  { x: 280, y: 480, r: 1, alpha: 0.55 },
  { x: 480, y: 60, r: 1, alpha: 0.45 },
  { x: 600, y: 470, r: 1, alpha: 0.6 },
];

export class HubScene extends Phaser.Scene {
  private net!: GameNetClient;
  private solo = false;
  private unlockedPlanets: Set<string> = new Set();

  constructor() {
    super({ key: 'Hub' });
  }

  init(data: { net: GameNetClient; solo?: boolean; unlockedPlanets: Set<string> }) {
    this.net = data.net;
    this.solo = data.solo ?? false;
    this.unlockedPlanets = data.unlockedPlanets;
  }

  create() {
    // Starry background — hand-placed dots for a consistent look run-to-run.
    for (const star of STARS) {
      this.add.circle(star.x, star.y, star.r, 0xffffff).setAlpha(star.alpha);
    }

    // Title at top
    this.add
      .text(480, 80, 'Pocket Galaxy', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '36px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Subtitle hint
    this.add
      .text(480, 130, 'Pick a planet to play', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#a8b0d8',
      })
      .setOrigin(0.5);

    // Planet 1 — interactive cyan node
    const planet1Unlocked = this.unlockedPlanets.has('planet-1');
    const planet1Node = this.add.circle(230, 270, 40, planet1Unlocked ? 0x7ad8ff : 0x3a3a4a);
    if (planet1Unlocked) {
      planet1Node.setInteractive({ useHandCursor: true });
      planet1Node.on('pointerdown', () => {
        this.scene.start('Planet', {
          net: this.net,
          config: planet1Config,
          solo: this.solo,
          unlockedPlanets: this.unlockedPlanets,
        });
      });
    }
    this.add
      .text(230, 330, planet1Unlocked ? 'Constellation' : '?', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: planet1Unlocked ? '#ffffff' : '#a8b0d8',
      })
      .setOrigin(0.5);

    // Planet 2 — locked placeholder
    this.add.circle(480, 270, 30, 0x3a3a4a);
    this.add
      .text(480, 330, '?', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#a8b0d8',
      })
      .setOrigin(0.5);

    // Planet 3 — locked placeholder
    this.add.circle(730, 270, 30, 0x3a3a4a);
    this.add
      .text(730, 330, '?', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: '#a8b0d8',
      })
      .setOrigin(0.5);
  }
}
