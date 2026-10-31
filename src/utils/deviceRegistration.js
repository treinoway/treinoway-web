import api from '../api/axios';
import { getAppInfo, push } from '../platform';

let lastOutcome = null;

// Tells whether the last registration attempt failed for a reason worth retrying (no token yet, or a network/server error); a refused permission is not retried.
export function shouldRetryRegistration() {
  return lastOutcome !== null && !lastOutcome.registered && lastOutcome.reason !== 'denied';
}

// Posts a token to POST /me/devices with the platform and app ID of this build.
export async function registerDeviceToken(token) {
  const { appId, platform } = await getAppInfo();
  await api.post('/me/devices', { token, platform, appId });
}

// Asks push permission and registers the FCM token on POST /me/devices; never throws.
export async function registerDevice() {
  try {
    const permission = await push.requestPermission();
    if (permission !== 'granted') {
      lastOutcome = { registered: false, reason: 'denied' };
      return lastOutcome;
    }
    const token = await push.getToken();
    if (!token) {
      lastOutcome = { registered: false, reason: 'no-token' };
      return lastOutcome;
    }
    await registerDeviceToken(token);
    lastOutcome = { registered: true };
    return lastOutcome;
  } catch (error) {
    console.error('[push] device registration failed:', error);
    lastOutcome = { registered: false, reason: 'error' };
    return lastOutcome;
  }
}

// Removes the FCM token through DELETE /me/devices/:token; never throws so logout can proceed. An optional AbortSignal cancels the request.
export async function unregisterDevice({ signal } = {}) {
  try {
    const token = await push.getToken();
    if (!token) return;
    const url = `/me/devices/${encodeURIComponent(token)}`;
    await (signal ? api.delete(url, { signal }) : api.delete(url));
  } catch (error) {
    console.error('[push] device removal failed:', error);
  }
}
