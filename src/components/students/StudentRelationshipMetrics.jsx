import PropTypes from 'prop-types';
import MetricCard from '../ds/MetricCard';
import RowMenu from '../RowMenu';
import { formatAdherence, formatLastWorkout } from '../../utils/studentRow';
import { formatAdherenceDelta, getRenewalInfo, td } from '../../utils/studentCockpit';
import { formatDateTimeForDisplay } from '../../utils/dateFormat';

const subscriptionActionsShape = PropTypes.shape({
  onAssignPlan: PropTypes.func.isRequired,
  onReplacePlan: PropTypes.func.isRequired,
  onViewHistory: PropTypes.func.isRequired,
  onCancelSubscription: PropTypes.func.isRequired,
});

const MetricSkeleton = () => <div className="row-skeleton metric-skeleton" aria-hidden="true" />;

const buildAdherenceSupport = (summary) => {
  const counts = summary.adherenceCompleted != null && summary.adherenceExpected != null
    ? td('metrics.workoutsCount', { completed: summary.adherenceCompleted, expected: summary.adherenceExpected })
    : null;
  const delta = formatAdherenceDelta(summary.adherence, summary.previousAdherence, summary.previousAdherenceMonth);
  return [counts, delta].filter(Boolean).join(' · ') || undefined;
};

const AdherenceMetric = ({ summary, loading }) => {
  if (loading) return <MetricSkeleton />;
  const value = formatAdherence(summary?.adherence);
  if (!value) {
    return <MetricCard label={td('metrics.adherence')} value="–" support={td('metrics.adherenceEmpty')} />;
  }
  return <MetricCard label={td('metrics.adherence')} value={value} support={buildAdherenceSupport(summary)} />;
};

AdherenceMetric.propTypes = { summary: PropTypes.object, loading: PropTypes.bool };

const SubscriptionMenu = ({ onReplacePlan, onViewHistory, onCancelSubscription }) => (
  <RowMenu
    ariaLabel={td('metrics.subscriptionActions')}
    extraItems={[
      { label: td('metrics.replacePlan'), onClick: onReplacePlan },
      { label: td('metrics.viewHistory'), onClick: onViewHistory },
    ]}
    onDelete={onCancelSubscription}
    deleteLabel={td('metrics.cancelSubscription')}
  />
);

SubscriptionMenu.propTypes = {
  onReplacePlan: PropTypes.func.isRequired,
  onViewHistory: PropTypes.func.isRequired,
  onCancelSubscription: PropTypes.func.isRequired,
};

const RenewalMetric = ({ subscription, nextPayment, planName, loading, actions }) => {
  if (loading) return <MetricSkeleton />;
  if (!subscription) {
    const assignAction = (
      <button type="button" className="btn btn--ghost metric-card-action" onClick={actions.onAssignPlan}>
        {td('metrics.assignPlan')}
      </button>
    );
    return (
      <MetricCard label={td('metrics.plan')} value={td('metrics.noPlan')} support={td('metrics.noSubscription')} action={assignAction} />
    );
  }
  const menu = <SubscriptionMenu {...actions} />;
  const renewal = getRenewalInfo(nextPayment);
  if (!renewal) {
    return (
      <MetricCard label={td('metrics.plan')} value={planName || td('metrics.activePlan')} support={td('metrics.noCycle')} action={menu} />
    );
  }
  const support = [renewal.date, planName].filter(Boolean).join(' · ');
  return (
    <MetricCard
      label={renewal.label}
      value={renewal.value}
      support={support}
      tone={renewal.overdue ? 'error' : 'neutral'}
      action={menu}
    />
  );
};

RenewalMetric.propTypes = {
  subscription: PropTypes.object,
  nextPayment: PropTypes.object,
  planName: PropTypes.string,
  loading: PropTypes.bool,
  actions: subscriptionActionsShape.isRequired,
};

const LastSessionMetric = ({ lastWorkoutAt }) => {
  const label = formatLastWorkout(lastWorkoutAt);
  if (!label) {
    return <MetricCard label={td('metrics.lastSession')} value={td('metrics.never')} support={td('metrics.noSessions')} />;
  }
  return <MetricCard label={td('metrics.lastSession')} value={label} support={formatDateTimeForDisplay(lastWorkoutAt)} />;
};

LastSessionMetric.propTypes = { lastWorkoutAt: PropTypes.string };

/**
 * "Aderência e relacionamento": month adherence (dashboard summary), renewal of the
 * active subscription (current payment cycle) and the last session ever (student row).
 */
const StudentRelationshipMetrics = ({
  summary,
  summaryLoading,
  subscription,
  nextPayment,
  planName,
  subscriptionLoading,
  lastWorkoutAt,
  subscriptionActions,
}) => (
  <section className="student-detail__section" aria-labelledby="student-relationship-heading">
    <h2 id="student-relationship-heading" className="student-detail__section-title type-body-lg-strong">
      {td('sections.relationship')}
    </h2>
    <div className="metric-grid metric-grid--3 student-detail__metrics">
      <AdherenceMetric summary={summary} loading={summaryLoading} />
      <RenewalMetric
        subscription={subscription}
        nextPayment={nextPayment}
        planName={planName}
        loading={subscriptionLoading}
        actions={subscriptionActions}
      />
      <LastSessionMetric lastWorkoutAt={lastWorkoutAt} />
    </div>
  </section>
);

StudentRelationshipMetrics.propTypes = {
  summary: PropTypes.object,
  summaryLoading: PropTypes.bool,
  subscription: PropTypes.object,
  nextPayment: PropTypes.object,
  planName: PropTypes.string,
  subscriptionLoading: PropTypes.bool,
  lastWorkoutAt: PropTypes.string,
  subscriptionActions: subscriptionActionsShape.isRequired,
};

export default StudentRelationshipMetrics;
