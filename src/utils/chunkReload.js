const RELOAD_KEY = 'treinoway.chunkReloadAt';
const RELOAD_COOLDOWN_MS = 10000;
const STALE_CHUNK_MESSAGE = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError|Unable to preload CSS/i;

// Tells whether an error means a lazily loaded chunk no longer exists (typical right after a deploy).
export function isStaleChunkError(error) {
  return STALE_CHUNK_MESSAGE.test(String(error?.message ?? error ?? ''));
}

// Reloads the page once to pick up the new deploy; returns false (and does nothing) when it already reloaded in the last seconds, so a broken deploy cannot loop.
export function reloadForStaleChunk() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

// Listens to Vite's preload failure event and recovers with a guarded reload; returns the disposer.
export function installPreloadErrorHandler() {
  const handlePreloadError = (event) => {
    if (reloadForStaleChunk()) event.preventDefault();
  };
  window.addEventListener('vite:preloadError', handlePreloadError);
  return () => window.removeEventListener('vite:preloadError', handlePreloadError);
}
