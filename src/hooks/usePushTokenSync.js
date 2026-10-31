import { useEffect } from 'react';
import { isNative, push } from '../platform';
import { useAuth } from '../contexts/AuthContext';
import { registerDevice, registerDeviceToken, shouldRetryRegistration } from '../utils/deviceRegistration';

// Keeps the server's device token current (native, signed in): re-posts rotated FCM tokens and retries a failed registration when the app returns to the foreground.
const usePushTokenSync = () => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isNative() || !isAuthenticated) return undefined;
    let unsubscribe = null;
    let cancelled = false;

    push.onTokenReceived((token) => {
      registerDeviceToken(token).catch((error) => console.error('[push] token refresh not registered:', error));
    }).then((dispose) => {
      if (cancelled) dispose();
      else unsubscribe = dispose;
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && shouldRetryRegistration()) registerDevice();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      unsubscribe?.();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated]);
};

export default usePushTokenSync;
