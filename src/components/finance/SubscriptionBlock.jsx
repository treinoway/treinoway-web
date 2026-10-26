import PropTypes from 'prop-types';
import { CreditCard } from 'lucide-react';
import Badge from '../ds/Badge';
import EmptyBlock from '../ds/EmptyBlock';
import SkeletonRows from '../ds/SkeletonRows';
import SkeletonText from '../ds/SkeletonText';
import RowMenu from '../RowMenu';
import PaymentRow from './PaymentRow';
import PlanPrice from './PlanPrice';
import { t, tf } from '../../i18n';
import { PAYMENT_ROW_VARIANT, SUBSCRIPTION_OPEN_CHARGES_LIMIT } from '../../constants/finance';
import { sortOpenCharges } from '../../utils/financeCharges';
import {
  PAYMENT_STATUS,
  RECURRENCE_LABEL,
  formatFullDate,
  formatShortDate,
  todayDateString,
} from '../../utils/subscriptionHelpers';

const hasOverdueCharge = (charges) => charges.some((payment) => payment.effectiveStatus === PAYMENT_STATUS.OVERDUE);

const buildActiveBadge = (subscription, hasOverdue, today) => {
  if (hasOverdue) return { tone: 'error', label: t('finance.block.badgeOverdue') };
  if (subscription.startDate > today) {
    return { tone: 'brand', label: tf('finance.block.badgeStartsOn', { date: formatShortDate(subscription.startDate, today) }) };
  }
  return { tone: 'success', label: t('finance.block.badgeUpToDate') };
};

const OpenChargesList = ({ charges, totalCount, rowProps, onViewHistory }) => (
  <div className="subscription-card__charges">
    <h4 className="subscription-card__overline type-overline">{t('finance.block.openCharges')}</h4>
    {charges.length === 0 ? (
      <p className="subscription-card__text type-body">{t('finance.block.noOpenCharges')}</p>
    ) : (
      <div className="charge-list">
        {charges.map((payment) => (
          <PaymentRow
            key={payment.id}
            payment={payment}
            variant={PAYMENT_ROW_VARIANT.HISTORY}
            isMutating={rowProps.mutatingId === payment.id}
            {...rowProps.handlers}
          />
        ))}
      </div>
    )}
    {totalCount > charges.length && (
      <button type="button" className="btn btn--ghost subscription-card__more" onClick={onViewHistory}>
        {tf('finance.block.viewAll', { n: totalCount })}
      </button>
    )}
  </div>
);

OpenChargesList.propTypes = {
  charges: PropTypes.array.isRequired,
  totalCount: PropTypes.number.isRequired,
  rowProps: PropTypes.object.isRequired,
  onViewHistory: PropTypes.func.isRequired,
};

/** State A: active subscription — plan, status badge + actions menu (replace/history/cancel), net price, open charges. */
const ActiveSubscriptionCard = ({ subscription, planName, openCharges, totalOpen, rowProps, onReplace, onCancel, onViewHistory }) => {
  const badge = buildActiveBadge(subscription, hasOverdueCharge(openCharges), todayDateString());
  const recurrenceLabel = subscription.recurrenceLabel || RECURRENCE_LABEL[subscription.recurrence] || '';

  return (
    <article className="section-card cockpit-card subscription-card">
      <header className="cockpit-card__header subscription-card__header">
        <h3 className="cockpit-card__title subscription-card__title type-h3">{planName}</h3>
        <div className="subscription-card__header-actions">
          <Badge tone={badge.tone}>{badge.label}</Badge>
          <RowMenu
            ariaLabel={t('finance.block.actionsAria')}
            extraItems={[
              { label: t('finance.block.replacePlan'), onClick: onReplace },
              { label: t('finance.block.viewHistory'), onClick: onViewHistory },
              { label: t('finance.block.cancelSubscription'), onClick: onCancel, danger: true },
            ]}
          />
        </div>
      </header>
      <p className="subscription-card__text type-caption">
        {tf('finance.block.sinceMeta', { recurrence: recurrenceLabel, date: formatFullDate(subscription.startDate) })}
      </p>
      {subscription.billingDay && (
        <p className="subscription-card__text type-caption">{tf('finance.block.dueEveryDay', { day: subscription.billingDay })}</p>
      )}
      <PlanPrice entity={subscription} />
      <OpenChargesList charges={openCharges} totalCount={totalOpen} rowProps={rowProps} onViewHistory={onViewHistory} />
    </article>
  );
};

ActiveSubscriptionCard.propTypes = {
  subscription: PropTypes.object.isRequired,
  planName: PropTypes.string.isRequired,
  openCharges: PropTypes.array.isRequired,
  totalOpen: PropTypes.number.isRequired,
  rowProps: PropTypes.object.isRequired,
  onReplace: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onViewHistory: PropTypes.func.isRequired,
};

/** State C: no active plan but open debt left by a cancelled plan. */
const DebtCard = ({ openCharges, totalOpen, rowProps, onAssign, onViewHistory }) => {
  const hasOverdue = hasOverdueCharge(openCharges);
  return (
    <article className="section-card cockpit-card subscription-card">
      <header className="cockpit-card__header">
        <h3 className="cockpit-card__title type-h3">{t('finance.block.noPlanTitle')}</h3>
        <Badge tone={hasOverdue ? 'error' : 'brand'}>
          {t(hasOverdue ? 'finance.block.badgeOverdue' : 'finance.block.badgeOpen')}
        </Badge>
      </header>
      <p className="subscription-card__text type-body">{t('finance.block.debtText')}</p>
      <OpenChargesList charges={openCharges} totalCount={totalOpen} rowProps={rowProps} onViewHistory={onViewHistory} />
      <div className="cockpit-card__actions">
        <button type="button" className="btn btn--primary" onClick={onAssign}>{t('finance.block.assignPlan')}</button>
      </div>
    </article>
  );
};

DebtCard.propTypes = {
  openCharges: PropTypes.array.isRequired,
  totalOpen: PropTypes.number.isRequired,
  rowProps: PropTypes.object.isRequired,
  onAssign: PropTypes.func.isRequired,
  onViewHistory: PropTypes.func.isRequired,
};

/**
 * Placeholder shaped like the active-subscription card (title, meta, price, two charge
 * rows) — the most common loaded state — so the sections below don't jump when it lands.
 */
const SubscriptionCardSkeleton = () => (
  <div className="section-card cockpit-card subscription-card" aria-busy="true">
    <SkeletonText typeClass="type-h3" width="short" />
    <SkeletonText typeClass="type-caption" />
    <SkeletonText typeClass="type-h2" width="short" />
    <SkeletonRows label={t('finance.block.loading')} count={2} />
  </div>
);

const BlockBody = ({ loading, error, subscription, openCharges, totalOpen, ...props }) => {
  if (loading) return <SubscriptionCardSkeleton />;
  if (error) {
    return (
      <div className="section-card cockpit-card subscription-card" role="alert">
        <p className="subscription-card__text type-body">{t('finance.block.error')}</p>
        <div className="cockpit-card__actions">
          <button type="button" className="btn btn--secondary" onClick={props.onRetry}>{t('finance.retry')}</button>
        </div>
      </div>
    );
  }
  if (subscription) {
    return <ActiveSubscriptionCard subscription={subscription} openCharges={openCharges} totalOpen={totalOpen} {...props} />;
  }
  if (openCharges.length > 0) return <DebtCard openCharges={openCharges} totalOpen={totalOpen} {...props} />;
  return (
    <div className="section-card">
      <EmptyBlock
        icon={CreditCard}
        title={t('finance.block.noPlanTitle')}
        description={t('finance.block.noPlanText')}
        actionLabel={t('finance.block.assignPlan')}
        onAction={props.onAssign}
      />
    </div>
  );
};

BlockBody.propTypes = {
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  subscription: PropTypes.object,
  openCharges: PropTypes.array.isRequired,
  totalOpen: PropTypes.number.isRequired,
  onRetry: PropTypes.func.isRequired,
  onAssign: PropTypes.func.isRequired,
};

/**
 * StudentDetail "Assinatura" section: A active subscription, B no plan,
 * C no plan but open debt from a cancelled plan. Presentational — the page
 * owns the data (`useStudentSubscriptionManager`) and the mutations.
 */
const SubscriptionBlock = ({ payments, mutatingId, rowHandlers, ...props }) => {
  const sortedOpen = sortOpenCharges(payments);
  const openCharges = sortedOpen.slice(0, SUBSCRIPTION_OPEN_CHARGES_LIMIT);
  const rowProps = { mutatingId, handlers: rowHandlers };

  return (
    <section className="student-detail__section" aria-labelledby="student-subscription-heading">
      <div className="student-detail__section-header">
        <h2 id="student-subscription-heading" className="student-detail__section-title type-body-lg-strong">
          {t('finance.block.title')}
        </h2>
        {/* With an active plan, history lives in the card's actions menu. */}
        {payments.length > 0 && !props.subscription && (
          <button type="button" className="btn btn--ghost" onClick={props.onViewHistory}>{t('finance.block.viewHistory')}</button>
        )}
      </div>
      <BlockBody openCharges={openCharges} totalOpen={sortedOpen.length} rowProps={rowProps} {...props} />
    </section>
  );
};

SubscriptionBlock.propTypes = {
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  subscription: PropTypes.object,
  planName: PropTypes.string.isRequired,
  payments: PropTypes.array.isRequired,
  mutatingId: PropTypes.string,
  rowHandlers: PropTypes.object.isRequired,
  onRetry: PropTypes.func.isRequired,
  onAssign: PropTypes.func.isRequired,
  onReplace: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onViewHistory: PropTypes.func.isRequired,
};

export default SubscriptionBlock;
