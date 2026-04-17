import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import useOnboardingStatus, { ONBOARDING_DISMISS_KEY } from '../../hooks/useOnboardingStatus';
import {
  computeMissingProfileFields,
  formatMissingFieldsSubtitle,
} from '../../utils/onboardingProfile';
import { track } from '../../utils/analytics';
import { t } from '../../i18n';
import OnboardingStepRow from './OnboardingStepRow';
import OnboardingProgressPill from './OnboardingProgressPill';
import OnboardingEncouragementLine from './OnboardingEncouragementLine';
import OnboardingAllDoneState from './OnboardingAllDoneState';

const STEP_KEYS = ['profileCompleted', 'firstStudentLinked', 'firstProtocolCreated'];
const NAV_HINT_TO_STEP = {
  profile: 'profileCompleted',
  firstStudent: 'firstStudentLinked',
  firstProtocol: 'firstProtocolCreated',
};

const ROUTE_BY_STEP = {
  profileCompleted: '/profile',
  firstStudentLinked: '/trainer/students',
  firstProtocolCreated: '/trainer/protocols/new',
};

const readDismissed = () => {
  try {
    return sessionStorage.getItem(ONBOARDING_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

const writeDismissed = () => {
  try {
    sessionStorage.setItem(ONBOARDING_DISMISS_KEY, '1');
  } catch {
    // ignore storage errors (private mode, etc.)
  }
};

const clearDismissed = () => {
  try {
    sessionStorage.removeItem(ONBOARDING_DISMISS_KEY);
  } catch {
    // ignore
  }
};

const OnboardingChecklistCard = () => {
  const { me, onboarding, isTrainer, loading, fetchFailed, markStepDone } = useOnboardingStatus();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isTrainerFromAuth = typeof hasRole === 'function' && hasRole('TRAINER');

  const [dismissed, setDismissed] = useState(readDismissed);
  const [fadingOut, setFadingOut] = useState(false);
  const [optimisticSteps, setOptimisticSteps] = useState({
    profileCompleted: false,
    firstStudentLinked: false,
    firstProtocolCreated: false,
  });

  const viewedReportedRef = useRef(false);
  const completionReportedRef = useRef(false);
  const previousDoneCountRef = useRef(null);

  // Consume nav-state hint to pre-mark a row before /me resolves.
  useEffect(() => {
    const hint = location.state?.justCompleted;
    if (!hint) return;
    const stepKey = NAV_HINT_TO_STEP[hint];
    if (!stepKey) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptimisticSteps((prev) => (prev[stepKey] ? prev : { ...prev, [stepKey]: true }));
    markStepDone(stepKey);
    track('onboarding_step_completed', { step: stepKey, source: 'nav-hint' });

    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate, markStepDone]);

  const mergedSteps = useMemo(() => {
    const merged = {};
    STEP_KEYS.forEach((key) => {
      merged[key] = !!(onboarding?.[key] || optimisticSteps[key]);
    });
    return merged;
  }, [onboarding, optimisticSteps]);

  const doneCount = STEP_KEYS.reduce((count, key) => count + (mergedSteps[key] ? 1 : 0), 0);

  // Report 2 -> 3 transition.
  useEffect(() => {
    const previous = previousDoneCountRef.current;
    previousDoneCountRef.current = doneCount;
    if (previous === null) return;
    if (previous < 3 && doneCount === 3 && !completionReportedRef.current) {
      completionReportedRef.current = true;
      track('onboarding_checklist_completed', {});
    }
  }, [doneCount]);

  const missingProfileFields = useMemo(
    () => computeMissingProfileFields(me),
    [me],
  );

  // Report first view per session (once data is available).
  useEffect(() => {
    if (loading || viewedReportedRef.current) return;
    const hasTrainerSignal = (isTrainer && !!me?.trainerOnboarding)
      || (fetchFailed && isTrainerFromAuth);
    if (!hasTrainerSignal) return;
    viewedReportedRef.current = true;
    track('onboarding_checklist_viewed', {
      doneCount,
      missingFieldsCount: missingProfileFields.length,
    });
  }, [loading, isTrainer, me, doneCount, missingProfileFields, fetchFailed, isTrainerFromAuth]);

  const handleStepClick = useCallback((stepKey) => {
    track('onboarding_step_clicked', {
      step: stepKey,
      status: mergedSteps[stepKey] ? 'done' : 'pending',
    });
    navigate(ROUTE_BY_STEP[stepKey]);
  }, [mergedSteps, navigate]);

  const handleStepViewed = useCallback((stepKey) => {
    track('onboarding_step_viewed', { step: stepKey });
  }, []);

  const handleDismiss = useCallback(() => {
    writeDismissed();
    setFadingOut(true);
    track('onboarding_checklist_dismissed', {});
    setTimeout(() => setDismissed(true), 150);
  }, []);

  // If the backend later shows incomplete but a dismiss flag is set,
  // spec says to ignore the flag and re-render.
  useEffect(() => {
    if (!dismissed) return;
    if (loading) return;
    if (doneCount < 3 && isTrainer && me?.trainerOnboarding) {
      clearDismissed();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(false);
    }
  }, [dismissed, doneCount, isTrainer, me, loading]);

  // Gate rendering after all hooks have run.
  if (loading) {
    return (
      <section
        className="onboarding-card onboarding-card--skeleton"
        aria-busy="true"
        aria-label={t('onboarding.title')}
      >
        <div className="onboarding-card-skeleton-body" />
      </section>
    );
  }

  // When the /me fetch succeeded, trust its trainerOnboarding signal.
  // When it failed, fall back to AuthContext's role check so we still show
  // an all-pending card instead of hiding the feature entirely.
  const shouldRender = (isTrainer && !!me?.trainerOnboarding)
    || (fetchFailed && isTrainerFromAuth);

  if (!shouldRender) {
    return null;
  }

  if (dismissed && doneCount === 3) {
    return null;
  }

  const isAllDone = doneCount === 3;

  let profileSubtitle;
  if (fetchFailed || !me) {
    profileSubtitle = t('onboarding.profileCompleted.description');
  } else if (missingProfileFields.length > 0) {
    profileSubtitle = formatMissingFieldsSubtitle(missingProfileFields);
  } else {
    profileSubtitle = t('onboarding.profileCompleted.raceFallback');
  }

  const rows = [
    {
      key: 'profileCompleted',
      title: t('onboarding.profileCompleted.title'),
      pendingSubtitle: profileSubtitle,
    },
    {
      key: 'firstStudentLinked',
      title: t('onboarding.firstStudentLinked.title'),
      pendingSubtitle: t('onboarding.firstStudentLinked.description'),
    },
    {
      key: 'firstProtocolCreated',
      title: t('onboarding.firstProtocolCreated.title'),
      pendingSubtitle: t('onboarding.firstProtocolCreated.description'),
    },
  ];

  // Pending rows float to the top. Stable sort preserves semantic order otherwise.
  const sortedRows = [...rows].sort((a, b) => {
    const aDone = mergedSteps[a.key] ? 1 : 0;
    const bDone = mergedSteps[b.key] ? 1 : 0;
    return aDone - bDone;
  });

  return (
    <section
      className={`onboarding-card${fadingOut ? ' onboarding-card--fading' : ''}`}
      aria-label={t('onboarding.title')}
    >
      <div className="onboarding-card-header">
        <h2 className="onboarding-card-title">{t('onboarding.title')}</h2>
        {isAllDone ? (
          <button
            type="button"
            className="onboarding-card-dismiss"
            onClick={handleDismiss}
            aria-label={t('onboarding.dismiss.ariaLabel')}
          >
            <X size={20} strokeWidth={2} />
          </button>
        ) : (
          <OnboardingProgressPill doneCount={doneCount} totalCount={STEP_KEYS.length} />
        )}
      </div>

      {isAllDone ? (
        <OnboardingAllDoneState />
      ) : (
        <>
          <OnboardingEncouragementLine doneCount={doneCount} />
          <div className="onboarding-card-rows">
            {sortedRows.map((row) => (
              <OnboardingStepRow
                key={row.key}
                title={row.title}
                subtitle={row.pendingSubtitle}
                status={mergedSteps[row.key] ? 'done' : 'pending'}
                onClick={() => handleStepClick(row.key)}
                onViewed={!mergedSteps[row.key] ? () => handleStepViewed(row.key) : null}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default OnboardingChecklistCard;
