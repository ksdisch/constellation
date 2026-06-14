import type Phaser from 'phaser';
import { isMuted, setMuted } from './mute';
import { applyMusicMute } from './music';
import { loadSettings, saveSettings } from './settings';

/**
 * The in-game master-mute toggle (M11).
 *
 * A viewport-pinned 🔊/🔇 chip both Hub and Planet add to their HUD. Phaser is
 * imported as a TYPE ONLY (like effects.ts), so this module pulls no Phaser
 * runtime anywhere it doesn't already live; it's plain scene glue, not unit-
 * tested (the flag/persistence/engine pieces it wires are each tested directly).
 *
 * On tap it: flips the shared mute flag, reconciles the live music loop
 * (applyMusicMute — SFX is one-shot and needs none), re-persists the choice, and
 * swaps the glyph. The chip is pinned with setScrollFactor(0) so the planet's
 * follow camera never slides it off, given a high depth so it stays tappable
 * even over the win overlay, and sized for a ≥44px touch target.
 */

const SPEAKER_ON = '🔊';
const SPEAKER_OFF = '🔇';

/** Add the pinned mute toggle at (x, y); the chip's top-right corner sits there. */
export function addMuteButton(scene: Phaser.Scene, x: number, y: number): void {
  const button = scene.add
    .text(x, y, isMuted() ? SPEAKER_OFF : SPEAKER_ON, {
      fontFamily: 'system-ui, sans-serif',
      // 26px glyph + symmetric padding clears a 44px hit target in both axes.
      fontSize: '26px',
      color: '#ffffff',
      backgroundColor: '#1a1b3a',
      padding: { x: 12, y: 11 },
    })
    .setOrigin(1, 0)
    .setScrollFactor(0)
    .setDepth(100)
    .setInteractive({ useHandCursor: true });

  button.on('pointerover', () => button.setAlpha(0.85));
  button.on('pointerout', () => button.setAlpha(1));

  button.on('pointerdown', () => {
    const next = !isMuted();
    setMuted(next);
    applyMusicMute();
    saveSettings({ ...loadSettings(), muted: next });
    button.setText(next ? SPEAKER_OFF : SPEAKER_ON);
  });
}
