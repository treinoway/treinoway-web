import PropTypes from 'prop-types';
import MetricCard from '../ds/MetricCard';
import Banner from '../ds/Banner';
import SkeletonText from '../ds/SkeletonText';
import { getLocale, t, tf } from '../../i18n';

// Formats the briefing computation time as HH:MM.
const formatBriefingTime = (isoString) => {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' });
};

// Formats the adherence delta in percentage points.
const formatDelta = (value) => {
  const rounded = Math.round(Number(value));
  if (rounded > 0) return tf('trainerBriefing.stats.adherenceDeltaPos', { value: rounded });
  if (rounded < 0) return tf('trainerBriefing.stats.adherenceDeltaNeg', { value: rounded });
  return t('trainerBriefing.stats.adherenceDeltaNeutral');
};

// Builds the four briefing tiles from the briefing payload.
const buildTiles = (briefing) => [
  {
    key: 'active',
    label: t('trainerBriefing.stats.activeStudents'),
    value: briefing?.activeStudents ?? '—',
    support: tf('trainerBriefing.stats.activeStudentsSub', { count: briefing?.returningThisWeek ?? 0 }),
    tone: 'neutral',
  },
  {
    key: 'stagnant',
    label: t('trainerBriefing.stats.stagnantProgress'),
    value: briefing?.stagnantProgress ?? '—',
    support: t('trainerBriefing.stats.stagnantProgressSub'),
    tone: 'warning',
  },
  {
    key: 'inactive',
    label: t('trainerBriefing.stats.inactiveStudents'),
    value: briefing?.inactiveStudents ?? '—',
    support: t('trainerBriefing.stats.inactiveStudentsSub'),
    tone: 'warning',
  },
  {
    key: 'adherence',
    label: t('trainerBriefing.stats.adherence'),
    value: briefing ? `${Math.round(Number(briefing.overallAdherence))}%` : '—',
    support: briefing ? formatDelta(briefing.adherenceDeltaPp) : undefined,
    tone: 'brand',
  },
];

// Resolves the caption next to the section title.
const buildTimestamp = (briefing, loading) => {
  if (loading) return t('iArnold.chat.loading');
  if (!briefing) return '';
  return tf('trainerBriefing.updatedAt', { time: formatBriefingTime(briefing.computedAt) });
};

// Placeholder tile that keeps the label while the numbers load.
const LoadingTile = ({ label }) => (
  <div className="metric-card metric-card--neutral" aria-busy="true">
    <span className="metric-card-label type-body-strong">{label}</span>
    <SkeletonText typeClass="type-h2" width="short" />
    <SkeletonText typeClass="type-caption" />
  </div>
);

LoadingTile.propTypes = { label: PropTypes.string.isRequired };

// Four briefing KPIs of the trainer's roster, shown on the empty chat.
const BriefingStrip = ({ briefing, loading, error }) => (
  <section className="section-card ai-briefing" aria-label={t('iArnold.chat.briefingLabel')}>
    <header className="ai-briefing__header">
      <h2 className="type-body-strong">{t('trainerBriefing.label')}</h2>
      <span className="type-caption ai-briefing__timestamp">{buildTimestamp(briefing, loading)}</span>
    </header>
    {error ? (
      <Banner tone="warning">{error}</Banner>
    ) : (
      <ul className="ai-briefing__grid">
        {buildTiles(briefing).map(({ key, label, value, support, tone }) => (
          <li key={key}>
            {loading ? <LoadingTile label={label} /> : <MetricCard label={label} value={value} support={support} tone={tone} />}
          </li>
        ))}
      </ul>
    )}
  </section>
);

BriefingStrip.propTypes = {
  briefing: PropTypes.shape({
    activeStudents: PropTypes.number,
    returningThisWeek: PropTypes.number,
    stagnantProgress: PropTypes.number,
    inactiveStudents: PropTypes.number,
    overallAdherence: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    adherenceDeltaPp: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    computedAt: PropTypes.string,
  }),
  loading: PropTypes.bool,
  error: PropTypes.string,
};

export default BriefingStrip;
