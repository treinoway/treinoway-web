import { useCallback, useEffect, useState } from 'react';
import { EMAIL_VERIFICATION_REQUIRED_EVENT } from '../constants/emailVerification';

// Opens the e-mail confirmation prompt when the API layer announces a blocked request.
const useEmailVerificationPrompt = () => {
  const [prompt, setPrompt] = useState(null);

  useEffect(() => {
    const handleRequired = (event) => setPrompt({ reason: event.detail?.reason });
    window.addEventListener(EMAIL_VERIFICATION_REQUIRED_EVENT, handleRequired);
    return () => window.removeEventListener(EMAIL_VERIFICATION_REQUIRED_EVENT, handleRequired);
  }, []);

  const closePrompt = useCallback(() => setPrompt(null), []);

  return { prompt, closePrompt };
};

export default useEmailVerificationPrompt;
