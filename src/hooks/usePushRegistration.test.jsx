import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '../test/test-utils';
import usePushRegistration from './usePushRegistration';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { registerDevice } from '../utils/deviceRegistration';

// Hoisted so the vi.mock factories below can reference these fakes.
const platform = vi.hoisted(() => ({
  isNative: vi.fn(),
  getPlatform: vi.fn(),
  getAppInfo: vi.fn(),
  push: { requestPermission: vi.fn(), getToken: vi.fn(), onNotificationOpened: vi.fn() },
}));

vi.mock('../platform', () => platform);
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../utils/deviceRegistration', () => ({
  registerDevice: vi.fn(),
  unregisterDevice: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

const showToast = vi.fn();
const unsubscribe = vi.fn();
let openedCallback;

// Simulates the user tapping a push notification carrying this data payload.
const tapNotification = (data) => openedCallback(data);

describe('usePushRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    openedCallback = null;
    platform.isNative.mockReturnValue(true);
    platform.push.onNotificationOpened.mockImplementation(async (callback) => {
      openedCallback = callback;
      return unsubscribe;
    });
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true });
    vi.mocked(useToast).mockReturnValue({ showToast });
    vi.mocked(registerDevice).mockResolvedValue(undefined);
  });

  it('registers the device once the trainer is authenticated in the native app', async () => {
    renderHook(() => usePushRegistration());

    await waitFor(() => expect(registerDevice).toHaveBeenCalledTimes(1));
  });

  it('does not register while signed out', () => {
    vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false });

    renderHook(() => usePushRegistration());

    expect(registerDevice).not.toHaveBeenCalled();
  });

  it('does nothing on the website', () => {
    platform.isNative.mockReturnValue(false);

    renderHook(() => usePushRegistration());

    expect(registerDevice).not.toHaveBeenCalled();
    expect(platform.push.onNotificationOpened).not.toHaveBeenCalled();
  });

  it('shows no error when the user refuses the permission', async () => {
    vi.mocked(registerDevice).mockResolvedValue({ registered: false });

    renderHook(() => usePushRegistration());

    await waitFor(() => expect(registerDevice).toHaveBeenCalled());
    expect(showToast).not.toHaveBeenCalled();
  });

  it('opens the session detail when a workout-completed notification is tapped', async () => {
    renderHook(() => usePushRegistration());
    await waitFor(() => expect(openedCallback).toEqual(expect.any(Function)));

    tapNotification({ type: 'workout_completed', studentId: 'student-1', sessionId: 'session-9' });

    expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1/sessions/session-9');
  });

  it('opens the anamnesis response when an anamnesis-submitted notification is tapped', async () => {
    renderHook(() => usePushRegistration());
    await waitFor(() => expect(openedCallback).toEqual(expect.any(Function)));

    tapNotification({ type: 'anamnesis_submitted', studentId: 'student-1', anamnesisId: 'anam-4' });

    expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1/anamneses/anam-4/response');
  });

  it('ignores a notification of an unknown type', async () => {
    renderHook(() => usePushRegistration());
    await waitFor(() => expect(openedCallback).toEqual(expect.any(Function)));

    tapNotification({ type: 'something_else', studentId: 'student-1' });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('stops listening to notification taps on unmount', async () => {
    const { unmount } = renderHook(() => usePushRegistration());
    await waitFor(() => expect(openedCallback).toEqual(expect.any(Function)));

    unmount();

    await waitFor(() => expect(unsubscribe).toHaveBeenCalledTimes(1));
  });
});
