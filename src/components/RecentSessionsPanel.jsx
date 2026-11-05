import PropTypes from 'prop-types';
import { ChevronRight } from 'lucide-react';
import SessionsList from './SessionsList';
import { td } from '../utils/studentCockpit';

/** "Sessões recentes": latest sessions in the period, from GET dashboard/recent-sessions. */
const RecentSessionsPanel = ({ sessions, loading, error, onViewAll, onRetry, onOpen }) => (
  <section className="section-card cockpit-card" aria-labelledby="cockpit-recent-heading">
    <header className="cockpit-card__header cockpit-card__header--action-slot">
      <h3 id="cockpit-recent-heading" className="cockpit-card__title type-h3">{td('sessions.title')}</h3>
      {sessions.length > 0 && (
        <button type="button" className="btn btn--ghost" onClick={onViewAll} aria-label={td('sessions.viewAllAria')}>
          {td('sessions.viewAll')}
          <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </header>
    <SessionsList sessions={sessions} loading={loading} error={error} onRetry={onRetry} onOpen={onOpen} />
  </section>
);

RecentSessionsPanel.propTypes = {
  sessions: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.any,
  onViewAll: PropTypes.func.isRequired,
  onRetry: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
};

export default RecentSessionsPanel;
