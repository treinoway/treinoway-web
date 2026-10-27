import { useCallback, useSyncExternalStore } from 'react';

// Reads the current match state of a media query; false where matchMedia is unavailable.
const readMatch = (query) =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query).matches
    : false;

// Subscribes to a MediaQueryList (with the legacy addListener fallback) and returns the unsubscribe.
const subscribeToList = (mediaQueryList, handleChange) => {
  if (typeof mediaQueryList.addEventListener === 'function') {
    mediaQueryList.addEventListener('change', handleChange);
    return () => mediaQueryList.removeEventListener('change', handleChange);
  }
  mediaQueryList.addListener?.(handleChange);
  return () => mediaQueryList.removeListener?.(handleChange);
};

// Tracks whether a CSS media query currently matches; re-reads on subscribe so query changes are never stale.
const useMediaQuery = (query) => {
  const subscribe = useCallback(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      return subscribeToList(window.matchMedia(query), onChange);
    },
    [query]
  );
  return useSyncExternalStore(subscribe, () => readMatch(query), () => false);
};

export default useMediaQuery;
