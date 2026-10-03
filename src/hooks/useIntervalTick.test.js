import { renderHook, act } from '../test/test-utils';
import useIntervalTick from './useIntervalTick';

describe('useIntervalTick', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('increments on every interval while enabled', () => {
    const { result } = renderHook(() => useIntervalTick(1000));
    expect(result.current).toBe(0);

    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current).toBe(3);
  });

  it('does not tick when paused with null', () => {
    const { result } = renderHook(() => useIntervalTick(null));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(result.current).toBe(0);
  });

  it('stops ticking after unmount and when paused', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const { result, rerender, unmount } = renderHook(({ ms }) => useIntervalTick(ms), {
      initialProps: { ms: 1000 },
    });
    rerender({ ms: null });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current).toBe(0);

    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
