import { useState } from 'react';
import PropTypes from 'prop-types';
import { useSearchParams } from 'react-router-dom';
import { CircleAlert, Plus, Wallet } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { t, tf } from '../../i18n';
import Segmented from '../../components/ds/Segmented';
import EmptyBlock from '../../components/ds/EmptyBlock';
import MonthSelector from '../../components/MonthSelector';
import FinanceMetrics from '../../components/finance/FinanceMetrics';
import ChargesPanel from '../../components/finance/ChargesPanel';
import PlansPanel from '../../components/finance/PlansPanel';
import PlanFormSheet from '../../components/finance/PlanFormSheet';
import PaymentActionsLayer from '../../components/finance/PaymentActionsLayer';
import useFinanceOverview from '../../hooks/useFinanceOverview';
import useFinancePlans from '../../hooks/useFinancePlans';
import usePaymentActions from '../../hooks/usePaymentActions';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import {
  CHARGE_FILTER,
  FINANCE_OVERDUE_GRACE_DAYS_FALLBACK,
  FINANCE_SEARCH_DEBOUNCE_MS,
  FINANCE_TAB,
} from '../../constants/finance';
import { getErrorMessage } from '../../utils/financeErrors';
import {
  currentYearMonth,
  formatMonthLabel,
  formatMonthName,
  isValidYearMonth,
} from '../../utils/subscriptionHelpers';

const TABS = [
  { id: FINANCE_TAB.CHARGES, labelKey: 'finance.tabs.charges' },
  { id: FINANCE_TAB.PLANS, labelKey: 'finance.tabs.plans' },
];

const URL_DEFAULTS = { tab: FINANCE_TAB.CHARGES, status: CHARGE_FILTER.ALL };

/** URL state (`?tab=&month=&status=`). Invalid or future months fall back to the current one. */
const readUrlState = (searchParams, maxMonth) => {
  const tab = Object.values(FINANCE_TAB).includes(searchParams.get('tab')) ? searchParams.get('tab') : URL_DEFAULTS.tab;
  const status = Object.values(CHARGE_FILTER).includes(searchParams.get('status'))
    ? searchParams.get('status')
    : URL_DEFAULTS.status;
  const rawMonth = searchParams.get('month');
  const month = isValidYearMonth(rawMonth) && rawMonth <= maxMonth ? rawMonth : maxMonth;
  return { tab, status, month };
};

const FinanceTabs = ({ activeTab, onChange }) => (
  <div className="finance-tabs">
    <Segmented
      ariaLabel={t('finance.tabsAria')}
      items={TABS.map((tab) => ({
        id: tab.id,
        label: t(tab.labelKey),
        domId: `finance-tab-${tab.id}`,
        controls: `finance-tabpanel-${tab.id}`,
      }))}
      value={activeTab}
      onChange={onChange}
    />
  </div>
);

FinanceTabs.propTypes = { activeTab: PropTypes.string.isRequired, onChange: PropTypes.func.isRequired };

const ChargesLoading = () => (
  <>
    <div className="row-skeleton finance-metrics-skeleton" aria-hidden="true" />
    <div className="charge-list" aria-hidden="true">
      <div className="row-skeleton" />
      <div className="row-skeleton" />
      <div className="row-skeleton" />
    </div>
  </>
);

/** Body of the Cobranças tab: error → loading → empty variants → content. */
const ChargesTabBody = ({ overview, plansState, month, graceDays, chargesProps, onRetry, onCreatePlan }) => {
  if (overview.error) {
    return (
      <EmptyBlock icon={CircleAlert} role="alert" title={t('finance.empty.errorTitle')} description={overview.error}
        actionLabel={t('finance.retry')} onAction={onRetry} />
    );
  }
  if (overview.loading || !overview.data) return <ChargesLoading />;
  const { kpis, payments } = overview.data;
  if (payments.length === 0 && plansState.loading) return <ChargesLoading />;
  if (payments.length === 0 && plansState.loaded && plansState.plans.length === 0) {
    return (
      <EmptyBlock icon={Wallet} title={t('finance.empty.setupTitle')} description={t('finance.empty.setupText')}
        actionLabel={t('finance.plans.createPlan')} onAction={onCreatePlan} />
    );
  }
  return (
    <>
      <FinanceMetrics kpis={kpis} monthLabel={formatMonthLabel(month)} graceDays={graceDays} />
      {payments.length === 0
        ? <EmptyBlock icon={Wallet} title={tf('finance.empty.monthTitle', { month: formatMonthName(month) })} description={t('finance.empty.monthText')} />
        : <ChargesPanel payments={payments} {...chargesProps} />}
    </>
  );
};

ChargesTabBody.propTypes = {
  overview: PropTypes.object.isRequired,
  plansState: PropTypes.object.isRequired,
  month: PropTypes.string.isRequired,
  graceDays: PropTypes.number.isRequired,
  chargesProps: PropTypes.object.isRequired,
  onRetry: PropTypes.func.isRequired,
  onCreatePlan: PropTypes.func.isRequired,
};

const Financeiro = () => {
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const maxMonth = currentYearMonth();
  const { tab, status, month } = readUrlState(searchParams, maxMonth);
  const [searchValue, setSearchValue] = useState('');
  const searchQuery = useDebouncedValue(searchValue, FINANCE_SEARCH_DEBOUNCE_MS);
  const [planSheet, setPlanSheet] = useState(null);

  const overview = useFinanceOverview(month);
  const isEmptyMonth = Boolean(overview.data) && overview.data.payments.length === 0;
  const plansState = useFinancePlans(tab === FINANCE_TAB.PLANS || isEmptyMonth);
  const paymentActions = usePaymentActions({ onChanged: overview.refresh, isOverview: true });
  const graceDays = overview.data?.overdueGraceDays ?? FINANCE_OVERDUE_GRACE_DAYS_FALLBACK;
  const isChargesTab = tab === FINANCE_TAB.CHARGES;

  const updateUrl = (patch) => {
    const next = { tab, status, month, ...patch };
    const params = new URLSearchParams();
    if (next.tab !== URL_DEFAULTS.tab) params.set('tab', next.tab);
    if (next.month !== maxMonth) params.set('month', next.month);
    if (next.status !== URL_DEFAULTS.status) params.set('status', next.status);
    setSearchParams(params, { replace: true });
  };

  const handleCreatePlanFromEmpty = () => {
    updateUrl({ tab: FINANCE_TAB.PLANS });
    setPlanSheet({ plan: null });
  };

  const handlePlanSubmit = async (payload) => {
    await plansState.savePlan(planSheet.plan?.id, payload);
    showToast(t(planSheet.plan ? 'finance.toast.planSaved' : 'finance.toast.planCreated'), 'success');
    setPlanSheet(null);
  };

  const handleArchiveToggle = async (plan) => {
    try {
      await plansState.toggleArchive(plan);
      showToast(t(plan.isArchived ? 'finance.toast.planUnarchived' : 'finance.toast.planArchived'), 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  };

  const chargesProps = {
    filter: status,
    onFilterChange: (nextStatus) => updateUrl({ status: nextStatus }),
    searchValue,
    onSearchChange: setSearchValue,
    searchQuery,
    mutatingId: paymentActions.mutatingId,
    rowHandlers: paymentActions.rowHandlers,
  };

  return (
    <div className="finance-page">
      <header className="ds-page-header">
        <div className="ds-page-header__heading">
          <Wallet size={24} strokeWidth={2} aria-hidden="true" />
          <h1 className="ds-page-header__title type-h1">{t('finance.pageTitle')}</h1>
        </div>
        <div className="ds-page-header__actions finance-page__actions">
          {isChargesTab ? (
            <MonthSelector value={month} max={maxMonth} disabled={overview.loading} onChange={(next) => updateUrl({ month: next })} />
          ) : (
            <button type="button" className="btn btn--primary" onClick={() => setPlanSheet({ plan: null })}>
              <Plus size={16} strokeWidth={2} aria-hidden="true" />
              {t('finance.plans.newPlan')}
            </button>
          )}
        </div>
      </header>

      <FinanceTabs activeTab={tab} onChange={(nextTab) => updateUrl({ tab: nextTab })} />

      <div
        role="tabpanel"
        id={`finance-tabpanel-${tab}`}
        aria-labelledby={`finance-tab-${tab}`}
        aria-busy={isChargesTab && overview.loading}
      >
        {isChargesTab ? (
          <ChargesTabBody
            overview={overview}
            plansState={plansState}
            month={month}
            graceDays={graceDays}
            chargesProps={chargesProps}
            onRetry={overview.retry}
            onCreatePlan={handleCreatePlanFromEmpty}
          />
        ) : (
          <PlansPanel
            plans={plansState.plans}
            loading={plansState.loading}
            error={plansState.error}
            onRetry={plansState.retry}
            onCreate={() => setPlanSheet({ plan: null })}
            onEdit={(plan) => setPlanSheet({ plan })}
            onArchiveToggle={handleArchiveToggle}
          />
        )}
      </div>

      {planSheet && (
        <PlanFormSheet plan={planSheet.plan} onClose={() => setPlanSheet(null)} onSubmit={handlePlanSubmit} />
      )}
      <PaymentActionsLayer {...paymentActions.layer} graceDays={graceDays} />
    </div>
  );
};

export default Financeiro;
