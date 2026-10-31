import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted so the vi.mock factories below can reference these fakes.
const platform = vi.hoisted(() => ({ isNative: vi.fn(), onAppBackground: vi.fn() }));
vi.mock('../platform', () => platform);

import { onPageLeave } from './pageLeave';

// Sets document.visibilityState and fires visibilitychange.
const changeVisibility = (state) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('onPageLeave', () => {
  const disposeBackground = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    platform.isNative.mockReturnValue(false);
    platform.onAppBackground.mockResolvedValue(disposeBackground);
    changeVisibility('visible');
  });

  it('runs on pagehide and beforeunload', () => {
    const handler = vi.fn();
    const stop = onPageLeave(handler);

    window.dispatchEvent(new Event('pagehide'));
    window.dispatchEvent(new Event('beforeunload'));

    expect(handler).toHaveBeenCalledTimes(2);
    stop();
  });

  it('runs when the page becomes hidden, but not when it becomes visible', () => {
    const handler = vi.fn();
    const stop = onPageLeave(handler);

    changeVisibility('visible');
    expect(handler).not.toHaveBeenCalled();
    changeVisibility('hidden');

    expect(handler).toHaveBeenCalledTimes(1);
    stop();
  });

  it('stops listening after the disposer runs', () => {
    const handler = vi.fn();
    onPageLeave(handler)();

    window.dispatchEvent(new Event('pagehide'));

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not touch the native lifecycle on the website', () => {
    onPageLeave(vi.fn())();

    expect(platform.onAppBackground).not.toHaveBeenCalled();
  });

  it('hooks the native app background event and releases it on dispose', async () => {
    platform.isNative.mockReturnValue(true);
    const handler = vi.fn();
    const stop = onPageLeave(handler);
    await Promise.resolve();

    expect(platform.onAppBackground).toHaveBeenCalledWith(handler);
    stop();

    expect(disposeBackground).toHaveBeenCalledTimes(1);
  });
});
