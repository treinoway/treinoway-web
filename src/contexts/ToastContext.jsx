import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { onNetworkError } from '../api/axios';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

const ToastContainer = ({ toasts, onDismiss }) => (
  <div className="toast-container" role="status" aria-live="polite">
    {toasts.map(toast => (
      <div key={toast.id} className={`toast toast-${toast.type}`}>
        <span>{toast.message}</span>
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

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'error') => {
    const id = Date.now();
    const duration = type === 'error' ? 5000 : 3000;

    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
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
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};
