import { useState } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CircleAlert, ReceiptText, UserX, Wallet } from 'lucide-react';
import { t, tCount, tf } from '../../i18n';
import Kpi from '../../components/ds/Kpi';
import Segmented from '../../components/ds/Segmented';
import EmptyBlock from '../../components/ds/EmptyBlock';
import PaymentRow from '../../components/finance/PaymentRow';
import PaymentActionsLayer from '../../components/finance/PaymentActionsLayer';
import useStudentPaymentHistory from '../../hooks/useStudentPaymentHistory';
import usePaymentActions from '../../hooks/usePaymentActions';
import {
  FINANCE_OVERDUE_GRACE_DAYS_FALLBACK,
  HISTORY_FILTER,
  PAYMENT_ROW_VARIANT,
} from '../../constants/finance';
import {
  countHistoryByFilter,
  filterHistoryPayments,
  groupPaymentsByYear,
} from '../../utils/financeCharges';
import { PAYMENT_STATUS, formatMoneyBRL, formatMonthYearShort } from '../../utils/subscriptionHelpers';

const HISTORY_FILTERS = [
  { id: HISTORY_FILTER.ALL, labelKey: 'finance.filter.all' },
  { id: HISTORY_FILTER.OPEN, labelKey: 'finance.filter.open' },
  { id: HISTORY_FILTER.PAID, labelKey: 'finance.filter.paid' },
  { id: HISTORY_FILTER.VOID, labelKey: 'finance.filter.void' },
];

const HistoryStats = ({ summary, payments }) => {
  const openCount = filterHistoryPayments(payments, HISTORY_FILTER.OPEN).length;
  const overdueCount = payments.filter((payment) => payment.effectiveStatus === PAYMENT_STATUS.OVERDUE).length;
  return (
    <section className="section-card finance-metrics" aria-label={t('finance.history.summaryAria')}>
      <div className="finance-metrics__grid finance-metrics__grid--three">
        <Kpi
          label={t('finance.history.totalReceived')}
          value={formatMoneyBRL(summary?.totalReceived ?? '0')}
          support={tCount('finance.count.payment', summary?.receivedCount ?? 0)}
        />
        <Kpi
          label={t('finance.history.open')}
          value={openCount}
          support={overdueCount > 0 ? tf('finance.history.openOverdueSub', { n: overdueCount }) : undefined}
          tone={overdueCount > 0 ? 'error' : undefined}
        />
        <Kpi label={t('finance.history.studentSince')} value={formatMonthYearShort(summary?.customerSince)} />
      </div>
    </section>
  );
};

HistoryStats.propTypes = { summary: PropTypes.object, payments: PropTypes.array.isRequired };

const HistoryFilters = ({ counts, activeFilter, onChange }) => (
  <div className="finance-toolbar">
    <Segmented
      ariaLabel={t('finance.filter.aria')}
      items={HISTORY_FILTERS
        .filter(({ id }) => id !== HISTORY_FILTER.VOID || counts[id] > 0)
        .map(({ id, labelKey }) => ({ id, label: t(labelKey), count: counts[id] }))}
      value={activeFilter}
      onChange={onChange}
    />
  </div>
);

HistoryFilters.propTypes = {
  counts: PropTypes.object.isRequired,
  activeFilter: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

const HistoryList = ({ payments, mutatingId, rowHandlers }) => {
  if (payments.length === 0) return <p className="finance-notice type-body">{t('finance.history.noMatches')}</p>;
  return groupPaymentsByYear(payments).map(([year, rows]) => (
    <section key={year} className="finance-section" aria-labelledby={`history-year-${year}`}>
      <h2 id={`history-year-${year}`} className="finance-section__title type-body-lg-strong">{year}</h2>
      <div className="charge-list">
        {rows.map((payment) => (
          <PaymentRow
            key={payment.id}
            payment={payment}
            variant={PAYMENT_ROW_VARIANT.HISTORY}
            isMutating={mutatingId === payment.id}
            {...rowHandlers}
          />
        ))}
      </div>
    </section>
  ));
};

HistoryList.propTypes = {
  payments: PropTypes.array.isRequired,
  mutatingId: PropTypes.string,
  rowHandlers: PropTypes.object.isRequired,
};

const HistoryLoading = () => (
  <div aria-busy="true">
    <div className="row-skeleton finance-metrics-skeleton" aria-hidden="true" />
    <div className="charge-list" aria-hidden="true">
      <div className="row-skeleton" />
      <div className="row-skeleton" />
      <div className="row-skeleton" />
    </div>
  </div>
);

const HistoryBody = ({ history, filter, onFilterChange, paymentActions }) => {
  if (history.loading) return <HistoryLoading />;
  if (history.error) {
    return (
      <EmptyBlock icon={CircleAlert} role="alert" title={t('finance.history.errorTitle')} description={history.error}
        actionLabel={t('finance.retry')} onAction={history.retry} />
    );
  }
  if (!history.data?.student) {
    return <EmptyBlock icon={UserX} title={t('finance.history.notFoundTitle')} description={t('finance.history.notFoundText')} />;
  }
  const payments = history.data.payments || [];
  if (payments.length === 0) {
    return <EmptyBlock icon={ReceiptText} title={t('finance.history.emptyTitle')} description={t('finance.history.emptyText')} />;
  }
  return (
    <>
      <HistoryStats summary={history.data.summary} payments={payments} />
      <HistoryFilters counts={countHistoryByFilter(payments)} activeFilter={filter} onChange={onFilterChange} />
      <HistoryList
        payments={filterHistoryPayments(payments, filter)}
        mutatingId={paymentActions.mutatingId}
        rowHandlers={paymentActions.rowHandlers}
      />
    </>
  );
};

HistoryBody.propTypes = {
  history: PropTypes.object.isRequired,
  filter: PropTypes.string.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  paymentActions: PropTypes.object.isRequired,
};

/** Router state first, then the API; "" from the API → "Aluno sem nome". null until known. */
const resolveStudentName = (stateName, student) => {
  if (stateName) return stateName;
  if (!student) return null;
  return student.name || t('finance.unnamedStudent');
};

/**
 * Per-student billing history. One request; reachable after the student is
 * unlinked. The name comes from router state, else from the API.
 */
const SubscriptionHistory = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [filter, setFilter] = useState(HISTORY_FILTER.ALL);
  const history = useStudentPaymentHistory(studentId);
  const paymentActions = usePaymentActions({ onChanged: history.reload, isOverview: false });
  const studentName = resolveStudentName(location.state?.studentName, history.data?.student);

  const handleBack = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate(`/trainer/students/${studentId}`);
  };

  return (
    <div className="finance-page">
      <button type="button" className="btn btn--ghost finance-page__back" onClick={handleBack}>
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        {t('finance.history.back')}
      </button>
      <header className="ds-page-header">
        <div className="finance-page__heading-group">
          {studentName && <span className="finance-page__eyebrow type-overline">{t('finance.history.eyebrow')}</span>}
          <div className="ds-page-header__heading">
            <Wallet size={24} strokeWidth={2} aria-hidden="true" />
            <h1 className="ds-page-header__title type-h1">{studentName || t('finance.history.eyebrow')}</h1>
          </div>
        </div>
      </header>
      <HistoryBody history={history} filter={filter} onFilterChange={setFilter} paymentActions={paymentActions} />
      <PaymentActionsLayer {...paymentActions.layer} graceDays={FINANCE_OVERDUE_GRACE_DAYS_FALLBACK} />
    </div>
  );
};

export default SubscriptionHistory;
