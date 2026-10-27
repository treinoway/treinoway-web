import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '../test/test-utils';
import useMediaQuery from './useMediaQuery';

describe('useMediaQuery', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns false when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);
  });

  it('returns the initial match and follows change events', () => {
    let listener;
    let currentMatch = true;
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      get matches() { return currentMatch; },
      addEventListener: (_event, handler) => { listener = handler; },
      removeEventListener: vi.fn(),
    })));
    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
    currentMatch = false;
    act(() => listener({ matches: false }));
    expect(result.current).toBe(false);
  });

  it('re-syncs with the current match when the query changes', () => {
    vi.stubGlobal('matchMedia', vi.fn((query) => ({
      matches: query === '(min-width: 1024px)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    const { result, rerender } = renderHook(({ query }) => useMediaQuery(query), {
      initialProps: { query: '(min-width: 768px)' },
    });
    expect(result.current).toBe(false);
    rerender({ query: '(min-width: 1024px)' });
    expect(result.current).toBe(true);
  });

  it('falls back to addListener/removeListener on legacy browsers', () => {
    const addListener = vi.fn();
    const removeListener = vi.fn();
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addListener, removeListener })));
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(addListener).toHaveBeenCalledTimes(1);
    unmount();
    expect(removeListener).toHaveBeenCalledTimes(1);
  });
});
