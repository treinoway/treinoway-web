import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useOnboardingStatus, { getOnboardingDismissKey } from './useOnboardingStatus';
import {
  computeMissingProfileFields,
  formatMissingFieldsSubtitle,
} from '../utils/onboardingProfile';
import { track } from '../utils/analytics';
import { t } from '../i18n';

const NAV_HINT_TO_STEP = {
  profile: 'profileCompleted',
  firstStudent: 'firstStudentLinked',
  firstRoutine: 'firstProtocolCreated',
};

const PROFILE_ROUTE = '/profile';
const PROFILE_MISSING_ROUTE = '/profile?edit=1&focus=missing';
const FADE_OUT_MS = 150;

const STEPS = [
  { key: 'profileCompleted', route: PROFILE_ROUTE },
  { key: 'firstStudentLinked', route: '/trainer/students' },
  { key: 'firstProtocolCreated', route: '/trainer/routines/new' },
  { key: 'firstAnamnesisSent', route: '/trainer/anamneses' },
];

// Reads the per-user dismissed flag.
const readDismissed = (userId) => {
  if (!userId) return false;
  try {
    return localStorage.getItem(getOnboardingDismissKey(userId)) === '1';
  } catch {
    return false;
  }
};

// Persists the per-user dismissed flag.
const writeDismissed = (userId) => {
  if (!userId) return;
  try {
    localStorage.setItem(getOnboardingDismissKey(userId), '1');
  } catch {
    // why: storage unavailable (private mode) — dismissal just won't persist
  }
};

// Removes the per-user dismissed flag.
const clearDismissed = (userId) => {
  if (!userId) return;
  try {
    localStorage.removeItem(getOnboardingDismissKey(userId));
    localStorage.removeItem(getDismissedStepsKey(userId));
  } catch {
    // why: storage unavailable (private mode) — nothing to clear
  }
};

// Storage key of the steps that were done when the card was dismissed.
const getDismissedStepsKey = (userId) => `${getOnboardingDismissKey(userId)}:steps`;

// Whether a step counts as done in the given status map (an invited student counts as linked).
const isStepDoneIn = (onboarding, key) => (
  key === 'firstStudentLinked'
    ? !!(onboarding.firstStudentLinked || onboarding.firstStudentInvited)
    : !!onboarding[key]
);

// Reads the step keys snapshotted at dismissal, or null when none was stored.
const readDismissedSteps = (userId) => {
  if (!userId) return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(getDismissedStepsKey(userId)));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

// Persists the step keys that were done at dismissal.
const writeDismissedSteps = (userId, stepKeys) => {
  if (!userId) return;
  try {
    localStorage.setItem(getDismissedStepsKey(userId), JSON.stringify(stepKeys));
  } catch {
    // why: storage unavailable (private mode) — dismissal falls back to the cached status
  }
};

// Resolves the pending-state subtitle shown under a step title.
const resolvePendingSubtitle = (stepKey, { missingFields, hasProfileData }) => {
  if (stepKey !== 'profileCompleted') return t(`onboarding.${stepKey}.description`);
  if (!hasProfileData) return t('onboarding.profileCompleted.description');
  if (missingFields.length === 0) return t('onboarding.profileCompleted.raceFallback');
  return formatMissingFieldsSubtitle(missingFields);
};

// Decides which of the card's states applies right now.
const resolvePhase = ({ enabled, loading, hasCache, fetchFailed, hasTrainerData, allDone, dismissed }) => {
  if (!enabled) return 'hidden';
  if (loading) {
    if (dismissed) return 'hidden';
    return hasCache ? (allDone ? 'hidden' : 'incomplete') : 'skeleton';
  }
  if (fetchFailed ? !hasCache : !hasTrainerData) return 'hidden';
  if (dismissed) return 'hidden';
  return allDone ? 'allDone' : 'incomplete';
};

/**
 * View-model of the "Primeiros passos" checklist (phase: hidden, skeleton, incomplete or allDone).
 *
 * @param {boolean} enabled - load and evaluate only while true (active trainer mode).
 * @returns {object} phase, ordered rows, progress counts and click/dismiss handlers.
 */
const useOnboardingChecklist = (enabled = true) => {
  const { user } = useAuth();
  const userId = user?.id;
  const status = useOnboardingStatus({ enabled, userId });
  const { me, onboarding, hasCache, isTrainer, loading, fetchFailed, markStepDone } = status;
  const navigate = useNavigate();
  const location = useLocation();

  const [dismissed, setDismissed] = useState(() => readDismissed(userId));
  const [fadingOut, setFadingOut] = useState(false);
  const viewedReportedRef = useRef(false);
  const previousAllDoneRef = useRef(null);
  const [mountOnboarding] = useState(onboarding);

  useEffect(() => {
    setDismissed(readDismissed(userId));
  }, [userId]);

  useEffect(() => {
    const stepKey = NAV_HINT_TO_STEP[location.state?.justCompleted];
    if (!stepKey || !enabled) return;
    markStepDone(stepKey);
    track('onboarding_step_completed', { step: stepKey, source: 'nav-hint' });
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate, markStepDone, enabled]);

  const visibleSteps = STEPS;
  const isStepDone = useCallback((key) => isStepDoneIn(onboarding, key), [onboarding]);

  const total = visibleSteps.length;
  const doneCount = visibleSteps.filter((step) => isStepDone(step.key)).length;
  const allDone = doneCount === total;
  const hasTrainerData = isTrainer && !!me?.trainerOnboarding;
  // why: dismissal only lifts when a step done at dismissal time (or per the cached status) regressed
  const regressed = useMemo(() => {
    if (!dismissed || loading || !hasTrainerData) return false;
    const baseline = readDismissedSteps(userId)
      ?? (hasCache ? STEPS.map((step) => step.key).filter((key) => isStepDoneIn(mountOnboarding, key)) : []);
    return baseline.some((key) => visibleSteps.some((step) => step.key === key) && !isStepDone(key));
  }, [dismissed, loading, hasTrainerData, hasCache, mountOnboarding, userId, visibleSteps, isStepDone]);
  const phase = resolvePhase({
    enabled, loading, hasCache, fetchFailed, hasTrainerData, allDone, dismissed: dismissed && !regressed,
  });
  const missingFields = useMemo(() => computeMissingProfileFields(me), [me]);

  useEffect(() => {
    const previous = previousAllDoneRef.current;
    previousAllDoneRef.current = allDone;
    if (previous === false && allDone) track('onboarding_checklist_completed', {});
  }, [allDone]);

  useEffect(() => {
    if (loading || viewedReportedRef.current) return;
    if (phase !== 'incomplete' && phase !== 'allDone') return;
    viewedReportedRef.current = true;
    track('onboarding_checklist_viewed', { doneCount, missingFieldsCount: missingFields.length });
  }, [loading, phase, doneCount, missingFields]);

  useEffect(() => {
    if (!regressed) return;
    clearDismissed(userId);
    setDismissed(false);
  }, [regressed, userId]);

  const rows = useMemo(() => {
    const hasProfileData = !fetchFailed && !!me;
    const ordered = visibleSteps.map((step) => {
      const done = isStepDone(step.key);
      const invitedOnly = step.key === 'firstStudentLinked' && done && !onboarding.firstStudentLinked;
      return {
        key: step.key,
        title: t(`onboarding.${step.key}.title`),
        subtitle: resolvePendingSubtitle(step.key, { missingFields, hasProfileData }),
        doneSubtitle: invitedOnly ? t('onboarding.firstStudentLinked.invitedSubtitle') : undefined,
        status: done ? 'done' : 'pending',
      };
    });
    return [...ordered].sort((a, b) => (a.status === 'done') - (b.status === 'done'));
  }, [visibleSteps, isStepDone, onboarding, missingFields, me, fetchFailed]);

  const handleStepClick = useCallback((stepKey) => {
    const step = STEPS.find((candidate) => candidate.key === stepKey);
    const done = isStepDone(stepKey);
    track('onboarding_step_clicked', { step: stepKey, status: done ? 'done' : 'pending' });
    navigate(stepKey === 'profileCompleted' && !done ? PROFILE_MISSING_ROUTE : step.route);
  }, [isStepDone, navigate]);

  const handleStepViewed = useCallback((stepKey) => {
    track('onboarding_step_viewed', { step: stepKey });
  }, []);

  const handleDismiss = useCallback(() => {
    writeDismissed(userId);
    writeDismissedSteps(userId, visibleSteps.map((step) => step.key).filter(isStepDone));
    setFadingOut(true);
    track('onboarding_checklist_dismissed', {});
    setTimeout(() => setDismissed(true), FADE_OUT_MS);
  }, [userId, visibleSteps, isStepDone]);

  return { phase, rows, doneCount, total, fadingOut, handleStepClick, handleStepViewed, handleDismiss };
};

export default useOnboardingChecklist;
