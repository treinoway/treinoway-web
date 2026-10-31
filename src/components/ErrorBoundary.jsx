import { Component } from 'react';
import PropTypes from 'prop-types';
import * as Sentry from '@sentry/react';
import { isSentryEnabled } from '../lib/sentry';
import { isStaleChunkError, reloadForStaleChunk } from '../utils/chunkReload';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (isStaleChunkError(error) && reloadForStaleChunk()) return;
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Capture render-time crashes (no-op when DSN is unset).
    if (isSentryEnabled) {
      Sentry.captureException(error, {
        contexts: { react: { componentStack: errorInfo?.componentStack } },
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>Algo deu errado</h1>
          <p>Ocorreu um erro inesperado. Tente recarregar a página.</p>
          <button
            className="btn-primary"
            onClick={() => window.location.reload()}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ErrorBoundary;
