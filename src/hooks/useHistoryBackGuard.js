import { useEffect } from 'react';

// Position of the current entry in the session history as React Router stores it (0 when unknown)
const historyIndex = () => window.history.state?.idx ?? 0;

// Moves the session history by `delta` entries, doing nothing for 0 (go(0) would reload the page)
const moveHistory = (delta) => {
  if (delta !== 0) window.history.go(delta);
};

// While `active`, swallows browser Back/forward before the router sees it, restores the entry and hands `proceed` to `onIntercept`
const useHistoryBackGuard = (active, onIntercept) => {
  useEffect(() => {
    if (!active) return undefined;
    let index = historyIndex();
    let pendingDelta = null;
    let restoring = false;
    let released = false;
    const proceed = () => {
      released = true;
      moveHistory(pendingDelta);
    };
    const handlePopState = (event) => {
      if (released) return;
      event.stopImmediatePropagation();
      if (restoring) {
        restoring = false;
        return;
      }
      pendingDelta = historyIndex() - index;
      restoring = pendingDelta !== 0;
      moveHistory(-pendingDelta);
      onIntercept(proceed);
    };
    // why: capture on window runs before the router's own popstate listener, so the router never sees the navigation
    window.addEventListener('popstate', handlePopState, true);
    return () => window.removeEventListener('popstate', handlePopState, true);
  }, [active, onIntercept]);
};

export default useHistoryBackGuard;
