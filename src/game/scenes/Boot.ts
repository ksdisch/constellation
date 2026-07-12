import Phaser from 'phaser';
import { GameNetClient } from '../net/client';
import { loadProgress } from '../progression/save';
import { PLANETS } from '../planets/registry';
import { GENERATED_THEMES } from '../planets/generatedThemes';
import type { PlanetTheme } from '../planets/planet1';
import { ensureBridge } from '../testBridge';
import { setMuted } from '../juice/mute';
import { loadSettings } from '../juice/settings';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create() {
    // Install the flag-gated test bridge (no-op unless ?test=1). Runs for both
    // solo and normal entry, before any scene that wires providers into it.
    ensureBridge();

    // Apply the persisted master-mute (M11) BEFORE any scene plays audio. Both
    // engines read the flag live on their first playCue/startMusic, and the
    // first audio is Hub.create()→startMusic('hub'), which runs after this.
    setMuted(loadSettings().muted);

    this.makeSolidTexture('astronaut', 32, 48, 0xffd166);
    this.makeSolidTexture('ground', 64, 40, 0x4a5888);
    this.makeSolidTexture('ceiling', 400, 20, 0x2a3a6a);
    this.makeSolidTexture('enemy', 32, 130, 0xff6b9d);
    this.makeSolidTexture('goal', 28, 28, 0xffef7a);
    this.makeSolidTexture('platform', 96, 14, 0x9a7aff);
    this.makeSolidTexture('hidden-platform', 120, 16, 0x4a5888);
    // White particle for juice bursts; the emitter tints it per-event, so one
    // planet-agnostic texture serves every cast/death/win burst.
    this.makeSolidTexture('spark', 8, 8, 0xffffff);

    // Per-theme textures for any registered planet that opts into a theme.
    // Generated at the SAME sizes as the defaults above, keyed `<key>-<id>`.
    // The default textures are left untouched, so planet-1 (no theme) is
    // pixel-identical. Planet.tex() resolves to these keys when a theme is set.
    for (const entry of PLANETS) {
      const theme = entry.config?.theme;
      if (!theme) continue;
      this.makeThemeTextures(entry.id, theme);
    }

    // A GENERATED planet (grown from the pair's rhythm) is launched by scene-data,
    // never registered — so its themed texture keys (`<key>-planet-generated-<slug>`)
    // won't be produced by the registry loop above. generatePlanet() picks one of
    // these themes and stamps the matching id, so pre-bake every library theme here.
    for (const gt of GENERATED_THEMES) {
      this.makeThemeTextures(`planet-generated-${gt.slug}`, gt.theme);
    }

    const isSolo = new URLSearchParams(window.location.search).get('solo') === '1';
    if (isSolo) {
      const net = new GameNetClient();
      // Do not call net.connect() — solo mode bypasses the relay entirely.
      // Derive durable unlock state from persisted progress; the scene-data
      // contract still passes a Set<string> so Hub is unchanged downstream.
      const unlockedPlanets = new Set(loadProgress().unlockedPlanets);
      this.scene.start('Hub', {
        net,
        solo: true,
        unlockedPlanets,
      });
    } else {
      this.scene.start('Lobby');
    }
  }

  /**
   * Bake the six themed textures for one planet id, keyed `<key>-<id>` at the
   * SAME sizes as the default texture set (so `Planet.tex()` resolves them 1:1).
   * Shared by registered planets and generated ones.
   */
  private makeThemeTextures(id: string, theme: PlanetTheme) {
    this.makeSolidTexture(`ground-${id}`, 64, 40, theme.ground);
    this.makeSolidTexture(`ceiling-${id}`, 400, 20, theme.ceiling);
    this.makeSolidTexture(`enemy-${id}`, 32, 130, theme.enemy);
    this.makeSolidTexture(`goal-${id}`, 28, 28, theme.goal);
    this.makeSolidTexture(`platform-${id}`, 96, 14, theme.platform);
    this.makeSolidTexture(`hidden-platform-${id}`, 120, 16, theme.hiddenPlatform);
  }

  private makeSolidTexture(key: string, w: number, h: number, color: number) {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(color);
    g.fillRect(0, 0, w, h);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
