import { act, renderHook } from '../test/test-utils';
import useResendCooldown from './useResendCooldown';
import { ResendCooldownProvider } from '../contexts/ResendCooldownContext';

describe('useResendCooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts idle', () => {
    const { result } = renderHook(() => useResendCooldown(60, 'user-1'));

    expect(result.current.isCoolingDown).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
  });

  it('counts down from the given seconds and ends', () => {
    const { result } = renderHook(() => useResendCooldown(60, 'user-1'));

    act(() => result.current.startCooldown());
    expect(result.current.isCoolingDown).toBe(true);
    expect(result.current.remainingSeconds).toBe(60);

    act(() => {
      vi.advanceTimersByTime(45_000);
    });
    expect(result.current.remainingSeconds).toBe(15);

    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(result.current.isCoolingDown).toBe(false);
    expect(result.current.remainingSeconds).toBe(0);
  });

  it('starts from the seconds given to startCooldown instead of the default', () => {
    const { result } = renderHook(() => useResendCooldown(60, 'user-1'));

    act(() => result.current.startCooldown(42));

    expect(result.current.remainingSeconds).toBe(42);
  });

  it('shares one deadline between callers inside the provider and keeps it across a remount', () => {
    const useTwoCallers = () => ({ first: useResendCooldown(60, 'user-1'), second: useResendCooldown(60, 'user-1') });
    const { result } = renderHook(() => useTwoCallers(), { wrapper: ResendCooldownProvider });

    act(() => result.current.first.startCooldown());

    expect(result.current.second.isCoolingDown).toBe(true);
    expect(result.current.second.remainingSeconds).toBe(60);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.second.isCoolingDown).toBe(false);
  });

  it('does not apply the cooldown of one user to another', () => {
    const useTwoUsers = () => ({ ana: useResendCooldown(60, 'user-1'), bia: useResendCooldown(60, 'user-2') });
    const { result } = renderHook(() => useTwoUsers(), { wrapper: ResendCooldownProvider });

    act(() => result.current.ana.startCooldown());

    expect(result.current.ana.isCoolingDown).toBe(true);
    expect(result.current.bia.isCoolingDown).toBe(false);
  });
});
