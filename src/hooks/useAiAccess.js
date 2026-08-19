import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { captureAnomaly } from '../lib/sentry';

/**
 * Single source of truth for "is the iArnold (AI) entry point visible?".
 *
 * The backend exposes the quota as `platformPlan.limits.aiActionsPerStudent`
 * on `/me`, and only for users that carry the TRAINER role AND have a trainer
 * row. Wire values (see treinoway-service/src/constants/platform-plan.js):
 *
 *   FREE              → 0        (no AI at all)
 *   PRO / PLATINUM    → 3
 *   DIAMOND           → null     (Infinity, not JSON-serialisable)
 *   missing/undefined → anomaly  (stale cached user, partial /me, non-trainer)
 *
 * Semantics — deliberately fail-open:
 *   • explicit `0` (or any number <= 0) → hidden. This is a real FREE plan.
 *   • `null` or a number > 0            → shown.
 *   • `undefined` / malformed payload   → SHOWN, and reported to Sentry when the
 *     user is a TRAINER. Hiding on missing data is indistinguishable from
 *     "plan forbids AI" and silently deletes a whole nav section; the backend
 *     still answers 403, so the worst case is a visible entry point that errors.
 *   • no user at all (logged out)       → hidden, and not reported.
 */

export const AI_MISSING_PLAN_MESSAGE = 'iArnold gate failed open: platformPlan limits missing for TRAINER';

// De-dup guard: Layout, Dashboard and IArnoldFAB all call this hook, and the
// user object is re-created on every /me refresh. Without this, a single
// session would emit the same anomaly on every mount.
const reportedUserKeys = new Set();

/** Test-only. Clears the per-session Sentry de-dup guard. */
export function resetAiAccessReporting() {
  reportedUserKeys.clear();
}

/**
 * Pure resolver, exported for direct unit testing.
 * @returns {{ canUseAi: boolean, planDataMissing: boolean }}
 */
export function resolveAiAccess(user) {
  if (!user) return { canUseAi: false, planDataMissing: false };

  const aiCap = user.platformPlan?.limits?.aiActionsPerStudent;

  // DIAMOND: Infinity is serialised as null over the wire.
  if (aiCap === null) return { canUseAi: true, planDataMissing: false };

  // Any real number decides on its own: 0 (FREE) hides, > 0 shows.
  if (typeof aiCap === 'number' && !Number.isNaN(aiCap)) {
    return { canUseAi: aiCap > 0, planDataMissing: false };
  }

  return { canUseAi: true, planDataMissing: true };
}

/**
 * @returns {boolean} whether the iArnold entry points should be rendered.
 */
export default function useAiAccess() {
  const { user, hasRole } = useAuth();
  const { canUseAi, planDataMissing } = resolveAiAccess(user);

  const shouldReport = planDataMissing && hasRole('TRAINER');
  // Local de-dup key only — never sent to Sentry (email is PII).
  const userKey = String(user?.id ?? user?.email ?? 'unknown');
  const hasPlatformPlan = Boolean(user?.platformPlan);
  const hasPlanLimits = Boolean(user?.platformPlan?.limits);

  useEffect(() => {
    if (!shouldReport) return;
    if (reportedUserKeys.has(userKey)) return;
    reportedUserKeys.add(userKey);

    captureAnomaly(AI_MISSING_PLAN_MESSAGE, {
      level: 'warning',
      tags: { feature: 'iarnold', anomaly: 'missing_platform_plan' },
      extra: { hasPlatformPlan, hasPlanLimits },
    });
  }, [shouldReport, userKey, hasPlatformPlan, hasPlanLimits]);

  return canUseAi;
}
