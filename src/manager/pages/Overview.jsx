import { useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import Segmented from '../../components/ds/Segmented';
import MetricCard from '../../components/ds/MetricCard';
import ColumnChart from '../../components/ds/ColumnChart';
import ShareBar from '../../components/ds/ShareBar';
import Badge from '../../components/ds/Badge';
import Avatar from '../../components/ds/Avatar';
import Kpi from '../../components/ds/Kpi';
import SkeletonRows from '../../components/ds/SkeletonRows';
import Banner from '../../components/ds/Banner';
import { getOverview } from '../api';
import { getDisplayName } from '../format';
import useManagerQuery from '../useManagerQuery';
import { t, tf, tCount } from '../../i18n';

const PERIODS = ['7d', '30d', '90d'];
const DEFAULT_PERIOD = '30d';
const KPI_KEYS = ['newTrainers', 'newStudents', 'activeTrainers', 'completedSessions'];
const MINUS_SIGN = '−';
const usdFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'USD' });

// Integer with pt-BR thousands separators; anything that is not a number counts as zero.
const formatInteger = (value) => (Number(value) || 0).toLocaleString('pt-BR');

// Amount in US dollars, pt-BR style ("US$ 12,34").
const formatUsd = (value) => usdFormatter.format(Number(value) || 0);

// "YYYY-MM-DD" week start as "DD/MM" (string split, so no time zone shift).
const formatWeekLabel = (weekStart) => {
  const [, month, day] = String(weekStart).split('-');
  return `${day}/${month}`;
};

// Creation day as "DD/MM/AAAA", or "-" when the date is missing or invalid.
const formatDay = (iso) => {
  const date = new Date(iso);
  return iso && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('pt-BR') : '-';
};

// Share of the input tokens served from the cache, as a whole percentage.
const cacheSharePercent = ({ inputTokens, cacheReadTokens, cacheWriteTokens }) => {
  const base = (inputTokens || 0) + (cacheReadTokens || 0) + (cacheWriteTokens || 0);
  return base > 0 ? Math.round(((cacheReadTokens || 0) / base) * 100) : 0;
};

// Signed difference between periods ("+6", "−3", "0").
const formatDelta = (delta) => {
  if (delta > 0) return `+${formatInteger(delta)}`;
  if (delta < 0) return `${MINUS_SIGN}${formatInteger(-delta)}`;
  return '0';
};

// Badge tone of a difference between periods: growth success, drop error, no change neutral.
const deltaTone = (delta) => {
  if (delta > 0) return 'success';
  if (delta < 0) return 'error';
  return 'neutral';
};

// Translated plan tier name, falling back to the raw tier.
const tierLabel = (tier) => t(`platformPlan.tier.${tier}`) || tier;

// Plan tag: neutral for the free plan, brand for every other tier.
const TierBadge = ({ tier }) => (
  <Badge tone={tier === 'FREE' ? 'neutral' : 'brand'} variant="tag">{tierLabel(tier)}</Badge>
);

TierBadge.propTypes = { tier: PropTypes.string.isRequired };

// Title of a section card.
const CardTitle = ({ children }) => <h2 className="manager-overview__card-title type-h3">{children}</h2>;

CardTitle.propTypes = { children: PropTypes.node.isRequired };

// The four KPI cards: current value, signed delta pill and the previous value.
const KpiGrid = ({ kpis }) => (
  <div className="metric-grid">
    {KPI_KEYS.map((key) => {
      const { current = 0, previous = 0 } = kpis?.[key] ?? {};
      const delta = current - previous;
      return (
        <MetricCard
          key={key}
          label={t(`manager.overview.kpis.${key}`)}
          value={formatInteger(current)}
          pill={<Badge tone={deltaTone(delta)} variant="tag">{formatDelta(delta)}</Badge>}
          support={tf('manager.overview.previous', { value: formatInteger(previous) })}
        />
      );
    })}
  </div>
);

KpiGrid.propTypes = { kpis: PropTypes.object };

// Weekly signups of trainers and students as a grouped column chart.
const SignupsCard = ({ weeks }) => {
  const series = [
    { id: 'trainers', label: t('manager.overview.signups.trainers') },
    { id: 'students', label: t('manager.overview.signups.students') },
  ];
  const columns = weeks.map((week) => ({ label: formatWeekLabel(week.weekStart), values: [week.trainers, week.students] }));
  return (
    <section className="section-card manager-overview__card">
      <CardTitle>{t('manager.overview.signups.title')}</CardTitle>
      <ColumnChart ariaLabel={t('manager.overview.signups.title')} series={series} columns={columns} />
    </section>
  );
};

SignupsCard.propTypes = { weeks: PropTypes.arrayOf(PropTypes.object).isRequired };

// One row of the iArnold top users: identity, plan tag, tokens and cost.
const TopTrainerRow = ({ trainer }) => {
  const name = getDisplayName(trainer);
  const hasName = Boolean(trainer.firstName || trainer.lastName);
  return (
    <li className="manager-overview__row">
      <span className="manager-overview__identity">
        <span className="manager-overview__name type-body-strong">{name}</span>
        {hasName && trainer.email && <span className="manager-overview__meta type-caption">{trainer.email}</span>}
      </span>
      <TierBadge tier={trainer.tier} />
      <span className="manager-overview__figures">
        <span className="type-body-strong">{formatInteger(trainer.totalTokens)}</span>
        <span className="manager-overview__meta type-caption">{formatUsd(trainer.estimatedCostUsd)}</span>
      </span>
    </li>
  );
};

TopTrainerRow.propTypes = { trainer: PropTypes.object.isRequired };

// Cache split of the input tokens (read from cache, plain input, written to cache).
const cacheSegments = (ai) => [
  { id: 'cacheRead', label: t('manager.overview.ai.cacheRead'), value: ai.cacheReadTokens || 0 },
  { id: 'input', label: t('manager.overview.ai.input'), value: ai.inputTokens || 0 },
  { id: 'cacheWrite', label: t('manager.overview.ai.cacheWrite'), value: ai.cacheWriteTokens || 0 },
];

// Month figures of the iArnold: tokens, interactions, trainers, cache share and cost.
const AiStats = ({ ai }) => (
  <div className="manager-overview__stats">
    <Kpi label={t('manager.overview.ai.tokens')} value={formatInteger(ai.totalTokens)} />
    <Kpi label={t('manager.overview.ai.interactions')} value={formatInteger(ai.interactions)} />
    <Kpi label={t('manager.overview.ai.trainers')} value={formatInteger(ai.trainers)} />
    <Kpi
      label={t('manager.overview.ai.cost')}
      value={formatUsd(ai.estimatedCostUsd)}
      support={ai.costComplete === false ? t('manager.overview.ai.partial') : undefined}
    />
  </div>
);

AiStats.propTypes = { ai: PropTypes.object.isRequired };

// iArnold card of the current billing month.
const AiCard = ({ ai }) => {
  const topTrainers = ai.topTrainers ?? [];
  return (
    <section className="section-card manager-overview__card">
      <div className="manager-overview__card-heading">
        <CardTitle>{t('manager.overview.ai.title')}</CardTitle>
        <p className="manager-overview__meta type-caption">{t('manager.overview.ai.month')}</p>
      </div>
      <AiStats ai={ai} />
      <Kpi label={t('manager.overview.ai.cacheShare')} value={`${cacheSharePercent(ai)}%`} />
      <ShareBar ariaLabel={t('manager.overview.ai.cacheAria')} segments={cacheSegments(ai)} />
      <h3 className="manager-overview__subtitle type-h4">{t('manager.overview.ai.topTitle')}</h3>
      {topTrainers.length === 0 && <p className="manager-overview__meta type-body">{t('manager.overview.ai.topEmpty')}</p>}
      <ol className="manager-overview__list">
        {topTrainers.map((trainer) => <TopTrainerRow key={trainer.trainerId} trainer={trainer} />)}
      </ol>
    </section>
  );
};

AiCard.propTypes = { ai: PropTypes.object.isRequired };

// Trainers per plan tier as a share bar with the counts in the legend.
const PlansCard = ({ plans }) => (
  <section className="section-card manager-overview__card">
    <CardTitle>{t('manager.overview.plans.title')}</CardTitle>
    <ShareBar
      ariaLabel={t('manager.overview.plans.title')}
      segments={plans.map((plan) => ({ id: plan.tier, label: tierLabel(plan.tier), value: plan.count }))}
    />
  </section>
);

PlansCard.propTypes = { plans: PropTypes.arrayOf(PropTypes.object).isRequired };

// Pending items, each linking to the manager page where it is handled.
const PendingCard = ({ pending }) => {
  const items = [
    { id: 'invites', to: '/manager/invites', count: pending?.pendingInvites },
    { id: 'feedbacks', to: '/manager/feedbacks', count: pending?.newFeedbacks },
    { id: 'trainersWithoutStudents', to: '/manager/trainers', count: pending?.trainersWithoutStudents },
  ];
  return (
    <section className="section-card manager-overview__card">
      <CardTitle>{t('manager.overview.pending.title')}</CardTitle>
      <ul className="manager-overview__list">
        {items.map((item) => (
          <li key={item.id}>
            <Link to={item.to} className="manager-overview__link">
              <span className="manager-overview__link-label type-body">{t(`manager.overview.pending.${item.id}`)}</span>
              <span className="manager-overview__count type-h4">{formatInteger(item.count)}</span>
              <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

PendingCard.propTypes = { pending: PropTypes.object };

// One of the latest trainers, linking to their manager user page.
const LatestTrainerRow = ({ trainer }) => {
  const name = getDisplayName(trainer);
  const meta = `${tCount('manager.overview.latest.students', trainer.studentCount || 0)} · ${formatDay(trainer.createdAt)}`;
  return (
    <li>
      <Link to={`/manager/users/${trainer.userId}`} className="manager-overview__link">
        <Avatar name={name} size="sm" />
        <span className="manager-overview__identity">
          <span className="manager-overview__name type-body-strong">{name}</span>
          <span className="manager-overview__meta type-caption">{meta}</span>
        </span>
        <TierBadge tier={trainer.tier} />
      </Link>
    </li>
  );
};

LatestTrainerRow.propTypes = { trainer: PropTypes.object.isRequired };

// The newest trainers of the platform.
const LatestTrainersCard = ({ trainers }) => (
  <section className="section-card manager-overview__card">
    <CardTitle>{t('manager.overview.latest.title')}</CardTitle>
    {trainers.length === 0 && <p className="manager-overview__meta type-body">{t('manager.overview.latest.empty')}</p>}
    <ul className="manager-overview__list">
      {trainers.map((trainer) => <LatestTrainerRow key={trainer.userId} trainer={trainer} />)}
    </ul>
  </section>
);

LatestTrainersCard.propTypes = { trainers: PropTypes.arrayOf(PropTypes.object).isRequired };

// Loaded dashboard: KPIs, signups and iArnold side by side, then plans, pending items and latest trainers.
const OverviewContent = ({ overview }) => (
  <>
    <KpiGrid kpis={overview.kpis} />
    <div className="manager-overview__grid manager-overview__grid--two">
      <SignupsCard weeks={overview.weeklySignups ?? []} />
      <AiCard ai={overview.ai ?? {}} />
    </div>
    <div className="manager-overview__grid manager-overview__grid--three">
      <PlansCard plans={overview.plans ?? []} />
      <PendingCard pending={overview.pending} />
      <LatestTrainersCard trainers={overview.latestTrainers ?? []} />
    </div>
  </>
);

OverviewContent.propTypes = { overview: PropTypes.object.isRequired };

// Body of the dashboard for the request state: skeleton, error banner or the data.
const OverviewBody = ({ loading, message, data }) => {
  if (loading) return <SkeletonRows label={t('manager.overview.loading')} count={4} />;
  if (message) return <Banner tone="error">{message}</Banner>;
  return <OverviewContent overview={data} />;
};

OverviewBody.propTypes = { loading: PropTypes.bool.isRequired, message: PropTypes.string, data: PropTypes.object };

// Manager dashboard at /manager: platform growth and usage for a 7/30/90-day period.
const Overview = () => {
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const request = useCallback(() => getOverview({ period }), [period]);
  const { data, message, loading } = useManagerQuery(request);
  const periodItems = PERIODS.map((id) => ({ id, label: t(`manager.overview.periods.${id}`) }));

  return (
    <div className="manager-overview">
      <header className="ds-page-header">
        <h1 className="ds-page-header__title type-h1">{t('manager.overview.title')}</h1>
        <div className="ds-page-header__actions">
          <Segmented ariaLabel={t('manager.overview.periodLabel')} items={periodItems} value={period} onChange={setPeriod} disabled={loading} />
        </div>
      </header>
      <OverviewBody loading={loading} message={message} data={data} />
    </div>
  );
};

export default Overview;
