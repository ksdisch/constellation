import { describe, it, expect, afterEach } from 'vitest';
import {
  isTestMode,
  getTestInput,
  ensureBridge,
  setBridgeProviders,
} from './testBridge';

/**
 * No-op-without-flag contract.
 *
 * Under the default jsdom location there is NO `?test=1` query param, so the
 * entire bridge must be inert: no synthetic input, no `window.__constellation`
 * object, and no provider mutation. This is the load-bearing safety guarantee
 * for production — verified, not assumed.
 *
 * We deliberately do NOT flip the URL mid-test (jsdom's location is awkward to
 * stub cleanly); the default-location case is exactly the production case.
 */
describe('testBridge — inert without ?test=1', () => {
  afterEach(() => {
    // Defensive: ensure no test accidentally leaves the bridge installed.
    delete window.__constellation;
  });

  it('isTestMode() is false under the default (no-flag) location', () => {
    expect(isTestMode()).toBe(false);
  });

  it('getTestInput() returns null when not in test mode', () => {
    expect(getTestInput()).toBeNull();
  });

  it('ensureBridge() does NOT create window.__constellation', () => {
    expect(window.__constellation).toBeUndefined();
    ensureBridge();
    expect(window.__constellation).toBeUndefined();
  });

  it('setBridgeProviders() is a no-op and never installs the bridge', () => {
    setBridgeProviders({
      getState: () => {
        throw new Error('provider should not be installed without ?test=1');
      },
      cast: () => {
        throw new Error('provider should not be installed without ?test=1');
      },
      startPlanet: () => {
        throw new Error('provider should not be installed without ?test=1');
      },
    });
    // It registered nothing, and there is no bridge object to invoke them through.
    expect(window.__constellation).toBeUndefined();
  });
});
