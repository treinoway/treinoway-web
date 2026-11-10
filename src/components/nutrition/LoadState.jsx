import PropTypes from 'prop-types';
import Banner from '../ds/Banner';

// Loading and error states of a whole-resource fetch; renders children once it is ready.
const LoadState = ({ loading, error, onRetry, children }) => {
  if (loading) return <div className="loading-screen loading-screen--inline">Carregando...</div>;
  if (error) {
    return (
      <Banner
        tone="error"
        action={<button type="button" className="btn btn--secondary" onClick={onRetry}>Tentar novamente</button>}
      >
        {error}
      </Banner>
    );
  }
  return children;
};

LoadState.propTypes = {
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  onRetry: PropTypes.func.isRequired,
  children: PropTypes.node,
};

export default LoadState;
