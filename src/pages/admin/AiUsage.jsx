import { useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Sparkles } from 'lucide-react';
import { t } from '../../i18n';
import { getAiUsage } from '../../api/admin';
import useAdminQuery from '../../hooks/useAdminQuery';
import LibraryPageHeader from '../../components/LibraryPageHeader';
import EmptyBlock from '../../components/ds/EmptyBlock';
import MetricCard from '../../components/ds/MetricCard';
import QueryFeedback from '../../components/admin/QueryFeedback';
import TierBadge from '../../components/admin/TierBadge';
import { getTrainerName, hasTrainerName } from '../../utils/adminTrainer';

const numberFormatter = new Intl.NumberFormat('pt-BR');

// Fetches the usage for `{ month }`.
const fetchUsage = ({ month }) => getAiUsage(month);

// Returns the current UTC month as YYYY-MM (the backend default).
const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

// Month picker driving the report.
const MonthField = ({ value, onChange }) => (
  <div className="field admin-search">
    <label className="field-label type-caption-strong" htmlFor="ai-usage-month">
      {t('adminAiUsage.monthLabel')}
    </label>
    <input
      id="ai-usage-month"
      type="month"
      className="input"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </div>
);

MonthField.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

// Six month-total cards (two columns on mobile).
const TotalsGrid = ({ totals }) => (
  <div className="metric-grid metric-grid--3">
    <MetricCard label={t('adminAiUsage.cardInput')} value={numberFormatter.format(totals.inputTokens)} />
    <MetricCard label={t('adminAiUsage.cardOutput')} value={numberFormatter.format(totals.outputTokens)} />
    <MetricCard label={t('adminAiUsage.cardCacheRead')} value={numberFormatter.format(totals.cacheReadTokens)} />
    <MetricCard label={t('adminAiUsage.cardCacheWrite')} value={numberFormatter.format(totals.cacheWriteTokens)} />
    <MetricCard label={t('adminAiUsage.cardTotal')} value={numberFormatter.format(totals.totalTokens)} tone="brand" />
    <MetricCard label={t('adminAiUsage.cardTurns')} value={numberFormatter.format(totals.turns)} />
  </div>
);

TotalsGrid.propTypes = { totals: PropTypes.object.isRequired };

// One trainer's usage row; detail columns show from tablet up.
const UsageRow = ({ trainer }) => {
  const name = getTrainerName(trainer);
  return (
    <tr>
      <td>
        <span className="type-body-strong">{name}</span>
        {hasTrainerName(trainer) && trainer.email && <span className="admin-table__sub type-caption">{trainer.email}</span>}
      </td>
      <td><TierBadge tier={trainer.tier} /></td>
      <td className="admin-table__number">{numberFormatter.format(trainer.totalTokens)}</td>
      <td className="admin-table__number table-col-desktop-only">{numberFormatter.format(trainer.inputTokens)}</td>
      <td className="admin-table__number table-col-desktop-only">{numberFormatter.format(trainer.outputTokens)}</td>
      <td className="admin-table__number table-col-desktop-only">{numberFormatter.format(trainer.turns)}</td>
    </tr>
  );
};

UsageRow.propTypes = { trainer: PropTypes.object.isRequired };

// Per-trainer usage table, biggest consumer first (order comes from the API).
const UsageTable = ({ trainers }) => (
  <div className="section-card admin-table-wrap">
    <table className="admin-table type-body">
      <thead>
        <tr>
          <th className="type-caption-strong">{t('adminAiUsage.colTrainer')}</th>
          <th className="type-caption-strong">{t('adminAiUsage.colPlan')}</th>
          <th className="type-caption-strong">{t('adminAiUsage.colTotal')}</th>
          <th className="type-caption-strong table-col-desktop-only">{t('adminAiUsage.colInput')}</th>
          <th className="type-caption-strong table-col-desktop-only">{t('adminAiUsage.colOutput')}</th>
          <th className="type-caption-strong table-col-desktop-only">{t('adminAiUsage.colInteractions')}</th>
        </tr>
      </thead>
      <tbody>
        {trainers.map((trainer) => (
          <UsageRow key={trainer.trainerId} trainer={trainer} />
        ))}
      </tbody>
    </table>
  </div>
);

UsageTable.propTypes = { trainers: PropTypes.array.isRequired };

// Admin page: iArnold token totals and per-trainer usage for a month.
const AiUsage = () => {
  const [month, setMonth] = useState(getCurrentMonth);
  const params = useMemo(() => ({ month }), [month]);
  const { data, loading, error, reload } = useAdminQuery(fetchUsage, params);

  const handleMonthChange = (value) => {
    if (value) setMonth(value);
  };

  const isEmpty = !loading && !error && data?.trainers.length === 0;
  const hasUsage = !loading && !error && data?.trainers.length > 0;

  return (
    <div className="admin-page">
      <LibraryPageHeader icon={Sparkles} title={t('adminAiUsage.title')} />
      <MonthField value={month} onChange={handleMonthChange} />
      <QueryFeedback
        loading={loading}
        error={error}
        loadingLabel={t('adminAiUsage.loading')}
        errorTitle={t('adminAiUsage.errorTitle')}
        retryLabel={t('adminAiUsage.retry')}
        onRetry={reload}
      />
      {isEmpty && (
        <EmptyBlock icon={Sparkles} title={t('adminAiUsage.emptyTitle')} description={t('adminAiUsage.emptyDescription')} />
      )}
      {hasUsage && (
        <>
          <TotalsGrid totals={data.totals} />
          <UsageTable trainers={data.trainers} />
        </>
      )}
    </div>
  );
};

export default AiUsage;
