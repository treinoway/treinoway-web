import PropTypes from 'prop-types';
import Badge from '../ds/Badge';
import RowMenu from '../RowMenu';
import PlanPrice from './PlanPrice';
import ServiceTypeBadge from './ServiceTypeBadge';
import useFinanceCopy from '../../hooks/useFinanceCopy';
import { t, tf } from '../../i18n';
import { buildKindCount } from '../../utils/financeKindCount';
import { RECURRENCE_LABEL } from '../../utils/subscriptionHelpers';

// Subscriber count text: split by kind for dual-role users, else the role's noun.
const buildSubscriberCount = (plan, copy) => {
  if (copy.isDualRole && plan.activeSubscriptionCountByKind) return buildKindCount(plan.activeSubscriptionCountByKind);
  return copy.ftCount('finance.count.student', plan.activeSubscriptionCount);
};

// Subtitle: recurrence, billing day, archived flag or subscriber count.
const buildSubtitle = (plan, recurrenceLabel, copy) => {
  const base = plan.billingDay
    ? `${recurrenceLabel} · ${tf('finance.plans.billingDayMeta', { day: plan.billingDay })}`
    : recurrenceLabel;
  if (plan.isArchived) return `${base} · ${t('finance.plans.archivedBadge')}`;
  if (typeof plan.activeSubscriptionCount !== 'number') return base;
  return `${base} · ${buildSubscriberCount(plan, copy)}`;
};

/**
 * Plan card (section card): name + menu, "{recorrência} · {n} alunos", the
 * net price and the discount line. The subscriber count comes from the plan
 * list (`activeSubscriptionCount`) and is hidden when absent.
 */
const PlanCard = ({ plan, onEdit, onArchiveToggle }) => {
  const copy = useFinanceCopy();
  const recurrenceLabel = plan.recurrenceLabel || RECURRENCE_LABEL[plan.recurrence] || '';
  const menuItems = [
    { label: t('finance.plans.edit'), onClick: () => onEdit(plan) },
    {
      label: t(plan.isArchived ? 'finance.plans.unarchive' : 'finance.plans.archive'),
      onClick: () => onArchiveToggle(plan),
    },
  ];

  return (
    <article className={`section-card plan-card${plan.isArchived ? ' plan-card--archived' : ''}`}>
      <div className="plan-card__header">
        <h3 className="plan-card__title type-h4" title={plan.name}>{plan.name}</h3>
        {copy.isDualRole && <ServiceTypeBadge serviceType={plan.serviceType} label={plan.serviceTypeLabel} />}
        {plan.isArchived && <Badge tone="neutral">{t('finance.plans.archivedBadge')}</Badge>}
        <RowMenu ariaLabel={tf('finance.plans.menuAria', { name: plan.name })} extraItems={menuItems} />
      </div>
      <p className="plan-card__meta type-caption">{buildSubtitle(plan, recurrenceLabel, copy)}</p>
      <PlanPrice entity={plan} />
    </article>
  );
};

const money = PropTypes.oneOfType([PropTypes.string, PropTypes.number]);

PlanCard.propTypes = {
  plan: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    recurrence: PropTypes.string.isRequired,
    recurrenceLabel: PropTypes.string,
    price: money.isRequired,
    discountPercent: money,
    discountAmount: money,
    billingDay: PropTypes.number,
    isArchived: PropTypes.bool,
    activeSubscriptionCount: PropTypes.number,
    activeSubscriptionCountByKind: PropTypes.shape({ students: PropTypes.number, patients: PropTypes.number }),
    serviceType: PropTypes.string,
    serviceTypeLabel: PropTypes.string,
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onArchiveToggle: PropTypes.func.isRequired,
};

export default PlanCard;
