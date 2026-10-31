import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted so the vi.mock factories below can reference these fakes.
const fakes = vi.hoisted(() => ({
  capacitor: { getPlatform: vi.fn() },
  social: { initialize: vi.fn(), login: vi.fn() },
}));

vi.mock('@capacitor/core', () => ({ Capacitor: fakes.capacitor }));
vi.mock('@capgo/capacitor-social-login', () => ({ SocialLogin: fakes.social }));

// Loads the adapter fresh with the given build variables.
const loadAdapter = async (env) => {
  vi.resetModules();
  Object.entries(env).forEach(([key, value]) => vi.stubEnv(key, value));
  return import('./nativeAuth');
};

describe('nativeAuth adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    fakes.social.initialize.mockResolvedValue(undefined);
    fakes.social.login.mockResolvedValue({ result: { idToken: 'id-token' } });
  });

  it('logs in with Google without scopes, which the Android plugin rejects without a custom MainActivity', async () => {
    fakes.capacitor.getPlatform.mockReturnValue('android');
    const { signInWithGoogle } = await loadAdapter({ VITE_GOOGLE_WEB_CLIENT_ID: 'web-id' });

    await expect(signInWithGoogle()).resolves.toEqual({ idToken: 'id-token' });

    const { options } = fakes.social.login.mock.calls[0][0];
    expect(options).not.toHaveProperty('scopes');
  });

  it('is unavailable (no plugin call, no crash) without the web client ID', async () => {
    fakes.capacitor.getPlatform.mockReturnValue('android');
    const { signInWithGoogle } = await loadAdapter({ VITE_GOOGLE_WEB_CLIENT_ID: '' });

    await expect(signInWithGoogle()).rejects.toMatchObject({ code: 'NATIVE_AUTH_UNAVAILABLE' });
    expect(fakes.social.login).not.toHaveBeenCalled();
  });

  it('on iOS stays unavailable until the iOS client ID and the Info.plist URL scheme are declared', async () => {
    fakes.capacitor.getPlatform.mockReturnValue('ios');
    const withoutScheme = await loadAdapter({ VITE_GOOGLE_WEB_CLIENT_ID: 'web', VITE_GOOGLE_IOS_CLIENT_ID: 'ios' });

    await expect(withoutScheme.signInWithGoogle()).rejects.toMatchObject({ code: 'NATIVE_AUTH_UNAVAILABLE' });
    expect(fakes.social.login).not.toHaveBeenCalled();

    const ready = await loadAdapter({ VITE_GOOGLE_WEB_CLIENT_ID: 'web', VITE_GOOGLE_IOS_CLIENT_ID: 'ios', VITE_GOOGLE_IOS_URL_SCHEME_READY: 'true' });
    await expect(ready.signInWithGoogle()).resolves.toEqual({ idToken: 'id-token' });
  });

  it('initializes Google with the web client ID as the iOS server audience', async () => {
    fakes.capacitor.getPlatform.mockReturnValue('ios');
    const { signInWithGoogle } = await loadAdapter({ VITE_GOOGLE_WEB_CLIENT_ID: 'web', VITE_GOOGLE_IOS_CLIENT_ID: 'ios', VITE_GOOGLE_IOS_URL_SCHEME_READY: 'true' });

    await signInWithGoogle();

    expect(fakes.social.initialize.mock.calls[0][0].google).toEqual({ webClientId: 'web', iOSClientId: 'ios', iOSServerClientId: 'web' });
  });

  it('Apple sign-in is iOS only and returns the identity token', async () => {
    fakes.capacitor.getPlatform.mockReturnValue('android');
    const android = await loadAdapter({});
    await expect(android.signInWithApple()).rejects.toMatchObject({ code: 'NATIVE_AUTH_UNAVAILABLE' });

    fakes.capacitor.getPlatform.mockReturnValue('ios');
    const ios = await loadAdapter({});
    await expect(ios.signInWithApple()).resolves.toEqual({ identityToken: 'id-token' });
  });
});
