import { useState } from 'react';
import PropTypes from 'prop-types';
import { CircleAlert, Wallet } from 'lucide-react';
import EmptyBlock from '../ds/EmptyBlock';
import PlanCard from './PlanCard';
import { t, tf } from '../../i18n';
import useFinanceCopy from '../../hooks/useFinanceCopy';

const PlansSkeleton = () => (
  <div className="plan-grid" aria-busy="true">
    <div className="row-skeleton" />
    <div className="row-skeleton" />
    <div className="row-skeleton" />
  </div>
);

const PlanGrid = ({ plans, onEdit, onArchiveToggle }) => (
  <div className="plan-grid">
    {plans.map((plan) => (
      <PlanCard key={plan.id} plan={plan} onEdit={onEdit} onArchiveToggle={onArchiveToggle} />
    ))}
  </div>
);

PlanGrid.propTypes = {
  plans: PropTypes.array.isRequired,
  onEdit: PropTypes.func.isRequired,
  onArchiveToggle: PropTypes.func.isRequired,
};

const PlansEmpty = ({ onCreate }) => {
  const { ft } = useFinanceCopy();
  return (
  <EmptyBlock
    icon={Wallet}
    title={t('finance.plans.emptyTitle')}
    description={ft('finance.plans.emptyText')}
    actionLabel={t('finance.plans.createPlan')}
    onAction={onCreate}
  />
  );
};

PlansEmpty.propTypes = { onCreate: PropTypes.func.isRequired };

/**
 * Planos tab: active plans grid; archived plans hidden behind
 * "Ver arquivados (n)" in a second section.
 */
const PlansPanel = ({ plans, hasPlansOfOtherTypes = false, loading, error, onRetry, onCreate, onEdit, onArchiveToggle }) => {
  const [showArchived, setShowArchived] = useState(false);

  if (loading) return <PlansSkeleton />;
  if (error) {
    return (
      <EmptyBlock
        icon={CircleAlert}
        role="alert"
        title={t('finance.plans.errorTitle')}
        description={error}
        actionLabel={t('finance.retry')}
        onAction={onRetry}
      />
    );
  }
  if (plans.length === 0 && hasPlansOfOtherTypes) return <p className="finance-notice type-body">{t('finance.plans.noType')}</p>;
  if (plans.length === 0) return <PlansEmpty onCreate={onCreate} />;

  const activePlans = plans.filter((plan) => !plan.isArchived);
  const archivedPlans = plans.filter((plan) => plan.isArchived);
  const toggleLabel = showArchived ? t('finance.plans.hideArchived') : tf('finance.plans.showArchived', { n: archivedPlans.length });

  return (
    <>
      {activePlans.length > 0
        ? <PlanGrid plans={activePlans} onEdit={onEdit} onArchiveToggle={onArchiveToggle} />
        : <PlansEmpty onCreate={onCreate} />}
      {archivedPlans.length > 0 && (
        <button type="button" className="btn btn--ghost finance-archived-toggle" onClick={() => setShowArchived((prev) => !prev)} aria-expanded={showArchived}>
          {toggleLabel}
        </button>
      )}
      {showArchived && archivedPlans.length > 0 && (
        <section className="finance-section" aria-labelledby="plans-archived-title">
          <h2 id="plans-archived-title" className="finance-section__title type-body-lg-strong">{t('finance.plans.archivedSection')}</h2>
          <PlanGrid plans={archivedPlans} onEdit={onEdit} onArchiveToggle={onArchiveToggle} />
        </section>
      )}
    </>
  );
};

PlansPanel.propTypes = {
  plans: PropTypes.array.isRequired,
  hasPlansOfOtherTypes: PropTypes.bool,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onRetry: PropTypes.func.isRequired,
  onCreate: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onArchiveToggle: PropTypes.func.isRequired,
};

export default PlansPanel;
