import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '../test/test-utils';
import usePushTokenSync from './usePushTokenSync';
import { useAuth } from '../contexts/AuthContext';
import { registerDevice, registerDeviceToken, shouldRetryRegistration } from '../utils/deviceRegistration';

// Hoisted so the vi.mock factories below can reference these fakes.
const platform = vi.hoisted(() => ({ isNative: vi.fn(), push: { onTokenReceived: vi.fn() } }));

vi.mock('../platform', () => platform);
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../utils/deviceRegistration', () => ({
  registerDevice: vi.fn(),
  registerDeviceToken: vi.fn(),
  shouldRetryRegistration: vi.fn(),
}));

const unsubscribe = vi.fn();
let onToken;

// Sets document.visibilityState and fires visibilitychange.
const changeVisibility = (state) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
};

describe('usePushTokenSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    platform.isNative.mockReturnValue(true);
    platform.push.onTokenReceived.mockImplementation(async (callback) => {
      onToken = callback;
      return unsubscribe;
    });
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true });
    vi.mocked(registerDeviceToken).mockResolvedValue(undefined);
    vi.mocked(shouldRetryRegistration).mockReturnValue(false);
    changeVisibility('visible');
  });

  it('re-posts a rotated FCM token to POST /me/devices', async () => {
    renderHook(() => usePushTokenSync());
    await waitFor(() => expect(onToken).toEqual(expect.any(Function)));

    onToken('rotated-token');

    expect(registerDeviceToken).toHaveBeenCalledWith('rotated-token');
  });

  it('retries a failed registration when the app returns to the foreground', async () => {
    vi.mocked(shouldRetryRegistration).mockReturnValue(true);
    renderHook(() => usePushTokenSync());

    changeVisibility('hidden');
    expect(registerDevice).not.toHaveBeenCalled();
    changeVisibility('visible');

    expect(registerDevice).toHaveBeenCalledTimes(1);
  });

  it('does not retry when nothing is pending (registered or permission refused)', () => {
    renderHook(() => usePushTokenSync());

    changeVisibility('visible');

    expect(registerDevice).not.toHaveBeenCalled();
  });

  it('stays idle signed out and on the website, and unsubscribes on unmount', async () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false });
    renderHook(() => usePushTokenSync());
    platform.isNative.mockReturnValue(false);
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true });
    renderHook(() => usePushTokenSync());
    expect(platform.push.onTokenReceived).not.toHaveBeenCalled();

    platform.isNative.mockReturnValue(true);
    const { unmount } = renderHook(() => usePushTokenSync());
    await waitFor(() => expect(onToken).toEqual(expect.any(Function)));
    unmount();

    await waitFor(() => expect(unsubscribe).toHaveBeenCalledTimes(1));
  });
});
