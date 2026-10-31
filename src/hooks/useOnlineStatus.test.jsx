import { describe, it, expect, afterEach } from 'vitest';
import { renderHook, act } from '../test/test-utils';
import useOnlineStatus from './useOnlineStatus';

// Fakes navigator.onLine.
const setNavigatorOnline = (value) => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value });
};

describe('useOnlineStatus', () => {
  afterEach(() => setNavigatorOnline(true));

  it('starts from navigator.onLine', () => {
    setNavigatorOnline(false);

    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(false);
  });

  it('follows the offline and online events', () => {
    setNavigatorOnline(true);
    const { result } = renderHook(() => useOnlineStatus());

    act(() => { window.dispatchEvent(new Event('offline')); });
    expect(result.current).toBe(false);
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(result.current).toBe(true);
  });
});
