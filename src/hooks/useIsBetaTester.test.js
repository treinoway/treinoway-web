import { renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import useIsBetaTester from './useIsBetaTester';
import { useAuth } from '../contexts/AuthContext';

vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

// Mocks the authenticated user with the given roles and platform plan.
const mockUser = (roles, platformPlan) => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'u-1', platformPlan },
    hasRole: (role) => roles.includes(role.toUpperCase()),
  });
};

describe('useIsBetaTester', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReset();
  });

  it('is true for a trainer on the BETA tier', () => {
    mockUser(['TRAINER'], { tier: 'BETA' });
    expect(renderHook(() => useIsBetaTester()).result.current).toBe(true);
  });

  it('is false for a trainer on a non-BETA tier', () => {
    mockUser(['TRAINER'], { tier: 'PRO' });
    expect(renderHook(() => useIsBetaTester()).result.current).toBe(false);
  });

  it('is false for a trainer without a platform plan', () => {
    mockUser(['TRAINER'], undefined);
    expect(renderHook(() => useIsBetaTester()).result.current).toBe(false);
  });

  it('is false for a student on the BETA tier', () => {
    mockUser(['STUDENT'], { tier: 'BETA' });
    expect(renderHook(() => useIsBetaTester()).result.current).toBe(false);
  });

  it('is false for an admin-only user on the BETA tier', () => {
    mockUser(['ADMIN'], { tier: 'BETA' });
    expect(renderHook(() => useIsBetaTester()).result.current).toBe(false);
  });
});
