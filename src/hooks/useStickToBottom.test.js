import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import useStickToBottom from './useStickToBottom';

const setScrollPosition = ({ scrollY, innerHeight, scrollHeight }) => {
  Object.defineProperty(window, 'scrollY', { value: scrollY, writable: true, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: innerHeight, writable: true, configurable: true });
  Object.defineProperty(document.documentElement, 'scrollHeight', { value: scrollHeight, writable: true, configurable: true });
  Object.defineProperty(document.documentElement, 'scrollTop', { value: scrollY, writable: true, configurable: true });
};

describe('useStickToBottom', () => {
  beforeEach(() => {
    vi.spyOn(window, 'addEventListener');
    vi.spyOn(window, 'removeEventListener');
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb();
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    setScrollPosition({ scrollY: 0, innerHeight: 800, scrollHeight: 800 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initialises with isNearBottom=true and shouldFollow=true', () => {
    const { result } = renderHook(() => useStickToBottom());
    expect(result.current.isNearBottom).toBe(true);
    expect(result.current.shouldFollow).toBe(true);
  });

  it('registers a passive scroll listener on window', () => {
    renderHook(() => useStickToBottom());
    expect(window.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });
  });

  it('removes scroll listener on unmount', () => {
    const { unmount } = renderHook(() => useStickToBottom());
    unmount();
    expect(window.removeEventListener).toHaveBeenCalledWith('scroll', expect.any(Function));
  });

  it('sets isNearBottom=false when scroll position is above threshold', () => {
    // page: 2000px tall, viewport 800px, user scrolled to top → 1200px from bottom
    setScrollPosition({ scrollY: 0, innerHeight: 800, scrollHeight: 2000 });

    const { result } = renderHook(() => useStickToBottom({ threshold: 80 }));

    act(() => {
      result.current.onScroll();
    });

    expect(result.current.isNearBottom).toBe(false);
    expect(result.current.shouldFollow).toBe(false);
  });

  it('sets isNearBottom=true when within threshold', () => {
    // page 2000px, viewport 800px, scrolled to 1180px → 20px from bottom (< 80px threshold)
    setScrollPosition({ scrollY: 1180, innerHeight: 800, scrollHeight: 2000 });

    const { result } = renderHook(() => useStickToBottom({ threshold: 80 }));

    act(() => {
      result.current.onScroll();
    });

    expect(result.current.isNearBottom).toBe(true);
    expect(result.current.shouldFollow).toBe(true);
  });

  it('re-enables shouldFollow when user scrolls back to bottom after scrolling away', () => {
    setScrollPosition({ scrollY: 0, innerHeight: 800, scrollHeight: 2000 });

    const { result } = renderHook(() => useStickToBottom({ threshold: 80 }));

    // Scroll away
    act(() => {
      result.current.onScroll();
    });
    expect(result.current.shouldFollow).toBe(false);

    // Scroll back to near bottom
    setScrollPosition({ scrollY: 1180, innerHeight: 800, scrollHeight: 2000 });
    act(() => {
      result.current.onScroll();
    });

    expect(result.current.shouldFollow).toBe(true);
  });

  it('scrollToBottom calls requestAnimationFrame and sets follow=true', () => {
    setScrollPosition({ scrollY: 0, innerHeight: 800, scrollHeight: 2000 });

    const { result } = renderHook(() => useStickToBottom());

    // First scroll away
    act(() => {
      result.current.onScroll();
    });
    expect(result.current.shouldFollow).toBe(false);

    // Now scrollToBottom
    act(() => {
      result.current.scrollToBottom({ behavior: 'smooth' });
    });

    expect(window.requestAnimationFrame).toHaveBeenCalled();
    expect(result.current.isNearBottom).toBe(true);
    expect(result.current.shouldFollow).toBe(true);
  });

  it('coalesces multiple scrollToBottom calls into one rAF', () => {
    // Since our mock executes rAF synchronously, we verify cancelAnimationFrame
    // is called when a second request arrives before the first runs
    const rafIds = [];
    let callCount = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      callCount++;
      const id = callCount;
      rafIds.push(id);
      // Only execute the last one
      if (callCount === 2) cb();
      return id;
    });

    const { result } = renderHook(() => useStickToBottom());

    act(() => {
      result.current.scrollToBottom({ behavior: 'auto' });
      result.current.scrollToBottom({ behavior: 'auto' });
    });

    // cancelAnimationFrame should have been called to cancel the first pending rAF
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('degrades smooth to auto when prefers-reduced-motion is active', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });

    const mockScrollIntoView = vi.fn();
    const { result } = renderHook(() => useStickToBottom());

    const el = document.createElement('div');
    el.scrollIntoView = mockScrollIntoView;
    result.current.bottomRef.current = el;

    act(() => {
      result.current.scrollToBottom({ behavior: 'smooth' });
    });

    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'end' });
  });

  it('uses smooth scroll when prefers-reduced-motion is NOT active', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });

    const mockScrollIntoView = vi.fn();
    const { result } = renderHook(() => useStickToBottom());

    const el = document.createElement('div');
    el.scrollIntoView = mockScrollIntoView;
    result.current.bottomRef.current = el;

    act(() => {
      result.current.scrollToBottom({ behavior: 'smooth' });
    });

    expect(mockScrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'end' });
  });

  it('exposes bottomRef as a ref object', () => {
    const { result } = renderHook(() => useStickToBottom());
    expect(result.current.bottomRef).toHaveProperty('current');
  });
});
