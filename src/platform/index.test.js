import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted so the vi.mock factories below can reference these fakes.
const capacitor = vi.hoisted(() => ({ isNativePlatform: vi.fn(), getPlatform: vi.fn() }));
// Hoisted so the vi.mock factories below can reference these fakes.
const pluginModules = vi.hoisted(() => ({
  secureStorage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() },
  nativeAuth: { signInWithGoogle: vi.fn(), signInWithApple: vi.fn() },
  push: { requestPermission: vi.fn(), getToken: vi.fn(), onNotificationOpened: vi.fn() },
}));

vi.mock('@capacitor/core', () => ({ Capacitor: capacitor }));
vi.mock('./secureStorage', () => pluginModules.secureStorage);
vi.mock('./nativeAuth', () => pluginModules.nativeAuth);
vi.mock('./push', () => pluginModules.push);

import { isNative, getPlatform, secureStorage, nativeAuth, push } from './index';

describe('platform index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports the native shell and platform name from Capacitor', () => {
    capacitor.isNativePlatform.mockReturnValue(true);
    capacitor.getPlatform.mockReturnValue('ios');

    expect(isNative()).toBe(true);
    expect(getPlatform()).toBe('ios');
  });

  it('is not native on the website', () => {
    capacitor.isNativePlatform.mockReturnValue(false);
    capacitor.getPlatform.mockReturnValue('web');

    expect(isNative()).toBe(false);
    expect(getPlatform()).toBe('web');
  });

  it('loads the secure storage module lazily and forwards the call', async () => {
    pluginModules.secureStorage.getItem.mockResolvedValue('token');

    await expect(secureStorage.getItem('accessToken')).resolves.toBe('token');
    expect(pluginModules.secureStorage.getItem).toHaveBeenCalledWith('accessToken');
  });

  it('forwards native sign-in and push calls to their modules', async () => {
    pluginModules.nativeAuth.signInWithGoogle.mockResolvedValue({ idToken: 'g' });
    pluginModules.push.requestPermission.mockResolvedValue('granted');

    await expect(nativeAuth.signInWithGoogle()).resolves.toEqual({ idToken: 'g' });
    await expect(push.requestPermission()).resolves.toBe('granted');
  });
});
