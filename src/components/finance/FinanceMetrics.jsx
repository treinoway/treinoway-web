import PropTypes from 'prop-types';
import Kpi from '../ds/Kpi';
import { t, tCount, tf } from '../../i18n';
import useFinanceCopy from '../../hooks/useFinanceCopy';
import { formatDelinquencyRate, formatMoneyBRL } from '../../utils/subscriptionHelpers';

const buildDelinquency = (kpis, ft) => {
  if (!kpis.billedStudents) return { value: '—', support: t('finance.kpi.noBilled') };
  return {
    value: `${formatDelinquencyRate(kpis.delinquencyRate)}%`,
    support: ft('finance.kpi.delinquencySub', { overdue: kpis.overdueStudents, billed: kpis.billedStudents }),
  };
};

/**
 * Financeiro KPIs: "Recebido no mês" and "A receber" follow the selected month;
 * "Em atraso hoje" and "Inadimplência hoje" are always as of today, labelled so
 * and explained in the footnote (grace days from the API). Values are API
 * strings — formatted for display only, never summed here.
 */
const FinanceMetrics = ({ kpis, monthLabel, graceDays }) => {
  const { ft, ftCount } = useFinanceCopy();
  const delinquency = buildDelinquency(kpis, ft);
  const liveSummary = tf('finance.kpi.liveSummary', {
    received: formatMoneyBRL(kpis.receivedAmount),
    pending: formatMoneyBRL(kpis.pendingAmount),
    overdue: formatMoneyBRL(kpis.overdueAmount),
    students: ftCount('finance.count.student', kpis.overdueStudents),
  });

  return (
    <section className="section-card finance-metrics" aria-label={tf('finance.kpi.summaryAria', { month: monthLabel })}>
      <p className="visually-hidden" aria-live="polite">{liveSummary}</p>
      <div className="finance-metrics__grid">
        <Kpi
          label={t('finance.kpi.received')}
          value={formatMoneyBRL(kpis.receivedAmount)}
          support={tCount('finance.count.payment', kpis.receivedCount)}
        />
        <Kpi
          label={t('finance.kpi.toReceive')}
          value={formatMoneyBRL(kpis.pendingAmount)}
          support={tCount('finance.count.charge', kpis.pendingCount)}
        />
        <Kpi
          label={t('finance.kpi.overdue')}
          value={formatMoneyBRL(kpis.overdueAmount)}
          support={ftCount('finance.count.student', kpis.overdueStudents)}
          tone={kpis.overdueCount > 0 ? 'error' : undefined}
        />
        <Kpi
          label={t('finance.kpi.delinquency')}
          value={delinquency.value}
          support={delinquency.support}
          tone={Number(kpis.delinquencyRate) > 0 ? 'error' : undefined}
        />
      </div>
      <p className="finance-metrics__footnote type-caption">{tf('finance.kpi.footnote', { days: graceDays })}</p>
    </section>
  );
};

FinanceMetrics.propTypes = {
  kpis: PropTypes.shape({
    receivedAmount: PropTypes.string.isRequired,
    receivedCount: PropTypes.number.isRequired,
    pendingAmount: PropTypes.string.isRequired,
    pendingCount: PropTypes.number.isRequired,
    overdueAmount: PropTypes.string.isRequired,
    overdueCount: PropTypes.number.isRequired,
    overdueStudents: PropTypes.number.isRequired,
    billedStudents: PropTypes.number.isRequired,
    delinquencyRate: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  }).isRequired,
  monthLabel: PropTypes.string.isRequired,
  graceDays: PropTypes.number.isRequired,
};

export default FinanceMetrics;
