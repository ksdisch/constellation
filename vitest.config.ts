import { defineConfig } from 'vitest/config';

/**
 * Test-only config, kept separate from vite.config.ts so the production build
 * (rollupOptions.input = game + phone) never globs test files. jsdom gives the
 * persistence module a real window.localStorage; globals lets tests use
 * describe/it/expect without imports (typed via tsconfig "types").
 */
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
    // Determinism guards: run test files serially and in a stable order, and
    // keep per-file module isolation on (the default). This removes the
    // file-churn/parallelism transform races that made the suite flake under
    // vitest 4 — the persistence assertions must be reproducible to be the
    // sanctioned verification gate.
    fileParallelism: false,
    isolate: true,
    sequence: { shuffle: false },
  },
});
