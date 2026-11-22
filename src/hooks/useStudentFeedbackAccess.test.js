import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '../test/test-utils';
import useStudentFeedbackAccess from './useStudentFeedbackAccess';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

const ORIGINAL_URL = window.location.href;

// Mocks an authenticated user whose role check answers true only for the given roles (lower case)
const mockRoles = (roles) => {
  const hasRole = vi.fn((role) => roles.includes(role));
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'trainer-1' }, hasRole });
  return hasRole;
};

// Points window.location at the given URL through the jsdom instance
const setUrl = (url) => {
  globalThis.jsdom.reconfigure({ url });
};

// Runs the hook once and returns what it answered
const readAccess = () => renderHook(() => useStudentFeedbackAccess()).result.current;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('DEV', false);
});

afterEach(() => {
  vi.unstubAllEnvs();
  setUrl(ORIGINAL_URL);
});

describe('useStudentFeedbackAccess', () => {
  it('is closed for a trainer who is not an admin on the production hostname', () => {
    mockRoles(['trainer']);
    setUrl('https://app.teufit.com.br/');

    expect(readAccess()).toBe(false);
  });

  it('is open for an admin on the production hostname, asking the role check for "admin"', () => {
    const hasRole = mockRoles(['admin']);
    setUrl('https://app.teufit.com.br/');

    expect(readAccess()).toBe(true);
    expect(hasRole).toHaveBeenCalledWith('admin');
  });

  it('is open for everyone on localhost', () => {
    mockRoles([]);
    setUrl('http://localhost:3000/');

    expect(readAccess()).toBe(true);
  });

  it('is open for everyone on a staging hostname', () => {
    mockRoles([]);
    setUrl('https://staging.teufit.com.br/');

    expect(readAccess()).toBe(true);
  });

  it('is open for everyone in a development build, even on the production hostname', () => {
    vi.stubEnv('DEV', true);
    mockRoles([]);
    setUrl('https://app.teufit.com.br/');

    expect(readAccess()).toBe(true);
  });

  it('is closed on the production hostname when the session offers no role check', () => {
    vi.mocked(useAuth).mockReturnValue({ user: null });
    setUrl('https://app.teufit.com.br/');

    expect(readAccess()).toBe(false);
  });

  it('is closed on the production hostname when the role check answers something that is not true', () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: 'trainer-1' }, hasRole: () => 'admin' });
    setUrl('https://app.teufit.com.br/');

    expect(readAccess()).toBe(false);
  });
});
