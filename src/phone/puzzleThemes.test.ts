import { paletteFor } from './puzzleThemes';
import type { PuzzleTheme } from '../shared/protocol';

describe('paletteFor', () => {
  it('default theme is inert — empty glyph (so planet-1 puzzles are unchanged)', () => {
    expect(paletteFor('default').glyph).toBe('');
  });

  it('themed planets carry a non-empty glyph (the themed-layer gate)', () => {
    expect(paletteFor('ice').glyph).not.toBe('');
    expect(paletteFor('nebula').glyph).not.toBe('');
  });

  it('every theme resolves to a full palette (glyph + accent + glow)', () => {
    const themes: PuzzleTheme[] = ['default', 'ice', 'nebula'];
    for (const t of themes) {
      const pal = paletteFor(t);
      expect(typeof pal.glyph).toBe('string');
      expect(pal.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(pal.glow).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('falls back to the inert default when called with no theme', () => {
    expect(paletteFor()).toEqual(paletteFor('default'));
  });

  it('distinct themes get distinct glyphs', () => {
    const glyphs = (['default', 'ice', 'nebula'] as const).map((t) => paletteFor(t).glyph);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });
});
