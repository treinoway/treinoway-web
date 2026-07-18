import PropTypes from 'prop-types';
import { Radar, Wallet, Activity, CircleCheck, Users } from 'lucide-react';
import ControlTile from './ControlTile';
import StatDisplay from './StatDisplay';
import { formatCurrencyBRL, formatCurrencyCompactBRL } from '../utils/currencyFormat';
import formatRelativeTime from '../utils/relativeTime';
import { t } from '../i18n';

// Financeiro numbers older than this are shown dimmed, with the "Em atraso"
// link suppressed in favor of a "toque para atualizar" cue — roster/count
// tiles age gently and are unaffected by this threshold.
const FINANCE_FRESHNESS_MS = 15 * 60 * 1000;

const isFinanceStale = (generatedAt) => {
  if (!generatedAt) return false;
  const generatedMs = new Date(generatedAt).getTime();
  if (Number.isNaN(generatedMs)) return false;
  return Date.now() - generatedMs > FINANCE_FRESHNESS_MS;
};

// Accepts either a number or a numeric string (the real contract sends
// adherenceMonthPct as a string, e.g. "78.50") — Number() coerces both.
const formatAdherencePct = (pct) =>
  Number(pct).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const formatAdherenceDeltaPp = (deltaPp) => {
  if (deltaPp === null || deltaPp === undefined) return null;
  const numeric = Number(deltaPp);
  if (!Number.isFinite(numeric)) return null;
  const rounded = Math.round(numeric * 10) / 10;
  if (rounded === 0) return { text: '0 pp', direction: 'neutral' };
  const abs = Math.abs(rounded).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return rounded > 0
    ? { text: `+${abs} pp`, direction: 'up' }
    : { text: `−${abs} pp`, direction: 'down' };
};

const formatPrCount = (count) => (count === 1 ? t('controlTower.pulse.weekPr.countOne') : (t('controlTower.pulse.weekPr.countOther') || '').replace('{count}', String(count)));

/* ─── Band shell ────────────────────────────────────────────────────────── */

const ControlBand = ({ icon: Icon, label, className, children }) => (
  <div className={`control-band${className ? ` ${className}` : ''}`} aria-live="polite">
    <div className="control-band-overline">
      <Icon size={14} strokeWidth={2} aria-hidden="true" />
      <span>{label}</span>
    </div>
    <div className="control-band-tiles">{children}</div>
  </div>
);

ControlBand.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};

const ControlBandCalm = ({ icon: Icon, label, message }) => (
  <div className="control-band" aria-live="polite">
    <div className="control-band-overline">
      <Icon size={14} strokeWidth={2} aria-hidden="true" />
      <span>{label}</span>
    </div>
    <div className="control-band-calm">
      <CircleCheck size={18} strokeWidth={2} className="control-band-calm-icon" aria-hidden="true" />
      <span>{message}</span>
    </div>
  </div>
);

ControlBandCalm.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
};

/* ─── Radar band ────────────────────────────────────────────────────────── */

/**
 * Attention-by-exception: a metric only earns a tile when it is non-zero.
 * When all four counts are zero the band collapses to a single calm line —
 * "menos é mais" means the panel should visibly shrink when there is
 * nothing to act on, not fill the row with muted zero tiles.
 */
const RadarBand = ({ plans, routines }) => {
  const allZero = plans.expiredCount === 0 && plans.renewingSoonCount === 0
    && routines.expiredCount === 0 && routines.expiringSoonCount === 0;

  if (allZero) {
    return (
      <ControlBandCalm
        icon={Radar}
        label={t('controlTower.radar.label')}
        message={t('controlTower.radar.calmMessage')}
      />
    );
  }

  return (
    <ControlBand icon={Radar} label={t('controlTower.radar.label')}>
      {plans.expiredCount > 0 && (
        <ControlTile
          label={t('controlTower.radar.expiredPlans.label')}
          value={plans.expiredCount}
          subcue={t('controlTower.radar.expiredPlans.subcue')}
          severity="critical"
          to="/trainer/students?status=vencido"
          ariaLabel={(t('controlTower.radar.expiredPlans.ariaLabel') || '').replace('{count}', String(plans.expiredCount))}
        />
      )}
      {plans.renewingSoonCount > 0 && (
        <ControlTile
          label={t('controlTower.radar.renewingSoon.label')}
          value={plans.renewingSoonCount}
          subcue={t('controlTower.radar.renewingSoon.subcue')}
          severity="warn"
          to="/trainer/students?status=pendente"
          ariaLabel={(t('controlTower.radar.renewingSoon.ariaLabel') || '').replace('{count}', String(plans.renewingSoonCount))}
        />
      )}
      {routines.expiredCount > 0 && (
        <ControlTile
          label={t('controlTower.radar.expiredRoutines.label')}
          value={routines.expiredCount}
          subcue={t('controlTower.radar.expiredRoutines.subcue')}
          severity="critical"
        />
      )}
      {routines.expiringSoonCount > 0 && (
        <ControlTile
          label={t('controlTower.radar.routinesExpiringSoon.label')}
          value={routines.expiringSoonCount}
          subcue={t('controlTower.radar.routinesExpiringSoon.subcue')}
          severity="warn"
        />
      )}
    </ControlBand>
  );
};

RadarBand.propTypes = {
  plans: PropTypes.shape({
    expiredCount: PropTypes.number.isRequired,
    renewingSoonCount: PropTypes.number.isRequired,
  }).isRequired,
  routines: PropTypes.shape({
    expiredCount: PropTypes.number.isRequired,
    expiringSoonCount: PropTypes.number.isRequired,
  }).isRequired,
};

/* ─── Financeiro band ───────────────────────────────────────────────────── */

const overdueSubcue = (stale, amount) => (stale
  ? t('controlTower.finance.overdue.subcueStale')
  : (t('controlTower.finance.overdue.subcueAmount') || '').replace('{amount}', formatCurrencyBRL(amount)));

const FinanceiroBand = ({ finance, generatedAt, onRetry }) => {
  const stale = isFinanceStale(generatedAt);
  const hasOverdue = finance.overdueCount > 0;

  return (
    <ControlBand icon={Wallet} label={t('controlTower.finance.label')} className="control-band--finance">
      <ControlTile
        label={t('controlTower.finance.monthReceived')}
        value={formatCurrencyCompactBRL(finance.monthReceived)}
        severity="neutral"
        size="protagonist"
        dimmed={stale}
        className="control-tile--finance-hero"
      />
      <ControlTile
        label={t('controlTower.finance.totalReceived')}
        value={formatCurrencyCompactBRL(finance.totalReceived)}
        severity="neutral"
        dimmed={stale}
      />
      {hasOverdue && (
        <ControlTile
          label={t('controlTower.finance.overdue.label')}
          value={finance.overdueCount}
          subcue={overdueSubcue(stale, finance.overdueAmount)}
          severity="critical"
          dimmed={stale}
          to={!stale ? '/trainer/financeiro' : undefined}
          onAction={stale ? onRetry : undefined}
          ariaLabel={(t('controlTower.finance.overdue.ariaLabel') || '').replace('{count}', String(finance.overdueCount))}
        />
      )}
    </ControlBand>
  );
};

FinanceiroBand.propTypes = {
  finance: PropTypes.shape({
    monthReceived: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    totalReceived: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    overdueCount: PropTypes.number.isRequired,
    overdueAmount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  }).isRequired,
  generatedAt: PropTypes.string.isRequired,
  onRetry: PropTypes.func.isRequired,
};

/* ─── Pulso band ────────────────────────────────────────────────────────── */

const PulsoBand = ({ engagement }) => {
  const hasInactive = engagement.inactiveStudentsCount > 0;
  const delta = formatAdherenceDeltaPp(engagement.adherenceDeltaPp);
  const prCount = engagement.weekPrCount;

  return (
    <ControlBand icon={Activity} label={t('controlTower.pulse.label')}>
      <ControlTile
        label={t('controlTower.pulse.inactiveStudents.label')}
        value={engagement.inactiveStudentsCount}
        subcue={hasInactive ? t('controlTower.pulse.inactiveStudents.subcue') : undefined}
        severity={hasInactive ? 'warn' : 'neutral'}
        icon={Users}
        to={hasInactive ? '/trainer/students' : undefined}
        ariaLabel={(t('controlTower.pulse.inactiveStudents.ariaLabel') || '').replace('{count}', String(engagement.inactiveStudentsCount))}
      />
      <ControlTile severity="neutral">
        <StatDisplay
          className="control-tile-adherence"
          value={formatAdherencePct(engagement.adherenceMonthPct)}
          unit="%"
          label={t('controlTower.pulse.adherenceMonth')}
          trend={delta?.text}
          trendDirection={delta?.direction}
        />
      </ControlTile>
      {prCount > 0 ? (
        <ControlTile
          label={t('controlTower.pulse.weekPr.label')}
          value={formatPrCount(prCount)}
          severity="celebration"
        />
      ) : (
        <ControlTile
          label={t('controlTower.pulse.weekPr.label')}
          value={t('controlTower.pulse.weekPr.empty')}
          severity="neutral"
          valueFamily="message"
        />
      )}
    </ControlBand>
  );
};

PulsoBand.propTypes = {
  engagement: PropTypes.shape({
    inactiveStudentsCount: PropTypes.number.isRequired,
    adherenceMonthPct: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    adherenceDeltaPp: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    weekPrCount: PropTypes.number.isRequired,
  }).isRequired,
};

/* ─── Skeleton & retry states ───────────────────────────────────────────── */

const ControlBandSkeleton = ({ icon: Icon, label, tiles }) => (
  <div className="control-band">
    <div className="control-band-overline">
      <Icon size={14} strokeWidth={2} aria-hidden="true" />
      <span>{label}</span>
    </div>
    <div className="control-band-tiles">
      {Array.from({ length: tiles }, (_, i) => (
        <div key={i} className="skeleton control-tile-skeleton" />
      ))}
    </div>
  </div>
);

ControlBandSkeleton.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  tiles: PropTypes.number.isRequired,
};

const ControlTowerSkeleton = () => (
  <div aria-busy="true" aria-label={t('controlTower.loadingAria')}>
    <ControlBandSkeleton icon={Radar} label={t('controlTower.radar.label')} tiles={4} />
    <ControlBandSkeleton icon={Wallet} label={t('controlTower.finance.label')} tiles={3} />
    <ControlBandSkeleton icon={Activity} label={t('controlTower.pulse.label')} tiles={3} />
  </div>
);

const ControlTowerRetry = ({ message, onRetry }) => (
  <div className="control-tower-retry-row">
    <span className="text-sm text-steel">{message}</span>
    <button type="button" className="control-tower-retry" onClick={onRetry}>
      {t('controlTower.retryButton')}
    </button>
  </div>
);

ControlTowerRetry.propTypes = {
  message: PropTypes.string.isRequired,
  onRetry: PropTypes.func.isRequired,
};

/* ─── ControlTower ──────────────────────────────────────────────────────── */

/**
 * "Tua semana em foco" — the trainer Home attention panel. A single card
 * surface with three bands (Radar / Financeiro / Pulso) fed by one data
 * source (useTrainerDashboard / GET /trainer/dashboard). Each band renders
 * its pendências as a responsive tile-card grid; attention-by-exception
 * means Radar and the Financeiro "em atraso" tile disappear entirely when
 * their count is zero, so the panel visibly shrinks when the week is calm.
 */
const ControlTower = ({ data, loading, error, onRetry }) => {
  const isCacheMiss = data === null;
  const showSkeleton = isCacheMiss && loading;
  const showRetry = isCacheMiss && !loading && error;
  const showData = !isCacheMiss;
  const timestamp = showData ? formatRelativeTime(data.generatedAt) : null;

  const title = t('controlTower.title');
  const updatedText = timestamp ? (t('controlTower.updatedPrefix') || '').replace('{timestamp}', timestamp) : null;
  const retryMessage = typeof error === 'string' && error ? error : t('controlTower.retryFallback');

  return (
    <section className="control-tower" aria-label={title}>
      <div className="control-tower-header">
        <h2 className="control-tower-title">{title}</h2>
        {updatedText && <span className="control-tower-timestamp">{updatedText}</span>}
      </div>

      {showSkeleton && <ControlTowerSkeleton />}
      {showRetry && <ControlTowerRetry message={retryMessage} onRetry={onRetry} />}

      {showData && (
        <>
          <RadarBand plans={data.plans} routines={data.routines} />
          <FinanceiroBand finance={data.finance} generatedAt={data.generatedAt} onRetry={onRetry} />
          <PulsoBand engagement={data.engagement} />
        </>
      )}
    </section>
  );
};

ControlTower.propTypes = {
  data: PropTypes.shape({
    plans: PropTypes.object,
    routines: PropTypes.object,
    finance: PropTypes.object,
    engagement: PropTypes.object,
    generatedAt: PropTypes.string,
  }),
  loading: PropTypes.bool,
  error: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  onRetry: PropTypes.func.isRequired,
};

export default ControlTower;
