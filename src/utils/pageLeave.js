import { isNative, onAppBackground } from '../platform';

// Runs the handler whenever the page or app is about to be suspended: tab hidden, page hide, the native app going to the background, and (unless disabled) unload.
export function onPageLeave(handler, { includeUnload = true } = {}) {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') handler();
  };
  if (includeUnload) window.addEventListener('beforeunload', handler);
  window.addEventListener('pagehide', handler);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  let disposeNative = null;
  let disposed = false;
  if (isNative()) {
    onAppBackground(handler).then((dispose) => {
      if (disposed) dispose();
      else disposeNative = dispose;
    });
  }

  return () => {
    disposed = true;
    window.removeEventListener('beforeunload', handler);
    window.removeEventListener('pagehide', handler);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    disposeNative?.();
  };
}
