import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '../test/test-utils';
import useAiAccess, {
  resolveAiAccess,
  resetAiAccessReporting,
  AI_MISSING_PLAN_MESSAGE,
} from './useAiAccess';
import { useAuth } from '../contexts/AuthContext';
import { captureAnomaly } from '../lib/sentry';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../lib/sentry', () => ({
  captureAnomaly: vi.fn(),
}));

const buildUser = ({ id = 1, aiActionsPerStudent, withLimits = true } = {}) => {
  if (aiActionsPerStudent === undefined) {
    return { id, platformPlan: withLimits ? { tier: 'PRO', limits: {} } : undefined };
  }
  return { id, platformPlan: { tier: 'PRO', limits: { aiActionsPerStudent } } };
};

const mockAuth = ({ user, isTrainer = true }) => {
  vi.mocked(useAuth).mockReturnValue({
    user,
    hasRole: (role) => isTrainer && role === 'TRAINER',
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  resetAiAccessReporting();
});

describe('resolveAiAccess', () => {
  it('hides AI for an explicit 0 (FREE plan)', () => {
    expect(resolveAiAccess(buildUser({ aiActionsPerStudent: 0 }))).toEqual({
      canUseAi: false,
      planDataMissing: false,
    });
  });

  it('shows AI for a positive quota (PRO/PLATINUM = 3)', () => {
    expect(resolveAiAccess(buildUser({ aiActionsPerStudent: 3 }))).toEqual({
      canUseAi: true,
      planDataMissing: false,
    });
  });

  it('shows AI for null (DIAMOND = unlimited over the wire)', () => {
    expect(resolveAiAccess(buildUser({ aiActionsPerStudent: null }))).toEqual({
      canUseAi: true,
      planDataMissing: false,
    });
  });

  it('fails open and flags the anomaly when the quota is missing', () => {
    expect(resolveAiAccess(buildUser())).toEqual({
      canUseAi: true,
      planDataMissing: true,
    });
  });

  it('fails open when platformPlan itself is missing (stale cached user)', () => {
    expect(resolveAiAccess({ id: 1 })).toEqual({
      canUseAi: true,
      planDataMissing: true,
    });
  });

  it('hides AI and reports nothing when there is no user at all', () => {
    expect(resolveAiAccess(null)).toEqual({
      canUseAi: false,
      planDataMissing: false,
    });
  });

  it('treats a malformed non-numeric quota as missing data', () => {
    const user = { id: 1, platformPlan: { limits: { aiActionsPerStudent: 'muitos' } } };
    expect(resolveAiAccess(user)).toEqual({ canUseAi: true, planDataMissing: true });
  });
});

describe('useAiAccess', () => {
  it('returns false for an explicit 0 quota', () => {
    mockAuth({ user: buildUser({ aiActionsPerStudent: 0 }) });
    const { result } = renderHook(() => useAiAccess());
    expect(result.current).toBe(false);
  });

  it('returns true for a positive quota', () => {
    mockAuth({ user: buildUser({ aiActionsPerStudent: 3 }) });
    const { result } = renderHook(() => useAiAccess());
    expect(result.current).toBe(true);
  });

  it('returns true for a null quota', () => {
    mockAuth({ user: buildUser({ aiActionsPerStudent: null }) });
    const { result } = renderHook(() => useAiAccess());
    expect(result.current).toBe(true);
  });

  it('returns true (fail-open) when the plan data is missing', () => {
    mockAuth({ user: buildUser() });
    const { result } = renderHook(() => useAiAccess());
    expect(result.current).toBe(true);
  });

  it('reports the missing plan data to Sentry for a TRAINER', () => {
    mockAuth({ user: buildUser({ id: 42 }) });
    renderHook(() => useAiAccess());

    expect(captureAnomaly).toHaveBeenCalledTimes(1);
    expect(captureAnomaly).toHaveBeenCalledWith(
      AI_MISSING_PLAN_MESSAGE,
      expect.objectContaining({ level: 'warning' }),
    );
  });

  it('never sends PII in the Sentry payload', () => {
    mockAuth({ user: { id: 42, email: 'ana@example.com' } });
    renderHook(() => useAiAccess());

    const payload = JSON.stringify(vi.mocked(captureAnomaly).mock.calls[0]);
    expect(payload).not.toContain('ana@example.com');
  });

  it('reports only once per user across multiple mounts', () => {
    mockAuth({ user: buildUser({ id: 7 }) });
    renderHook(() => useAiAccess());
    renderHook(() => useAiAccess());

    expect(captureAnomaly).toHaveBeenCalledTimes(1);
  });

  it('does not report when the user is not a TRAINER', () => {
    mockAuth({ user: buildUser({ id: 8 }), isTrainer: false });
    renderHook(() => useAiAccess());

    expect(captureAnomaly).not.toHaveBeenCalled();
  });

  it('does not report when the plan data is present', () => {
    mockAuth({ user: buildUser({ id: 9, aiActionsPerStudent: 0 }) });
    renderHook(() => useAiAccess());

    expect(captureAnomaly).not.toHaveBeenCalled();
  });
});
