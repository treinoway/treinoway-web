import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { onNetworkError } from '../api/axios';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

const ToastContainer = ({ toasts, onDismiss, onActionClick }) => (
  <div className="toast-container" role="status" aria-live="polite">
    {toasts.map(toast => (
      <div key={toast.id} className={`toast toast-${toast.type}`}>
        <span>{toast.message}</span>
        {toast.actionLabel && (
          <button
            type="button"
            className="toast-action"
            onClick={() => onActionClick(toast.id)}
          >
            {toast.actionLabel}
          </button>
        )}
        <button
          className="toast-close"
          onClick={() => onDismiss(toast.id)}
          aria-label="Fechar notificação"
        >
          &times;
        </button>
      </div>
    ))}
  </div>
);

ToastContainer.propTypes = {
  toasts: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    message: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    actionLabel: PropTypes.string,
  })).isRequired,
  onDismiss: PropTypes.func.isRequired,
  onActionClick: PropTypes.func.isRequired,
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const actionsRef = useRef(new Map());

  const showToast = useCallback((message, type = 'error', options = {}) => {
    const id = Date.now() + Math.random();
    const defaultDuration = type === 'error' ? 5000 : 3000;
    const duration = options.duration ?? defaultDuration;

    const toast = {
      id,
      message,
      type,
      actionLabel: options.actionLabel || null,
    };

    if (options.actionLabel && typeof options.onAction === 'function') {
      actionsRef.current.set(id, options.onAction);
    }

    setToasts(prev => [...prev, toast]);

    setTimeout(() => {
      actionsRef.current.delete(id);
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id) => {
    actionsRef.current.delete(id);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleActionClick = useCallback((id) => {
    const handler = actionsRef.current.get(id);
    actionsRef.current.delete(id);
    setToasts(prev => prev.filter(t => t.id !== id));
    if (handler) handler();
  }, []);

  useEffect(() => {
    const unsubscribe = onNetworkError((message) => {
      showToast(message, 'error');
    });
    return unsubscribe;
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
        onActionClick={handleActionClick}
      />
    </ToastContext.Provider>
  );
};

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
