import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted so the vi.mock factories below can reference these fakes.
const capacitorApp = vi.hoisted(() => ({
  listener: null,
  remove: vi.fn(),
  addListener: vi.fn(),
  minimizeApp: vi.fn(),
}));

vi.mock('@capacitor/app', () => ({
  App: { addListener: capacitorApp.addListener, minimizeApp: capacitorApp.minimizeApp },
}));

import { registerBackButton } from './backButton';

// Fires the listener the adapter registered with the Capacitor App plugin.
const pressBack = () => capacitorApp.listener({ canGoBack: false });

describe('platform/backButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capacitorApp.listener = null;
    capacitorApp.addListener.mockImplementation(async (eventName, callback) => {
      capacitorApp.listener = callback;
      return { remove: capacitorApp.remove };
    });
  });

  it('listens to the backButton event of the App plugin', async () => {
    await registerBackButton({ goBack: vi.fn(), canGoBack: () => true });

    expect(capacitorApp.addListener).toHaveBeenCalledWith('backButton', expect.any(Function));
  });

  it('goes back one screen when the app has history', async () => {
    const goBack = vi.fn();
    await registerBackButton({ goBack, canGoBack: () => true });

    pressBack();

    expect(goBack).toHaveBeenCalledTimes(1);
    expect(capacitorApp.minimizeApp).not.toHaveBeenCalled();
  });

  it('minimizes the app at the root, without going back', async () => {
    const goBack = vi.fn();
    await registerBackButton({ goBack, canGoBack: () => false });

    pressBack();

    expect(capacitorApp.minimizeApp).toHaveBeenCalledTimes(1);
    expect(goBack).not.toHaveBeenCalled();
  });

  it('decides on every press, using the history state at that moment', async () => {
    const goBack = vi.fn();
    let hasHistory = true;
    await registerBackButton({ goBack, canGoBack: () => hasHistory });

    pressBack();
    hasHistory = false;
    pressBack();

    expect(goBack).toHaveBeenCalledTimes(1);
    expect(capacitorApp.minimizeApp).toHaveBeenCalledTimes(1);
  });

  it('returns a disposer that removes the listener', async () => {
    const dispose = await registerBackButton({ goBack: vi.fn(), canGoBack: () => true });

    await dispose();

    expect(capacitorApp.remove).toHaveBeenCalledTimes(1);
  });
});
