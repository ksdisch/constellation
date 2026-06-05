import type { PlanetConfig } from './planet1';
import { planet1Config } from './planet1';
import { planet2Config } from './planet2';

/**
 * One entry in the ordered planet chain.
 *
 * `config` is optional: a planet without a config is a registered-but-not-yet-
 * authored stub. The Hub renders it as a "Coming soon" node instead of
 * launching it. Adding a real planet later is a drop-in: author its config
 * file and attach it here as `config: planetNConfig` — no other edits needed.
 */
export type PlanetRegistryEntry = {
  id: string;
  label: string;
  config?: PlanetConfig;
};

/**
 * The ordered planet chain. ARRAY ORDER DEFINES PROGRESSION — completing the
 * planet at index N unlocks the planet at index N+1. Reordering this array
 * reorders the unlock chain, so treat the order as a design contract.
 *
 * planet-3 is intentionally a config-less stub for now.
 */
export const PLANETS: readonly PlanetRegistryEntry[] = [
  { id: 'planet-1', label: 'Constellation', config: planet1Config },
  { id: 'planet-2', label: 'Stellar Winds', config: planet2Config },
  { id: 'planet-3', label: 'Nebula Core' },
];
