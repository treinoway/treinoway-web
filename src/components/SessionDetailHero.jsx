import PropTypes from 'prop-types';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Format durationSeconds → "58 min" or "1h 12min".
 */
const formatDuration = (seconds) => {
  if (seconds == null) return null;
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m}`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}` : `${h}h`;
};

const formatDurationUnit = (seconds) => {
  if (seconds == null) return null;
  const m = Math.round(seconds / 60);
  return m < 60 ? 'min' : 'min';
};

/**
 * Format an ISO timestamp → "18h32".
 */
const formatTime = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
};

/**
 * Format an ISO timestamp → "Quinta · 13 Maio 2026 · 18h32".
 */
const formatHeroDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const dow = d.toLocaleDateString('pt-BR', { weekday: 'long' });
  const dowCapital = dow.charAt(0).toUpperCase() + dow.slice(1);
  const day = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const time = formatTime(iso);
  return time ? `${dowCapital} · ${day} · ${time}` : `${dowCapital} · ${day}`;
};

/**
 * Compute volume, series, and RPE KPIs from exerciseLogs.
 *
 * @returns {{ totalVolume, completedSets, totalSets, avgRpe }}
 */
const computeKpis = (exerciseLogs) => {
  let totalVolume = 0;
  let completedSets = 0;
  let totalSets = 0;
  let rpeSum = 0;
  let rpeCount = 0;

  for (const log of exerciseLogs) {
    const planned = log.exercise?.sets;
    // Only count exercises that have a prescribed number of sets.
    // SetLogs are created on demand, so falling back to setLogs.length would
    // always make total == completed and never reflect unstarted sets.
    if (planned == null) continue;

    totalSets += planned;

    for (const s of log.setLogs ?? []) {
      if (s.completed) {
        completedSets += 1;
        if (s.load != null && s.repetitions != null) {
          totalVolume += s.load * s.repetitions;
        }
        if (s.rpe != null) {
          rpeSum += s.rpe;
          rpeCount += 1;
        }
      }
    }
  }

  const avgRpe = rpeCount > 0 ? (rpeSum / rpeCount).toFixed(1) : null;
  return {
    totalVolume: Math.round(totalVolume),
    completedSets,
    totalSets,
    avgRpe,
  };
};

/**
 * Determine display status from session data.
 * Returns: 'completed' | 'partial' | 'abandoned'
 */
const resolveStatus = (session) => {
  if (session.status === 'abandoned') return 'abandoned';
  const logs = session.exerciseLogs ?? [];
  const allComplete = logs.length > 0 && logs.every((log) => {
    const sets = log.setLogs ?? [];
    return sets.length > 0 && sets.every((s) => s.completed);
  });
  return allComplete ? 'completed' : 'partial';
};

const STATUS_CONFIG = {
  completed: {
    dotClass: 'session-hero-status-dot',
    labelClass: 'session-hero-status-label--ok',
    label: 'Concluído',
  },
  partial: {
    dotClass: 'session-hero-status-dot',
    labelClass: 'session-hero-status-label--ok',
    label: 'Parcial',
  },
  abandoned: {
    dotClass: 'session-hero-status-dot session-hero-status-dot--abandoned',
    labelClass: 'session-hero-status-label--abandoned',
    label: 'Abandonado',
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Stadium hero for the Session Detail page.
 *
 * @param {object}   props
 * @param {object}   props.session         - Full session object from API
 */
const SessionDetailHero = ({ session }) => {
  const training = session.training ?? {};
  const exerciseLogs = session.exerciseLogs ?? [];

  const displayStatus = resolveStatus(session);
  const statusConfig = STATUS_CONFIG[displayStatus];

  const { totalVolume, completedSets, totalSets, avgRpe } = computeKpis(exerciseLogs);

  const heroDateLabel = formatHeroDate(session.startedAt);
  const durationValue = formatDuration(session.durationSeconds);
  const durationUnit = formatDurationUnit(session.durationSeconds);
  const startTime = formatTime(session.startedAt);
  const endTime = formatTime(session.finishedAt);

  const durationTrend =
    startTime && endTime ? `início ${startTime} · fim ${endTime}` : null;

  const seriesTrend =
    totalSets > 0
      ? `${Math.round((completedSets / totalSets) * 100)}% completas`
      : null;

  const exerciseCount = exerciseLogs.length;
  const setCountLabel = `${totalSets} séries`;

  return (
    <section className="theme-stadium session-hero" aria-label="Resumo da sessão">
      {/* Eyebrow: status dot + label + date */}
      <div className="session-hero-eyebrow">
        <span className={statusConfig.dotClass} aria-hidden="true" />
        <span className={statusConfig.labelClass}>{statusConfig.label}</span>
        <span className="session-hero-eyebrow-sep" aria-hidden="true">·</span>
        <span>{heroDateLabel}</span>
      </div>

      {/* Title */}
      <h1 className="session-hero-title">{training.name ?? '—'}</h1>

      {/* Subtitle */}
      <div className="session-hero-subtitle">
        {training.category ?? null}
        {exerciseCount > 0 && (
          <>
            <span className="session-hero-subtitle-sep" aria-hidden="true">·</span>
            {exerciseCount} exercício{exerciseCount !== 1 ? 's' : ''}
            <span className="session-hero-subtitle-sep" aria-hidden="true">·</span>
            {setCountLabel}
          </>
        )}
      </div>

      {/* KPI grid */}
      <div className="session-hero-stats" aria-label="Indicadores da sessão">
        {/* Duração */}
        <div className="session-hero-stat-display">
          <span className="session-hero-stat-label">Duração</span>
          <span className="session-hero-stat-value">
            {durationValue ?? '—'}
            {durationUnit && durationValue && (
              <span className="session-hero-stat-unit">{durationUnit}</span>
            )}
          </span>
          {durationTrend && (
            <span className="session-hero-stat-trend">{durationTrend}</span>
          )}
        </div>

        {/* Volume */}
        <div className="session-hero-stat-display">
          <span className="session-hero-stat-label">Volume total</span>
          <span className="session-hero-stat-value">
            {totalVolume > 0 ? totalVolume.toLocaleString('pt-BR') : '—'}
            {totalVolume > 0 && (
              <span className="session-hero-stat-unit">kg</span>
            )}
          </span>
        </div>

        {/* Séries */}
        <div className="session-hero-stat-display">
          <span className="session-hero-stat-label">Séries</span>
          <span className="session-hero-stat-value">
            {completedSets}
            {totalSets > 0 && (
              <span className="session-hero-stat-unit">/{totalSets}</span>
            )}
          </span>
          {seriesTrend && (
            <span className="session-hero-stat-trend">{seriesTrend}</span>
          )}
        </div>

        {/* RPE médio */}
        <div className="session-hero-stat-display">
          <span className="session-hero-stat-label">RPE médio</span>
          <span className="session-hero-stat-value">
            {avgRpe ?? '—'}
          </span>
        </div>
      </div>

    </section>
  );
};

SessionDetailHero.propTypes = {
  session: PropTypes.shape({
    status: PropTypes.string,
    startedAt: PropTypes.string,
    finishedAt: PropTypes.string,
    durationSeconds: PropTypes.number,
    training: PropTypes.shape({
      name: PropTypes.string,
      category: PropTypes.string,
    }),
    exerciseLogs: PropTypes.array,
  }).isRequired,
};

export default SessionDetailHero;
