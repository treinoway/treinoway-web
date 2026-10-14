import PropTypes from 'prop-types';
import MetricCard from '../ds/MetricCard';
import { formatAdherence, formatLastWorkout } from '../../utils/studentRow';
import { formatAdherenceDelta, getRenewalInfo, td } from '../../utils/studentCockpit';
import { formatDateTimeForDisplay } from '../../utils/dateFormat';

const MetricSkeleton = () => <div className="row-skeleton metric-skeleton" aria-hidden="true" />;

const buildAdherenceSupport = (summary) => {
  const counts = summary.adherenceCompleted != null && summary.adherenceExpected != null
    ? td('metrics.workoutsCount', { completed: summary.adherenceCompleted, expected: summary.adherenceExpected })
    : null;
  const delta = formatAdherenceDelta(summary.adherence, summary.previousAdherence, summary.previousAdherenceMonth);
  return [counts, delta].filter(Boolean).join(' · ') || undefined;
};

const AdherenceMetric = ({ summary }) => {
  const value = formatAdherence(summary?.adherence);
  if (!value) {
    return <MetricCard label={td('metrics.adherence')} value="–" support={td('metrics.adherenceEmpty')} />;
  }
  return <MetricCard label={td('metrics.adherence')} value={value} support={buildAdherenceSupport(summary)} />;
};

AdherenceMetric.propTypes = { summary: PropTypes.object };

/**
 * Read-only renewal figure. Replace/cancel/history live in the "Assinatura" block
 * below (single place for subscription actions); only the no-plan state keeps the
 * "Atribuir plano" shortcut.
 */
const RenewalMetric = ({ subscription, nextPayment, planName, onAssignPlan }) => {
  if (!subscription) {
    const assignAction = (
      <button type="button" className="btn btn--ghost metric-card-action" onClick={onAssignPlan}>
        {td('metrics.assignPlan')}
      </button>
    );
    return (
      <MetricCard label={td('metrics.plan')} value={td('metrics.noPlan')} support={td('metrics.noSubscription')} action={assignAction} />
    );
  }
  const renewal = getRenewalInfo(nextPayment);
  if (!renewal) {
    return (
      <MetricCard label={td('metrics.plan')} value={planName || td('metrics.activePlan')} support={td('metrics.noCycle')} />
    );
  }
  const support = [renewal.date, planName].filter(Boolean).join(' · ');
  return (
    <MetricCard
      label={renewal.label}
      value={renewal.value}
      support={support}
      tone={renewal.overdue ? 'error' : 'neutral'}
    />
  );
};

RenewalMetric.propTypes = {
  subscription: PropTypes.object,
  nextPayment: PropTypes.object,
  planName: PropTypes.string,
  onAssignPlan: PropTypes.func.isRequired,
};

const LastSessionMetric = ({ lastWorkoutAt }) => {
  const label = formatLastWorkout(lastWorkoutAt);
  if (!label) {
    return <MetricCard label={td('metrics.lastSession')} value={td('metrics.never')} support={td('metrics.noSessions')} />;
  }
  return <MetricCard label={td('metrics.lastSession')} value={label} support={formatDateTimeForDisplay(lastWorkoutAt)} />;
};

LastSessionMetric.propTypes = { lastWorkoutAt: PropTypes.string };

const METRIC_COUNT = 3;

const MetricsSkeleton = () => (
  <div className="metric-grid metric-grid--3 student-detail__metrics" role="status" aria-label={td('loading.metrics')}>
    {Array.from({ length: METRIC_COUNT }, (_, index) => <MetricSkeleton key={index} />)}
  </div>
);

/**
 * "Aderência e relacionamento": month adherence (dashboard summary), renewal of the
 * active subscription (current payment cycle) and the last session ever (student row).
 *
 * One `loading` flag for the whole row: the three figures come from three sources, and
 * they appear together once every source has answered — never one by one.
 */
const StudentRelationshipMetrics = ({
  loading,
  summary,
  subscription,
  nextPayment,
  planName,
  lastWorkoutAt,
  onAssignPlan,
}) => (
  <section className="student-detail__section" aria-labelledby="student-relationship-heading">
    <h2 id="student-relationship-heading" className="student-detail__section-title type-body-lg-strong">
      {td('sections.relationship')}
    </h2>
    {loading ? <MetricsSkeleton /> : (
      <div className="metric-grid metric-grid--3 student-detail__metrics">
        <AdherenceMetric summary={summary} />
        <RenewalMetric subscription={subscription} nextPayment={nextPayment} planName={planName} onAssignPlan={onAssignPlan} />
        <LastSessionMetric lastWorkoutAt={lastWorkoutAt} />
      </div>
    )}
  </section>
);

StudentRelationshipMetrics.propTypes = {
  loading: PropTypes.bool,
  summary: PropTypes.object,
  subscription: PropTypes.object,
  nextPayment: PropTypes.object,
  planName: PropTypes.string,
  lastWorkoutAt: PropTypes.string,
  onAssignPlan: PropTypes.func.isRequired,
};

export default StudentRelationshipMetrics;
