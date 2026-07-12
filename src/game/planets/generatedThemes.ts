import type { PlanetTheme } from './planet1';
import type { PuzzleTheme } from '../../shared/protocol';

/**
 * The palette library for GENERATED planets ("The Planet That Knows You Two").
 *
 * The generator is themeless on its own: a themed `PlanetConfig` resolves its
 * textures through `Planet.tex()` as `<key>-<config.id>`, and those keyed
 * textures only exist if `Boot` baked them. But `Boot` bakes theme textures by
 * scanning the REGISTRY, and a grown planet is launched by scene-data, never
 * registered. So a grown planet can only wear a theme whose textures `Boot`
 * pre-baked under a KNOWN id.
 *
 * This module is that known set. `Boot` bakes `<key>-planet-generated-<slug>`
 * for every entry here (mirroring its registry loop), and `generatePlanet`
 * deterministically picks one from the pair's seed and stamps
 * `id = planet-generated-<slug>` so `tex()` resolves to the baked textures.
 * A grown planet therefore looks like a real planet, not the default skin — and
 * two different pairs can grow visibly different-feeling worlds.
 *
 * Each `puzzleTheme` is a valid `PuzzleTheme` (announced to the phone via
 * `planet-started`) chosen to match the palette's temperature, so the phone
 * puzzles dress to match the grown world.
 */
export type GeneratedTheme = {
  /** Stable texture-key suffix; part of the planet id (`planet-generated-<slug>`). */
  slug: string;
  /** User-visible flavour appended to the grown planet's name. */
  label: string;
  theme: PlanetTheme;
  puzzleTheme: PuzzleTheme;
};

export const GENERATED_THEMES: GeneratedTheme[] = [
  {
    // Cool green-teal — a calm aurora field.
    slug: 'aurora',
    label: 'Aurora',
    theme: {
      background: '#08201c',
      ground: 0x2f5d52,
      ceiling: 0x1e3d36,
      platform: 0x7affd0,
      hiddenPlatform: 0x2f5d52,
      enemy: 0xff6b9d,
      goal: 0xffef7a,
    },
    puzzleTheme: 'ice',
  },
  {
    // Warm orange-red — an ember-lit world; cool sentry so it pops.
    slug: 'ember',
    label: 'Ember',
    theme: {
      background: '#2a0f0a',
      ground: 0x6a3a2a,
      ceiling: 0x4a2418,
      platform: 0xffab6a,
      hiddenPlatform: 0x6a3a2a,
      enemy: 0x7ad8ff,
      goal: 0xffef7a,
    },
    puzzleTheme: 'default',
  },
  {
    // Deep violet-indigo — a twilight nebula.
    slug: 'twilight',
    label: 'Twilight',
    theme: {
      background: '#0f0a2e',
      ground: 0x4a4a8a,
      ceiling: 0x2a2a5a,
      platform: 0xb98aff,
      hiddenPlatform: 0x4a4a8a,
      enemy: 0xff6b9d,
      goal: 0xffef7a,
    },
    puzzleTheme: 'nebula',
  },
];
