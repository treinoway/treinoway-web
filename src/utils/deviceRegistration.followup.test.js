import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted so the vi.mock factories below can reference these fakes.
const platform = vi.hoisted(() => ({
  getAppInfo: vi.fn(),
  push: { requestPermission: vi.fn(), getToken: vi.fn() },
}));

vi.mock('../platform', () => platform);
vi.mock('../api/axios', () => ({ default: { post: vi.fn(), delete: vi.fn() } }));

import api from '../api/axios';
import { registerDevice, registerDeviceToken, shouldRetryRegistration, unregisterDevice } from './deviceRegistration';

describe('deviceRegistration follow-ups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    platform.getAppInfo.mockResolvedValue({ appId: 'br.com.teufit.coach', platform: 'ios', version: '1.0.0' });
    platform.push.requestPermission.mockResolvedValue('granted');
    platform.push.getToken.mockResolvedValue('tok');
    api.post.mockResolvedValue({});
    api.delete.mockResolvedValue({});
  });

  it('registerDeviceToken posts a rotated token with platform and appId', async () => {
    await registerDeviceToken('rotated');

    expect(api.post).toHaveBeenCalledWith('/me/devices', { token: 'rotated', platform: 'ios', appId: 'br.com.teufit.coach' });
  });

  it('retries only failures that can heal: no token yet or a request error, never a refused permission', async () => {
    platform.push.getToken.mockResolvedValue(null);
    await registerDevice();
    expect(shouldRetryRegistration()).toBe(true);

    platform.push.getToken.mockResolvedValue('tok');
    api.post.mockRejectedValue(new Error('Network Error'));
    await registerDevice();
    expect(shouldRetryRegistration()).toBe(true);

    platform.push.requestPermission.mockResolvedValue('denied');
    await registerDevice();
    expect(shouldRetryRegistration()).toBe(false);

    platform.push.requestPermission.mockResolvedValue('granted');
    api.post.mockResolvedValue({});
    await registerDevice();
    expect(shouldRetryRegistration()).toBe(false);
  });

  it('unregisterDevice passes the AbortSignal to the DELETE so logout can cancel it', async () => {
    const { signal } = new AbortController();

    await unregisterDevice({ signal });

    expect(api.delete).toHaveBeenCalledWith('/me/devices/tok', { signal });
  });
});
