import type { PuzzleTheme } from '../shared/protocol';

/**
 * Per-planet puzzle palette (phone side). Pure, framework-free data so it's
 * Vitest-testable; the puzzle components apply it as a THEMED LAYER on top of
 * each power's signature colour, never replacing it.
 *
 * The `default` theme is intentionally inert — an EMPTY glyph and a neutral
 * accent — so a themeless planet (planet-1), solo mode, and the pre-join state
 * render exactly as they did before M9. Components gate every themed touch on a
 * non-empty `glyph`, so `default` is a true no-op.
 */
export type PuzzlePalette = {
  /** Thematic glyph prefixed to the puzzle's header label. '' for default. */
  glyph: string;
  /** Accent for themed chrome (header label tint). */
  accent: string;
  /** Softer glow for themed "hero" tints (the equation, card border, dials). */
  glow: string;
};

const PALETTES: Record<PuzzleTheme, PuzzlePalette> = {
  // Inert: empty glyph + the existing neutral label colour ⇒ unchanged look.
  default: { glyph: '', accent: '#a8b0d8', glow: '#7ad8ff' },
  // Frost — cold blues/whites, matching planet-2's ICE palette.
  ice: { glyph: '❄', accent: '#bfe8ff', glow: '#9fd0e8' },
  // Nebula — violet/magenta, matching planet-3's NEBULA palette.
  nebula: { glyph: '✶', accent: '#e0a0ff', glow: '#c79af0' },
};

/** Resolve a palette; unknown/absent themes fall back to the inert default. */
export function paletteFor(theme: PuzzleTheme = 'default'): PuzzlePalette {
  return PALETTES[theme] ?? PALETTES.default;
}
