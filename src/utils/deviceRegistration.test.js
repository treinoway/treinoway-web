import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted so the vi.mock factories below can reference these fakes.
const platform = vi.hoisted(() => ({
  isNative: vi.fn(),
  getPlatform: vi.fn(),
  getAppInfo: vi.fn(),
  push: { requestPermission: vi.fn(), getToken: vi.fn(), onNotificationOpened: vi.fn() },
}));

vi.mock('../platform', () => platform);
vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

import api from '../api/axios';
import { registerDevice, unregisterDevice } from './deviceRegistration';

const FCM_TOKEN = 'fcm-token-1';
const COACH_APP_ID = 'br.com.teufit.coach';

describe('deviceRegistration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    platform.isNative.mockReturnValue(true);
    platform.getAppInfo.mockResolvedValue({ appId: COACH_APP_ID, platform: 'android', version: '1.0.0' });
    platform.push.requestPermission.mockResolvedValue('granted');
    platform.push.getToken.mockResolvedValue(FCM_TOKEN);
    api.post.mockResolvedValue({ data: {} });
    api.delete.mockResolvedValue({ data: {} });
  });

  describe('registerDevice', () => {
    it('posts the FCM token with platform and appId once permission is granted', async () => {
      await registerDevice();

      expect(api.post).toHaveBeenCalledTimes(1);
      expect(api.post).toHaveBeenCalledWith('/me/devices', {
        token: FCM_TOKEN,
        platform: 'android',
        appId: COACH_APP_ID,
      });
    });

    it('does not post and does not throw when permission is denied', async () => {
      platform.push.requestPermission.mockResolvedValue('denied');

      await expect(registerDevice()).resolves.not.toThrow();

      expect(api.post).not.toHaveBeenCalled();
    });

    it('does not ask for a token when permission is denied', async () => {
      platform.push.requestPermission.mockResolvedValue('denied');

      await registerDevice();

      expect(platform.push.getToken).not.toHaveBeenCalled();
    });

    it('does not throw when the backend rejects the registration', async () => {
      api.post.mockRejectedValue(new Error('Network Error'));

      await expect(registerDevice()).resolves.not.toThrow();
    });
  });

  describe('unregisterDevice', () => {
    it('deletes the device by its URL-encoded token', async () => {
      platform.push.getToken.mockResolvedValue('fcm:token/with+chars');

      await unregisterDevice();

      expect(api.delete).toHaveBeenCalledWith(`/me/devices/${encodeURIComponent('fcm:token/with+chars')}`);
    });

    it('does nothing when the device has no push token', async () => {
      platform.push.getToken.mockResolvedValue(null);

      await unregisterDevice();

      expect(api.delete).not.toHaveBeenCalled();
    });

    it('does not throw when the backend rejects, so logout can proceed', async () => {
      api.delete.mockRejectedValue(new Error('Network Error'));

      await expect(unregisterDevice()).resolves.not.toThrow();
    });
  });
});
