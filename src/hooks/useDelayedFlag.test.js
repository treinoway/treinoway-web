import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useDelayedFlag from './useDelayedFlag';

describe('useDelayedFlag', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts as false when active is false', () => {
    const { result } = renderHook(() => useDelayedFlag(false, 250));
    expect(result.current).toBe(false);
  });

  it('stays false before the delay elapses when active becomes true', () => {
    const { result } = renderHook(() => useDelayedFlag(true, 250));

    // Timer set but not fired yet
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe(false);
  });

  it('becomes true after the delay elapses when active is true', () => {
    const { result } = renderHook(() => useDelayedFlag(true, 250));

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(result.current).toBe(true);
  });

  it('resets to false immediately when active flips back to false before the delay', () => {
    const { result, rerender } = renderHook(({ a }) => useDelayedFlag(a, 250), {
      initialProps: { a: true },
    });

    // Only 100 ms in — flag still false
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe(false);

    // Cancel before threshold fires
    rerender({ a: false });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Must remain false — timer was cancelled
    expect(result.current).toBe(false);
  });

  it('resets to false immediately when active turns false after flag was shown', () => {
    const { result, rerender } = renderHook(({ a }) => useDelayedFlag(a, 250), {
      initialProps: { a: true },
    });

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current).toBe(true);

    rerender({ a: false });

    expect(result.current).toBe(false);
  });

  it('does not show flag on a fast cycle (active true then false within delay)', () => {
    const { result, rerender } = renderHook(({ a }) => useDelayedFlag(a, 250), {
      initialProps: { a: true },
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    rerender({ a: false });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Fast resolve — flag must never have turned true
    expect(result.current).toBe(false);
  });

  it('restarts the delay timer on each new rising edge', () => {
    const { result, rerender } = renderHook(({ a }) => useDelayedFlag(a, 250), {
      initialProps: { a: true },
    });

    // 200 ms in — cancel
    act(() => { vi.advanceTimersByTime(200); });
    rerender({ a: false });

    // Re-trigger active
    rerender({ a: true });

    // Only 100 ms into the new cycle — still false
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe(false);

    // Complete the full 250 ms from the new rising edge
    act(() => { vi.advanceTimersByTime(150); });
    expect(result.current).toBe(true);
  });
});
