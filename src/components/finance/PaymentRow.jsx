import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import Avatar from '../ds/Avatar';
import RowMenu from '../RowMenu';
import PaymentStatusBadge from './PaymentStatusBadge';
import { t, tf } from '../../i18n';
import { PAYMENT_ROW_VARIANT } from '../../constants/finance';
import {
  PAYMENT_STATUS,
  SUBSCRIPTION_STATUS,
  formatCyclePeriod,
  formatMoneyBRL,
  formatPaidAtDate,
  formatShortDate,
  todayDateString,
} from '../../utils/subscriptionHelpers';

const OPEN_STATUSES = [PAYMENT_STATUS.OVERDUE, PAYMENT_STATUS.PENDING];

/** "Vence/Venceu/Paga em/Venc." — the date only picks the verb, never the status. */
const buildDateText = (payment, today) => {
  const dueShort = formatShortDate(payment.dueDate, today);
  switch (payment.effectiveStatus) {
    case PAYMENT_STATUS.PAID:
      return tf('finance.row.paidOn', { date: formatPaidAtDate(payment.paidAt, today) });
    case PAYMENT_STATUS.CANCELLED:
      return tf('finance.row.voidDue', { date: dueShort });
    case PAYMENT_STATUS.OVERDUE:
      return tf('finance.row.duePast', { date: dueShort });
    default:
      return payment.dueDate >= today
        ? tf('finance.row.dueFuture', { date: dueShort })
        : tf('finance.row.duePast', { date: dueShort });
  }
};

const buildPlanText = (payment) => {
  const planName = payment.plan?.name || t('finance.block.fallbackPlanName');
  return payment.subscriptionStatus === SUBSCRIPTION_STATUS.CANCELLED
    ? `${planName} · ${t('finance.row.planCancelled')}`
    : planName;
};

const buildMenuItems = (payment, handlers) => {
  const edit = { label: t('finance.menu.edit'), onClick: () => handlers.onEdit(payment) };

  switch (payment.effectiveStatus) {
    case PAYMENT_STATUS.PAID:
      return [edit, { label: t('finance.menu.revert'), onClick: () => handlers.onRevert(payment) }];
    case PAYMENT_STATUS.CANCELLED:
      return [{ label: t('finance.menu.registerPayment'), onClick: () => handlers.onMarkPaidOnDate(payment) }];
    default:
      return [
        { label: t('finance.menu.markPaidOnDate'), onClick: () => handlers.onMarkPaidOnDate(payment) },
        edit,
        { label: t('finance.menu.void'), onClick: () => handlers.onVoid(payment), danger: true },
      ];
  }
};

const buildLabels = (payment, isOverview, today) => {
  const dueShort = formatShortDate(payment.dueDate, today);
  const amount = formatMoneyBRL(payment.amount);
  if (isOverview) {
    const name = payment.student?.name || t('finance.unnamedStudent');
    return {
      title: name,
      studentLinkAria: tf('finance.row.studentLinkAria', { name }),
      markPaidAria: tf('finance.row.markPaidAria', { name, amount }),
      menuAria: tf('finance.row.menuAria', { name, date: dueShort }),
    };
  }
  return {
    title: formatCyclePeriod(payment.cycleStartDate, payment.cycleEndDate),
    markPaidAria: tf('finance.row.markPaidAriaHistory', { date: dueShort }),
    menuAria: tf('finance.row.menuAriaHistory', { date: dueShort }),
  };
};

const buildRowClass = (payment, isOverview) => [
  'charge-row',
  isOverview ? 'charge-row--overview' : '',
  payment.effectiveStatus === PAYMENT_STATUS.CANCELLED ? 'charge-row--void' : '',
].filter(Boolean).join(' ');

/**
 * Overview identity (avatar + name) as a single link to the student's billing
 * history. Only the identity is a link — the row also holds "Marcar pago" and
 * the ⋮ menu, so making the whole row clickable would nest interactive elements.
 */
const StudentIdentityLink = ({ student, title, ariaLabel }) => {
  const avatar = <Avatar name={student?.name || ''} src={student?.avatarUrl ?? undefined} />;
  const name = <span className="charge-row__title type-h4" title={title}>{title}</span>;
  if (!student?.id) return <div className="charge-row__student">{avatar}{name}</div>;
  return (
    <Link
      to={`/trainer/students/${student.id}/subscription-history`}
      state={{ studentName: title }}
      className="charge-row__student charge-row__student--link"
      aria-label={ariaLabel}
    >
      {avatar}
      {name}
    </Link>
  );
};

StudentIdentityLink.propTypes = {
  student: PropTypes.shape({ id: PropTypes.string, name: PropTypes.string, avatarUrl: PropTypes.string }),
  title: PropTypes.string.isRequired,
  ariaLabel: PropTypes.string.isRequired,
};

/**
 * One charge row (Linha de aluno anatomy, SKILL §4.12), shared by the Financeiro
 * overview (student identity, linked to the history) and the history/StudentDetail
 * lists (cycle identity). Status comes from the API and is shown as a Badge — never
 * a stripe. One visible action ("Marcar pago" on open charges) + the ⋮ menu.
 */
const PaymentRow = ({
  payment,
  variant = PAYMENT_ROW_VARIANT.OVERVIEW,
  isMutating = false,
  onMarkPaid,
  onMarkPaidOnDate,
  onEdit,
  onRevert,
  onVoid,
}) => {
  const today = todayDateString();
  const isOverview = variant === PAYMENT_ROW_VARIANT.OVERVIEW;
  const isOpen = OPEN_STATUSES.includes(payment.effectiveStatus);
  const labels = buildLabels(payment, isOverview, today);
  const menuItems = buildMenuItems(payment, { onMarkPaidOnDate, onEdit, onRevert, onVoid });
  const showNotes = !isOverview && Boolean(payment.notes);

  return (
    <article className={buildRowClass(payment, isOverview)} aria-busy={isMutating || undefined}>
      {isOverview && (
        <StudentIdentityLink student={payment.student} title={labels.title} ariaLabel={labels.studentLinkAria} />
      )}
      <div className="charge-row__identity">
        {!isOverview && <p className="charge-row__title type-h4" title={labels.title}>{labels.title}</p>}
        <div className="charge-row__meta">
          <PaymentStatusBadge status={payment.effectiveStatus} daysOverdue={payment.daysOverdue} />
          <span className="charge-row__plan type-caption">{buildPlanText(payment)}</span>
          <span className="charge-row__date type-caption">{buildDateText(payment, today)}</span>
        </div>
        {showNotes && (
          <p className="charge-row__notes type-caption" title={payment.notes}>
            {tf('finance.row.notes', { notes: payment.notes })}
          </p>
        )}
      </div>
      <div className="charge-row__figures">
        <span className="charge-row__amount type-h4">{formatMoneyBRL(payment.amount)}</span>
        <div className="charge-row__action">
          {isOpen && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => onMarkPaid(payment)}
              disabled={isMutating}
              aria-label={isMutating ? undefined : labels.markPaidAria}
            >
              {isMutating ? t('finance.loading') : t('finance.row.markPaid')}
            </button>
          )}
        </div>
      </div>
      <div className="charge-row__menu">
        <RowMenu ariaLabel={labels.menuAria} extraItems={menuItems} triggerDisabled={isMutating} />
      </div>
    </article>
  );
};

PaymentRow.propTypes = {
  payment: PropTypes.shape({
    id: PropTypes.string.isRequired,
    amount: PropTypes.string,
    dueDate: PropTypes.string,
    cycleStartDate: PropTypes.string,
    cycleEndDate: PropTypes.string,
    effectiveStatus: PropTypes.oneOf(Object.values(PAYMENT_STATUS)).isRequired,
    daysOverdue: PropTypes.number,
    paidAt: PropTypes.string,
    notes: PropTypes.string,
    subscriptionStatus: PropTypes.string,
    student: PropTypes.shape({ id: PropTypes.string, name: PropTypes.string, avatarUrl: PropTypes.string }),
    plan: PropTypes.shape({ name: PropTypes.string }),
  }).isRequired,
  variant: PropTypes.oneOf(Object.values(PAYMENT_ROW_VARIANT)),
  isMutating: PropTypes.bool,
  onMarkPaid: PropTypes.func.isRequired,
  onMarkPaidOnDate: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onRevert: PropTypes.func.isRequired,
  onVoid: PropTypes.func.isRequired,
};

export default PaymentRow;
