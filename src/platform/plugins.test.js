import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted so the vi.mock factories below can reference these fakes.
const plugins = vi.hoisted(() => ({
  capacitor: { getPlatform: vi.fn() },
  app: { getInfo: vi.fn(), addListener: vi.fn() },
  secure: { get: vi.fn(), set: vi.fn(), remove: vi.fn(), setDefaultKeychainAccess: vi.fn(), setSynchronize: vi.fn() },
  browser: { open: vi.fn() },
  keyboard: { addListener: vi.fn() },
  messaging: { requestPermissions: vi.fn(), getToken: vi.fn(), addListener: vi.fn(), deleteToken: vi.fn() },
  social: { initialize: vi.fn(), login: vi.fn() },
}));

vi.mock('@capacitor/core', () => ({ Capacitor: plugins.capacitor }));
vi.mock('@capacitor/app', () => ({ App: plugins.app }));
vi.mock('@aparajita/capacitor-secure-storage', () => ({ SecureStorage: plugins.secure, KeychainAccess: { whenUnlockedThisDeviceOnly: 1 } }));
vi.mock('@capacitor/browser', () => ({ Browser: plugins.browser }));
vi.mock('@capacitor/keyboard', () => ({ Keyboard: plugins.keyboard }));
vi.mock('@capacitor-firebase/messaging', () => ({ FirebaseMessaging: plugins.messaging }));
vi.mock('@capgo/capacitor-social-login', () => ({ SocialLogin: plugins.social }));

import { getAppInfo } from './appInfo';
import { getItem, setItem, removeItem } from './secureStorage';
import { openExternalUrl } from './externalLinks';
import { onAppBackground } from './lifecycle';
import { onKeyboardVisibility } from './keyboard';
import { requestPermission, getToken, onNotificationOpened, deleteToken, onTokenReceived } from './push';

describe('platform plugin adapters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAppInfo maps the App plugin info and the Capacitor platform', async () => {
    plugins.app.getInfo.mockResolvedValue({ id: 'br.com.teufit.coach', version: '1.2.3', build: '9' });
    plugins.capacitor.getPlatform.mockReturnValue('android');

    expect(await getAppInfo()).toEqual({ appId: 'br.com.teufit.coach', platform: 'android', version: '1.2.3' });
  });

  it('secureStorage returns strings, null for anything else, and forwards writes and removals', async () => {
    plugins.secure.get.mockResolvedValueOnce('abc').mockResolvedValueOnce(null).mockResolvedValueOnce({ any: 1 });

    expect(await getItem('k')).toBe('abc');
    expect(await getItem('k')).toBeNull();
    expect(await getItem('k')).toBeNull();
    await setItem('k', 'v');
    await removeItem('k');
    expect(plugins.secure.set).toHaveBeenCalledWith('k', 'v');
    expect(plugins.secure.remove).toHaveBeenCalledWith('k');
  });

  it('configures the Keychain as whenUnlockedThisDeviceOnly, without iCloud sync, before the first access', async () => {
    plugins.secure.get.mockResolvedValue(null);
    vi.resetModules();
    const fresh = await import('./secureStorage');

    await fresh.getItem('k');
    await fresh.setItem('k', 'v');

    expect(plugins.secure.setDefaultKeychainAccess).toHaveBeenCalledWith(1);
    expect(plugins.secure.setSynchronize).toHaveBeenCalledWith(false);
    expect(plugins.secure.setDefaultKeychainAccess).toHaveBeenCalledTimes(1);
    expect(plugins.secure.setDefaultKeychainAccess.mock.invocationCallOrder[0]).toBeLessThan(plugins.secure.get.mock.invocationCallOrder[0]);
  });

  it('push.deleteToken removes the local FCM token and onTokenReceived forwards rotated tokens', async () => {
    const remove = vi.fn();
    let listener;
    plugins.messaging.addListener.mockImplementation(async (name, callback) => {
      listener = callback;
      return { remove };
    });
    const callback = vi.fn();

    await deleteToken();
    const unsubscribe = await onTokenReceived(callback);
    listener({ token: 'rotated' });
    unsubscribe();

    expect(plugins.messaging.deleteToken).toHaveBeenCalledTimes(1);
    expect(plugins.messaging.addListener.mock.calls[0][0]).toBe('tokenReceived');
    expect(callback).toHaveBeenCalledWith('rotated');
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('openExternalUrl hands the URL to the system browser plugin', async () => {
    await openExternalUrl('https://example.com');

    expect(plugins.browser.open).toHaveBeenCalledWith({ url: 'https://example.com' });
  });

  it('onAppBackground fires only when the app becomes inactive and removes the listener on dispose', async () => {
    const remove = vi.fn();
    let listener;
    plugins.app.addListener.mockImplementation(async (name, callback) => {
      listener = callback;
      return { remove };
    });
    const callback = vi.fn();

    const dispose = await onAppBackground(callback);
    listener({ isActive: true });
    listener({ isActive: false });
    dispose();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('onKeyboardVisibility reports show and hide and removes both listeners', async () => {
    const listeners = {};
    const remove = vi.fn();
    plugins.keyboard.addListener.mockImplementation(async (name, callback) => {
      listeners[name] = callback;
      return { remove };
    });
    const callback = vi.fn();

    const dispose = await onKeyboardVisibility(callback);
    listeners.keyboardWillShow();
    listeners.keyboardWillHide();
    await dispose();

    expect(callback.mock.calls).toEqual([[true], [false]]);
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it('push.requestPermission collapses every non-granted state to denied', async () => {
    plugins.messaging.requestPermissions
      .mockResolvedValueOnce({ receive: 'granted' })
      .mockResolvedValueOnce({ receive: 'prompt' })
      .mockResolvedValueOnce({ receive: 'denied' });

    expect(await requestPermission()).toBe('granted');
    expect(await requestPermission()).toBe('denied');
    expect(await requestPermission()).toBe('denied');
  });

  it('push.getToken returns the FCM token, or null when Firebase is not configured', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    plugins.messaging.getToken.mockResolvedValueOnce({ token: 'fcm-1' }).mockRejectedValueOnce(new Error('not configured'));

    expect(await getToken()).toBe('fcm-1');
    expect(await getToken()).toBeNull();
  });

  it('push.onNotificationOpened passes the data payload and returns an unsubscribe function', async () => {
    const remove = vi.fn();
    let listener;
    plugins.messaging.addListener.mockImplementation(async (name, callback) => {
      listener = callback;
      return { remove };
    });
    const callback = vi.fn();

    const unsubscribe = await onNotificationOpened(callback);
    listener({ notification: { data: { type: 'workout_completed' } } });
    listener({ notification: {} });
    unsubscribe();

    expect(callback.mock.calls).toEqual([[{ type: 'workout_completed' }], [{}]]);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
