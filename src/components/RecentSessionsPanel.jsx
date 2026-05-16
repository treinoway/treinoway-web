import PropTypes from 'prop-types';
import { ArrowRight } from 'lucide-react';
import SessionInstrumentRow from './SessionInstrumentRow';
import formatRpe from '../utils/formatRpe';

const RecentSessionsSkeleton = () => (
  <div className="activity-section-skeleton" aria-hidden="true">
    <div className="skeleton skeleton-title" />
    <div className="skeleton skeleton-card" />
    <div className="skeleton skeleton-card" />
    <div className="skeleton skeleton-card" />
  </div>
);

const BlockErrorState = ({ onRetry }) => (
  <div className="activity-block-error" role="alert">
    <p>Falha ao carregar sessões</p>
    <button type="button" className="btn-secondary btn-sm" onClick={onRetry}>
      Tentar novamente
    </button>
  </div>
);

BlockErrorState.propTypes = { onRetry: PropTypes.func.isRequired };

const RecentSessionsPanel = ({
  sessions,
  loading,
  error,
  onViewAll,
  onRetry,
  onOpen,
}) => {
  if (loading && sessions.length === 0 && !error) {
    return (
      <div className="cockpit-section">
        <RecentSessionsSkeleton />
      </div>
    );
  }

  if (error && sessions.length === 0) {
    return (
      <div className="cockpit-section">
        <BlockErrorState onRetry={onRetry} />
      </div>
    );
  }

  if (sessions.length === 0) return null;

  return (
    <div className="cockpit-section scan-zone-panel" aria-labelledby="cockpit-recent-heading">
      <header className="cockpit-section-header">
        <h2 id="cockpit-recent-heading" className="cockpit-section-eyebrow">
          Sessões recentes
        </h2>
        <button
          type="button"
          className="cockpit-section-link"
          onClick={onViewAll}
          aria-label="Ver todas as sessões"
        >
          Ver todas
          <ArrowRight size={12} strokeWidth={2} aria-hidden="true" />
        </button>
      </header>

      <div className="scan-zone-stack">
        {sessions.map((session) => {
          const total = (session.completedSets ?? 0) + (session.skippedSets ?? 0);
          const metaText =
            session.completedSets != null && total > 0
              ? `${session.completedSets} de ${total} séries`
              : null;
          const rpeFormatted = formatRpe(session.averageRpe ?? null);
          const rpeText = rpeFormatted ? rpeFormatted.replace('RPE ', '') : null;
          return (
            <SessionInstrumentRow
              key={session.id}
              status={session.status}
              date={session.startedAt ? session.startedAt.slice(0, 10) : null}
              sessionName={session.trainingName ?? 'Treino'}
              metaText={metaText}
              noteText={session.trainerNote ?? null}
              rpeText={rpeText}
              onClick={onOpen ? () => onOpen(session) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
};

RecentSessionsPanel.propTypes = {
  sessions: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.any,
  onViewAll: PropTypes.func.isRequired,
  onRetry: PropTypes.func.isRequired,
  onOpen: PropTypes.func,
};

export default RecentSessionsPanel;
