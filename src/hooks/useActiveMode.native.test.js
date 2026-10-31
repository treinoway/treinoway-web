import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '../test/test-utils';
import useActiveMode from './useActiveMode';

// Hoisted so the vi.mock factories below can reference these fakes.
const platform = vi.hoisted(() => ({ isNative: vi.fn() }));
vi.mock('../platform', () => platform);

describe('useActiveMode in the native app', () => {
  beforeEach(() => {
    localStorage.clear();
    platform.isNative.mockReturnValue(true);
  });

  it('always enters as trainer, even when a nutritionist mode was stored', () => {
    localStorage.setItem('treinoway.activeMode', 'nutritionist');

    const { result } = renderHook(() => useActiveMode());

    expect(result.current[0]).toBe('trainer');
  });

  it('ignores attempts to switch mode', () => {
    const { result } = renderHook(() => useActiveMode());

    act(() => result.current[1]('nutritionist'));

    expect(result.current[0]).toBe('trainer');
    expect(localStorage.getItem('treinoway.activeMode')).toBeNull();
  });
});

describe('useActiveMode on the website', () => {
  beforeEach(() => {
    localStorage.clear();
    platform.isNative.mockReturnValue(false);
  });

  it('keeps honoring the stored mode and switches', () => {
    localStorage.setItem('treinoway.activeMode', 'nutritionist');
    const { result } = renderHook(() => useActiveMode());

    expect(result.current[0]).toBe('nutritionist');
    act(() => result.current[1]('trainer'));

    expect(result.current[0]).toBe('trainer');
  });
});
