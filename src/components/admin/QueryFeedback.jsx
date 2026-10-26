import PropTypes from 'prop-types';
import { CircleAlert } from 'lucide-react';
import EmptyBlock from '../ds/EmptyBlock';

// Loading and error states of an admin query; renders nothing once the data is ready.
const QueryFeedback = ({ loading, error, loadingLabel, errorTitle, retryLabel, onRetry }) => {
  if (loading) {
    return (
      <div className="loading-screen loading-screen--inline">
        <span className="loading-text type-body">{loadingLabel}</span>
      </div>
    );
  }
  if (error) {
    return (
      <EmptyBlock icon={CircleAlert} role="alert" title={errorTitle} actionLabel={retryLabel} onAction={onRetry} />
    );
  }
  return null;
};

QueryFeedback.propTypes = {
  loading: PropTypes.bool.isRequired,
  error: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]),
  loadingLabel: PropTypes.string.isRequired,
  errorTitle: PropTypes.string.isRequired,
  retryLabel: PropTypes.string.isRequired,
  onRetry: PropTypes.func.isRequired,
};

export default QueryFeedback;
