import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GOOGLE_CREDENTIAL_CONFLICT,
  GOOGLE_CREDENTIAL_CONFLICT_MESSAGE,
  GOOGLE_UNEXPECTED_ERROR_MESSAGE,
} from '../constants/googleAuth';

const toDisplayMessage = (error) => (
  String(error).includes(GOOGLE_CREDENTIAL_CONFLICT) ? GOOGLE_CREDENTIAL_CONFLICT_MESSAGE : error
);

// Google sign-in in two phases. While the popup is open nothing on the page
// is locked or relabelled (the popup is the feedback): Firebase can take a long time (or
// forever) to report a closed popup. Only once the popup returned a credential
// (`isExchanging`) is the backend exchange in flight and the page busy.
const useGoogleAuth = ({ loginWithGoogle, loginHint, onSuccess, onError }) => {
  const [isExchanging, setIsExchanging] = useState(false);
  const latestRequestRef = useRef(0);

  useEffect(() => () => {
    latestRequestRef.current += 1;
  }, []);

  const startGoogleAuth = useCallback(async () => {
    latestRequestRef.current += 1;
    const requestId = latestRequestRef.current;
    const isStale = () => requestId !== latestRequestRef.current;

    setIsExchanging(false);

    try {
      const options = {
        onPopupResolved: () => {
          if (isStale()) return;
          setIsExchanging(true);
        },
      };
      if (loginHint) options.loginHint = loginHint;
      const result = await loginWithGoogle(options);
      if (isStale()) return;

      if (result.success) {
        onSuccess(result.user);
        return;
      }
      setIsExchanging(false);
      if (result.error) onError(toDisplayMessage(result.error));
    } catch {
      if (isStale()) return;
      setIsExchanging(false);
      onError(GOOGLE_UNEXPECTED_ERROR_MESSAGE);
    }
  }, [loginWithGoogle, loginHint, onSuccess, onError]);

  return { startGoogleAuth, isExchanging };
};

export default useGoogleAuth;
