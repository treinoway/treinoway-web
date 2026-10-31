import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isNative, push } from '../platform';
import { useAuth } from '../contexts/AuthContext';
import { registerDevice } from '../utils/deviceRegistration';

// Maps the data payload of a push notification to the screen it should open, or null when unknown.
export function resolveNotificationRoute(data) {
  if (data?.type === 'workout_completed' && data.studentId && data.sessionId) {
    return `/trainer/students/${data.studentId}/sessions/${data.sessionId}`;
  }
  if (data?.type === 'anamnesis_submitted' && data.studentId && data.anamnesisId) {
    return `/trainer/students/${data.studentId}/anamneses/${data.anamnesisId}/response`;
  }
  return null;
}

// Registers the device for push once signed in and opens the right screen when a notification is tapped (native only).
const usePushRegistration = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNative() || !isAuthenticated) return undefined;
    registerDevice();
    return undefined;
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isNative()) return undefined;
    let unsubscribe = null;
    let cancelled = false;
    push.onNotificationOpened((data) => {
      const route = resolveNotificationRoute(data);
      if (route) navigate(route);
    }).then((dispose) => {
      if (cancelled) dispose();
      else unsubscribe = dispose;
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [navigate]);
};

export default usePushRegistration;
