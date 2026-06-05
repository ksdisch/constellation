import Phaser from 'phaser';
import type { GameNetClient } from '../net/client';
import { PLANETS, type PlanetRegistryEntry } from '../planets/registry';
import { loadProgress } from '../progression/save';
import { nodeStateFor } from '../progression/nodeStateFor';
import { isTestMode, setBridgeProviders } from '../testBridge';

type Star = { x: number; y: number; r: number; alpha: number };

/** Per-state node visuals — keeps the starfield palette consistent. */
const NODE_STYLE = {
  completed: { color: 0x98ffc8, radius: 40, labelColor: '#ffffff' },
  unlocked: { color: 0x7ad8ff, radius: 40, labelColor: '#ffffff' },
  // Dimmer cyan so a launchable stub reads as "available but not built yet".
  stub: { color: 0x4a7a8a, radius: 34, labelColor: '#a8b0d8' },
  locked: { color: 0x3a3a4a, radius: 30, labelColor: '#a8b0d8' },
} as const;

const NODE_ROW_Y = 270;
const NODE_LABEL_Y = 330;

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
  private comingSoonText?: Phaser.GameObjects.Text;

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

    // Render one node per registry entry, mapped through nodeStateFor so the
    // chain lights up automatically as planets get completed. Reading from
    // loadProgress() keeps the node visuals durable across reloads. Use that
    // SAME persisted state as the launch-contract Set we forward downstream so
    // visuals and behavior share one source of truth (no scene-data drift).
    const progress = loadProgress();
    this.unlockedPlanets = new Set(progress.unlockedPlanets);
    PLANETS.forEach((entry, index) => {
      this.renderNode(entry, index, nodeStateFor(progress, entry.id));
    });

    // Test-bridge navigation (no-op unless ?test=1): launch a planet by id,
    // mirroring the node-click launch contract for entries that have a config.
    if (isTestMode()) {
      setBridgeProviders({
        startPlanet: (id) => {
          const e = PLANETS.find((x) => x.id === id);
          if (e?.config) {
            this.scene.start('Planet', {
              net: this.net,
              config: e.config,
              solo: this.solo,
              unlockedPlanets: new Set(this.unlockedPlanets),
            });
          }
        },
      });
    }
  }

  /** Even horizontal spread across the canvas for N nodes. */
  private nodeX(index: number): number {
    const gap = 960 / (PLANETS.length + 1);
    return Math.round(gap * (index + 1));
  }

  private renderNode(
    entry: PlanetRegistryEntry,
    index: number,
    state: 'completed' | 'unlocked' | 'locked',
  ) {
    const x = this.nodeX(index);
    // An unlocked entry with no config is a registered stub: launchable-looking
    // but it shows "Coming soon" instead of starting a planet.
    const isStub = state !== 'locked' && entry.config === undefined;
    const style =
      state === 'locked'
        ? NODE_STYLE.locked
        : isStub
          ? NODE_STYLE.stub
          : NODE_STYLE[state];

    const node = this.add.circle(x, NODE_ROW_Y, style.radius, style.color);

    if (state !== 'locked') {
      node.setInteractive({ useHandCursor: true });
      node.on('pointerdown', () => {
        if (entry.config) {
          this.scene.start('Planet', {
            net: this.net,
            config: entry.config,
            solo: this.solo,
            // Clone so no scene shares a mutable Set reference.
            unlockedPlanets: new Set(this.unlockedPlanets),
          });
        } else {
          this.showComingSoon(x);
        }
      });
    }

    this.add
      .text(x, NODE_LABEL_Y, state === 'locked' ? '?' : entry.label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        color: style.labelColor,
      })
      .setOrigin(0.5);
  }

  /** Gentle, self-clearing "Coming soon" feedback for config-less stubs. */
  private showComingSoon(x: number) {
    if (this.comingSoonText) this.comingSoonText.destroy();
    const text = this.add
      .text(x, NODE_LABEL_Y + 34, 'Coming soon', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#7ad8ff',
      })
      .setOrigin(0.5);
    this.comingSoonText = text;
    this.tweens.add({
      targets: text,
      alpha: 0,
      duration: 1200,
      delay: 600,
      onComplete: () => {
        text.destroy();
        if (this.comingSoonText === text) this.comingSoonText = undefined;
      },
    });
  }
}
