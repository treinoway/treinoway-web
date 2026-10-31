import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isNative, getPlatform, registerBackButton } from '../platform';

// React Router stores the position in the history stack in `history.state.idx`; above 0 there is an in-app screen to return to.
const hasInAppHistory = () => (window.history.state?.idx ?? 0) > 0;

// Wires the Android back button (native only): back one screen, minimize at the root.
const useBackButton = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNative() || getPlatform() !== 'android') return undefined;
    let dispose = null;
    let cancelled = false;
    registerBackButton({ goBack: () => navigate(-1), canGoBack: hasInAppHistory }).then((disposer) => {
      if (cancelled) disposer();
      else dispose = disposer;
    });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [navigate]);
};

export default useBackButton;
