import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isStaleChunkError, reloadForStaleChunk, installPreloadErrorHandler } from './chunkReload';

describe('chunkReload', () => {
  const reload = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    vi.stubGlobal('location', { ...window.location, reload });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('recognizes the stale-chunk messages of Chrome, Safari and Firefox', () => {
    expect(isStaleChunkError(new Error('Failed to fetch dynamically imported module: https://x/a.js'))).toBe(true);
    expect(isStaleChunkError(new Error('Importing a module script failed.'))).toBe(true);
    expect(isStaleChunkError(new Error('error loading dynamically imported module'))).toBe(true);
    expect(isStaleChunkError(new Error('Cannot read properties of undefined'))).toBe(false);
  });

  it('reloads once and refuses to reload again right after (no loop)', () => {
    expect(reloadForStaleChunk()).toBe(true);
    expect(reloadForStaleChunk()).toBe(false);

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads again after the cooldown', () => {
    sessionStorage.setItem('treinoway.chunkReloadAt', String(Date.now() - 60000));

    expect(reloadForStaleChunk()).toBe(true);
  });

  it('handles vite:preloadError with a guarded reload and cancels the default error', () => {
    const dispose = installPreloadErrorHandler();
    const first = new Event('vite:preloadError', { cancelable: true });
    const second = new Event('vite:preloadError', { cancelable: true });

    window.dispatchEvent(first);
    window.dispatchEvent(second);
    dispose();

    expect(first.defaultPrevented).toBe(true);
    expect(second.defaultPrevented).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
