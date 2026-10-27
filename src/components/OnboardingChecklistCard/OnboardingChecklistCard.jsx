import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import useOnboardingChecklist from '../../hooks/useOnboardingChecklist';
import { t } from '../../i18n';
import OnboardingStepRow from './OnboardingStepRow';
import OnboardingProgressPill from './OnboardingProgressPill';
import OnboardingEncouragementLine from './OnboardingEncouragementLine';
import OnboardingAllDoneState from './OnboardingAllDoneState';

const PLACEMENT_PHASES = {
  top: ['skeleton', 'incomplete'],
  bottom: ['allDone'],
};

// Reserves the card's footprint while the first status fetch is in flight.
const OnboardingChecklistSkeleton = () => (
  <section
    className="onboarding-card onboarding-card--skeleton"
    aria-busy="true"
    aria-label={t('onboarding.title')}
  >
    <div className="onboarding-card-skeleton-body" />
  </section>
);

// Renders one phase of an already-resolved checklist (pure view, no data loading).
export const OnboardingChecklistView = ({ checklist, placement }) => {
  const { phase, rows, doneCount, total, fadingOut } = checklist;
  const allowedPhases = placement ? PLACEMENT_PHASES[placement] : ['skeleton', 'incomplete', 'allDone'];
  if (!allowedPhases.includes(phase)) return null;
  if (phase === 'skeleton') return <OnboardingChecklistSkeleton />;

  const isAllDone = phase === 'allDone';

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
            onClick={checklist.handleDismiss}
            aria-label={t('onboarding.dismiss.ariaLabel')}
          >
            <X size={20} strokeWidth={2} />
          </button>
        ) : (
          <OnboardingProgressPill doneCount={doneCount} totalCount={total} />
        )}
      </div>

      {isAllDone ? (
        <OnboardingAllDoneState />
      ) : (
        <>
          <OnboardingEncouragementLine doneCount={doneCount} totalCount={total} />
          <div className="onboarding-card-rows">
            {rows.map((row) => (
              <OnboardingStepRow
                key={row.key}
                title={row.title}
                subtitle={row.subtitle}
                doneSubtitle={row.doneSubtitle}
                status={row.status}
                onClick={() => checklist.handleStepClick(row.key)}
                onViewed={row.status === 'pending' ? () => checklist.handleStepViewed(row.key) : null}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

OnboardingChecklistView.propTypes = {
  checklist: PropTypes.shape({
    phase: PropTypes.string.isRequired,
    rows: PropTypes.array.isRequired,
    doneCount: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired,
    fadingOut: PropTypes.bool,
    handleStepClick: PropTypes.func.isRequired,
    handleStepViewed: PropTypes.func.isRequired,
    handleDismiss: PropTypes.func.isRequired,
  }).isRequired,
  placement: PropTypes.oneOf(['top', 'bottom']),
};

// Self-contained checklist card: loads its own status and renders every phase.
const OnboardingChecklistCard = () => {
  const checklist = useOnboardingChecklist();
  return <OnboardingChecklistView checklist={checklist} />;
};

export default OnboardingChecklistCard;
