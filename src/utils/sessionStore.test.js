import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted so the vi.mock factories below can reference these fakes.
const { secureStore, platform } = vi.hoisted(() => {
  const store = new Map();
  return {
    secureStore: store,
    platform: {
      isNative: vi.fn(),
      secureStorage: {
        getItem: vi.fn(async (key) => (store.has(key) ? store.get(key) : null)),
        setItem: vi.fn(async (key, value) => { store.set(key, value); }),
        removeItem: vi.fn(async (key) => { store.delete(key); }),
      },
    },
  };
});

vi.mock('../platform', () => platform);

import {
  clearStoredSession,
  readSessionValue,
  readWebSession,
  restoreStoredSession,
  whenSessionReady,
  writeSessionValue,
} from './sessionStore';

describe('sessionStore on the website', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    secureStore.clear();
    platform.isNative.mockReturnValue(false);
  });

  it('reads and writes localStorage and never touches the secure store', async () => {
    await writeSessionValue('accessToken', 'web-token');

    expect(readSessionValue('accessToken')).toBe('web-token');
    expect(localStorage.getItem('accessToken')).toBe('web-token');
    expect(platform.secureStorage.setItem).not.toHaveBeenCalled();
  });

  it('restores the session synchronously-shaped from localStorage, parsing the user', async () => {
    localStorage.setItem('accessToken', 'a');
    localStorage.setItem('user', JSON.stringify({ id: 1 }));

    expect(await restoreStoredSession()).toEqual({ accessToken: 'a', refreshToken: null, user: { id: 1 } });
    expect(readWebSession().user).toEqual({ id: 1 });
  });

  it('treats a corrupt stored user as signed out', () => {
    localStorage.setItem('user', '{not json');

    expect(readWebSession().user).toBeNull();
  });

  it('clears the three session keys', async () => {
    localStorage.setItem('accessToken', 'a');
    localStorage.setItem('refreshToken', 'r');
    localStorage.setItem('user', '{}');

    await clearStoredSession();

    expect(localStorage.length).toBe(0);
  });

  it('is ready immediately and never reads the secure store', async () => {
    await whenSessionReady();

    expect(platform.secureStorage.getItem).not.toHaveBeenCalled();
  });
});

describe('sessionStore in the native app', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    secureStore.clear();
    platform.isNative.mockReturnValue(true);
  });

  it('restores the session from the secure store', async () => {
    secureStore.set('accessToken', 'secure-a');
    secureStore.set('user', JSON.stringify({ id: 7 }));

    expect(await restoreStoredSession()).toEqual({ accessToken: 'secure-a', refreshToken: null, user: { id: 7 } });
  });

  it('serves reads from memory once ready and writes through to the secure store only', async () => {
    await whenSessionReady();

    await writeSessionValue('accessToken', 'new-token');

    expect(readSessionValue('accessToken')).toBe('new-token');
    expect(secureStore.get('accessToken')).toBe('new-token');
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  it('treats a failing secure-store read as an empty session', async () => {
    platform.secureStorage.getItem.mockRejectedValueOnce(new Error('keystore locked'));

    const stored = await restoreStoredSession();

    expect(stored.accessToken).toBeNull();
  });

  it('clears memory and the secure store', async () => {
    secureStore.set('accessToken', 'a');
    await restoreStoredSession();

    await clearStoredSession();

    expect(readSessionValue('accessToken')).toBeNull();
    expect(secureStore.size).toBe(0);
  });
});
