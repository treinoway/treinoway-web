import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({ name: 'app' })) }));
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ kind: 'auth' })),
  GoogleAuthProvider: vi.fn(function GoogleAuthProvider() { this.kind = 'provider'; }),
}));

describe('firebase bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('does not initialize Firebase (and so cannot throw) when the API key is empty', async () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', '');

    const { auth, googleProvider } = await import('./firebase');

    expect(auth).toBeNull();
    expect(googleProvider).toBeNull();
  });

  it('initializes auth and the Google provider when the key is configured', async () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'key-123');

    const { auth, googleProvider } = await import('./firebase');

    expect(auth).toEqual({ kind: 'auth' });
    expect(googleProvider).toEqual(expect.objectContaining({ kind: 'provider' }));
  });
});
