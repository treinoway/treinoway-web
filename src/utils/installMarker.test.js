import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted so the vi.mock factory below can reference these fakes.
const platform = vi.hoisted(() => ({ isNative: vi.fn(), secureStorage: { removeItem: vi.fn() } }));
vi.mock('../platform', () => platform);

import { clearSecureSessionOnFreshInstall } from './installMarker';

describe('clearSecureSessionOnFreshInstall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    platform.isNative.mockReturnValue(true);
    platform.secureStorage.removeItem.mockResolvedValue(undefined);
  });

  it('wipes leftover Keychain keys on a fresh install (no marker) and writes the marker', async () => {
    await expect(clearSecureSessionOnFreshInstall()).resolves.toBe(true);

    expect(platform.secureStorage.removeItem.mock.calls.map(([key]) => key).sort()).toEqual(['accessToken', 'refreshToken', 'user']);
    expect(localStorage.getItem('treinoway.installMarker')).not.toBeNull();
  });

  it('keeps the session on later boots (marker present)', async () => {
    await clearSecureSessionOnFreshInstall();
    platform.secureStorage.removeItem.mockClear();

    await expect(clearSecureSessionOnFreshInstall()).resolves.toBe(false);

    expect(platform.secureStorage.removeItem).not.toHaveBeenCalled();
  });

  it('does not fail when a key cannot be removed', async () => {
    platform.secureStorage.removeItem.mockRejectedValue(new Error('locked'));

    await expect(clearSecureSessionOnFreshInstall()).resolves.toBe(true);
  });

  it('does nothing on the website', async () => {
    platform.isNative.mockReturnValue(false);

    await clearSecureSessionOnFreshInstall();

    expect(platform.secureStorage.removeItem).not.toHaveBeenCalled();
    expect(localStorage.getItem('treinoway.installMarker')).toBeNull();
  });
});
