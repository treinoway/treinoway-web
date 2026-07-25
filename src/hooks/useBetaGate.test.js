import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import useBetaGate, { isBetaGateEnabled } from './useBetaGate';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../contexts/AuthContext';

describe('useBetaGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is a no-op when the flag is not "true"', () => {
    vi.stubEnv('VITE_BETA_GATE_ENABLED', 'false');
    useAuth.mockReturnValue({ isAuthenticated: true, user: { betaAccess: false } });

    expect(isBetaGateEnabled()).toBe(false);
    const { result } = renderHook(() => useBetaGate());
    expect(result.current).toBe(false);
  });

  it('blocks an authenticated user with betaAccess === false when enabled', () => {
    vi.stubEnv('VITE_BETA_GATE_ENABLED', 'true');
    useAuth.mockReturnValue({ isAuthenticated: true, user: { betaAccess: false } });

    const { result } = renderHook(() => useBetaGate());
    expect(result.current).toBe(true);
  });

  it('does not block when betaAccess is true', () => {
    vi.stubEnv('VITE_BETA_GATE_ENABLED', 'true');
    useAuth.mockReturnValue({ isAuthenticated: true, user: { betaAccess: true } });

    const { result } = renderHook(() => useBetaGate());
    expect(result.current).toBe(false);
  });

  it('does not block before /me has loaded (no user yet)', () => {
    vi.stubEnv('VITE_BETA_GATE_ENABLED', 'true');
    useAuth.mockReturnValue({ isAuthenticated: true, user: null });

    const { result } = renderHook(() => useBetaGate());
    expect(result.current).toBe(false);
  });

  it('does not block a logged-out visitor', () => {
    vi.stubEnv('VITE_BETA_GATE_ENABLED', 'true');
    useAuth.mockReturnValue({ isAuthenticated: false, user: null });

    const { result } = renderHook(() => useBetaGate());
    expect(result.current).toBe(false);
  });
});
