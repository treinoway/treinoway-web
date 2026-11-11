import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '../test/test-utils';
import useConsistencyRankingAccess from './useConsistencyRankingAccess';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const ORIGINAL_URL = window.location.href;

// Mocks the authenticated user with the given roles (hasRole is case-insensitive like the real one).
const mockRoles = (roles) => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 1, roles },
    hasRole: (role) => roles.includes(role.toUpperCase()),
  });
};

// Points window.location at the given hostname through the jsdom instance.
const setHostname = (hostname) => {
  globalThis.jsdom.reconfigure({ url: `https://${hostname}/trainer/consistency-ranking` });
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('DEV', false);
});

afterEach(() => {
  vi.unstubAllEnvs();
  globalThis.jsdom.reconfigure({ url: ORIGINAL_URL });
});

describe('PAN-61 useConsistencyRankingAccess', () => {
  it('PAN-61 returns false for a non-admin trainer on the production hostname', () => {
    mockRoles(['TRAINER']);
    setHostname('app.teufit.com.br');

    const { result } = renderHook(() => useConsistencyRankingAccess());

    expect(result.current).toBe(false);
  });

  it('PAN-61 returns true for an admin on the production hostname', () => {
    mockRoles(['TRAINER', 'ADMIN']);
    setHostname('app.teufit.com.br');

    const { result } = renderHook(() => useConsistencyRankingAccess());

    expect(result.current).toBe(true);
  });

  it('PAN-61 returns true for a non-admin trainer on the staging hostname', () => {
    mockRoles(['TRAINER']);
    setHostname('teufit-web-staging.up.railway.app');

    const { result } = renderHook(() => useConsistencyRankingAccess());

    expect(result.current).toBe(true);
  });

  it('PAN-61 returns true for a non-admin trainer in a dev build on the production hostname', () => {
    vi.stubEnv('DEV', true);
    mockRoles(['TRAINER']);
    setHostname('app.teufit.com.br');

    const { result } = renderHook(() => useConsistencyRankingAccess());

    expect(result.current).toBe(true);
  });

  it('PAN-61 returns true for a non-admin trainer on localhost', () => {
    mockRoles(['TRAINER']);
    setHostname('localhost');

    const { result } = renderHook(() => useConsistencyRankingAccess());

    expect(result.current).toBe(true);
  });
});
