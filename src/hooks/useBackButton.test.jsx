import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '../test/test-utils';
import useBackButton from './useBackButton';

// Hoisted so the vi.mock factories below can reference these fakes.
const platform = vi.hoisted(() => ({ isNative: vi.fn(), getPlatform: vi.fn(), registerBackButton: vi.fn() }));
vi.mock('../platform', () => platform);

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

const dispose = vi.fn();

describe('useBackButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    platform.isNative.mockReturnValue(true);
    platform.getPlatform.mockReturnValue('android');
    platform.registerBackButton.mockResolvedValue(dispose);
    window.history.replaceState(null, '', '/');
  });

  it('registers the back button on Android and goes back one screen', async () => {
    renderHook(() => useBackButton());
    await waitFor(() => expect(platform.registerBackButton).toHaveBeenCalledTimes(1));

    platform.registerBackButton.mock.calls[0][0].goBack();

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('can go back only when the router history has an earlier in-app screen', async () => {
    renderHook(() => useBackButton());
    await waitFor(() => expect(platform.registerBackButton).toHaveBeenCalled());
    const { canGoBack } = platform.registerBackButton.mock.calls[0][0];

    window.history.replaceState({ idx: 0 }, '', '/');
    expect(canGoBack()).toBe(false);
    window.history.replaceState({ idx: 2 }, '', '/trainer/students');
    expect(canGoBack()).toBe(true);
  });

  it('releases the listener on unmount', async () => {
    const { unmount } = renderHook(() => useBackButton());
    await waitFor(() => expect(platform.registerBackButton).toHaveBeenCalled());

    unmount();

    await waitFor(() => expect(dispose).toHaveBeenCalledTimes(1));
  });

  it('does nothing on iOS and on the website', () => {
    platform.getPlatform.mockReturnValue('ios');
    renderHook(() => useBackButton());
    platform.isNative.mockReturnValue(false);
    platform.getPlatform.mockReturnValue('web');
    renderHook(() => useBackButton());

    expect(platform.registerBackButton).not.toHaveBeenCalled();
  });
});
