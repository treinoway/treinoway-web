import PropTypes from 'prop-types';
import Badge from './ds/Badge';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Format durationSeconds → "58min" or "1h 29min".
 */
const formatDuration = (seconds) => {
  if (seconds == null) return null;
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}min`;
  const hours = Math.floor(totalMinutes / 60);
  const rest = totalMinutes % 60;
  return rest > 0 ? `${hours}h ${rest}min` : `${hours}h`;
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
 * Format the session date line → "Segunda-feira, 18 de agosto de 2025 · 05h46 — 07h15".
 */
const formatHeroDate = (startedAt, finishedAt) => {
  if (!startedAt) return '-';
  const d = new Date(startedAt);
  if (isNaN(d.getTime())) return '-';
  const dow = d.toLocaleDateString('pt-BR', { weekday: 'long' });
  const dowCapital = dow.charAt(0).toUpperCase() + dow.slice(1);
  const day = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  const start = formatTime(startedAt);
  const end = formatTime(finishedAt);
  const range = [start, end].filter(Boolean).join(' — ');
  const date = `${dowCapital}, ${day}`;
  return range ? `${date} · ${range}` : date;
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
  completed: { tone: 'success', label: 'Concluído' },
  partial: { tone: 'warning', label: 'Parcial' },
  abandoned: { tone: 'error', label: 'Abandonado' },
};

const KpiBlock = ({ label, value, support, muted }) => (
  <div className="kpi">
    <span className="kpi-label type-overline">{label}</span>
    <span className={`kpi-value session-hero__kpi-value type-h2${muted ? ' kpi-value--muted' : ''}`}>
      {value}
    </span>
    <span className="kpi-support type-caption">{support}</span>
  </div>
);

KpiBlock.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  support: PropTypes.string.isRequired,
  muted: PropTypes.bool,
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Hero section card for the Session Detail page: status, date, title, meta and KPIs.
 *
 * @param {object} props
 * @param {object} props.session - Full session object from API
 */
const SessionDetailHero = ({ session }) => {
  const training = session.training ?? {};
  const exerciseLogs = session.exerciseLogs ?? [];

  const statusConfig = STATUS_CONFIG[resolveStatus(session)];
  const { totalVolume, completedSets, totalSets, avgRpe } = computeKpis(exerciseLogs);

  const startTime = formatTime(session.startedAt);
  const endTime = formatTime(session.finishedAt);
  const durationValue = formatDuration(session.durationSeconds);
  const durationSupport = startTime && endTime ? `Início ${startTime} · Fim ${endTime}` : 'Duração da sessão';
  const seriesSupport =
    totalSets > 0 ? `${Math.round((completedSets / totalSets) * 100)}% completas` : 'Séries registradas';

  const exerciseCount = exerciseLogs.length;
  const metaLabel = `${exerciseCount} exercício${exerciseCount !== 1 ? 's' : ''} · ${totalSets} séries`;

  return (
    <section className="section-card session-hero" aria-label="Resumo da sessão">
      <div className="session-hero__eyebrow">
        <Badge tone={statusConfig.tone}>{statusConfig.label}</Badge>
        <span className="type-body session-hero__date">
          {formatHeroDate(session.startedAt, session.finishedAt)}
        </span>
      </div>

      <h1 className="type-h1 session-hero__title">{training.name ?? '-'}</h1>

      <div className="session-hero__meta">
        {training.category && (
          <Badge tone="neutral" variant="tag">{training.category}</Badge>
        )}
        {exerciseCount > 0 && <span className="type-body session-hero__meta-text">{metaLabel}</span>}
      </div>

      <div className="session-hero__kpis" role="group" aria-label="Indicadores da sessão">
        <KpiBlock
          label="Duração"
          value={durationValue ?? '—'}
          support={durationSupport}
          muted={!durationValue}
        />
        <KpiBlock
          label="Volume total"
          value={totalVolume > 0 ? `${totalVolume.toLocaleString('pt-BR')} kg` : '—'}
          support="Soma total de carga"
          muted={totalVolume <= 0}
        />
        <KpiBlock
          label="Séries"
          value={totalSets > 0 ? `${completedSets}/${totalSets}` : String(completedSets)}
          support={seriesSupport}
        />
        <KpiBlock
          label="RPE médio"
          value={avgRpe ?? '—'}
          support={avgRpe ? 'Média das séries completas' : 'Nenhum RPE registrado'}
          muted={!avgRpe}
        />
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
