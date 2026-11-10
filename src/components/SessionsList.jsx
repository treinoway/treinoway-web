import PropTypes from 'prop-types';
import SessionItem from './SessionItem';
import SkeletonRows from './ds/SkeletonRows';
import { td } from '../utils/studentCockpit';

// Session rows with loading, error (retry) and empty states.
const SessionsList = ({ sessions, loading, error, onRetry, onOpen }) => {
  if (loading && sessions.length === 0 && !error) {
    return <SkeletonRows label={td('loading.sessions')} count={3} />;
  }
  if (error && sessions.length === 0) {
    return (
      <div className="cockpit-card__error" role="alert">
        <p className="type-body">{td('sessions.error')}</p>
        <button type="button" className="btn btn--secondary" onClick={onRetry}>{td('retry')}</button>
      </div>
    );
  }
  if (sessions.length === 0) {
    return <p className="cockpit-card__muted type-body">{td('sessions.empty')}</p>;
  }
  return (
    <ul className="session-items">
      {sessions.map((session) => <SessionItem key={session.id} session={session} onOpen={onOpen} />)}
    </ul>
  );
};

SessionsList.propTypes = {
  sessions: PropTypes.array.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.any,
  onRetry: PropTypes.func.isRequired,
  onOpen: PropTypes.func.isRequired,
};

export default SessionsList;
