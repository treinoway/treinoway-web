import * as Sentry from '@sentry/react';

/**
 * Sentry integration — errors-only, env-gated for the closed beta.
 *
 * Activated only when `VITE_SENTRY_DSN` is set. When the DSN is absent every
 * helper here is a no-op, so local/dev runs never crash and never phone home.
 * No performance tracing and no session replay for now (sample rates = 0).
 */

const dsn = import.meta.env.VITE_SENTRY_DSN;

export const isSentryEnabled = Boolean(dsn);

export function initSentry() {
  if (!isSentryEnabled) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? 'beta',
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
  });
}

/**
 * Associate the current Sentry scope with a user id only — never email/PII.
 * Pass `null` to clear (logout).
 */
export function setSentryUser(id) {
  if (!isSentryEnabled) return;
  Sentry.setUser(id ? { id: String(id) } : null);
}

/**
 * Report a non-throwing data/config anomaly as a standalone Sentry event.
 *
 * `level` follows Sentry's severity scale — use `'warning'` for "this should
 * not happen but the app degraded gracefully" and `'error'` for a broken
 * deployment. Never pass PII (email, name) in `tags`/`extra`.
 */
export function captureAnomaly(message, { level = 'warning', tags = {}, extra = {} } = {}) {
  if (!isSentryEnabled) return;
  Sentry.captureMessage(message, { level, tags, extra });
}

/**
 * Pull a backend-issued request id out of an Axios error, if present.
 * The backend may expose it either via a response header or in the error body.
 * Returns `null` when none is available (current backend does not send one yet,
 * so this stays forward-compatible without fabricating a value).
 */
function extractRequestId(error) {
  const headers = error?.response?.headers;
  const headerId =
    headers?.['x-request-id'] ?? headers?.['x-requestid'] ?? headers?.['request-id'];
  if (headerId) return String(headerId);

  const bodyId = error?.response?.data?.requestId;
  return bodyId ? String(bodyId) : null;
}

/**
 * Report an UNEXPECTED Axios failure to Sentry: 5xx server responses and
 * network/transport errors. Expected 4xx business/validation errors are
 * intentionally skipped to keep the signal clean.
 */
export function reportApiError(error) {
  if (!isSentryEnabled) return;

  // Ignore intentionally-cancelled requests (AbortController / axios cancel).
  const isCancelled =
    error?.code === 'ERR_CANCELED' ||
    error?.name === 'CanceledError' ||
    error?.name === 'AbortError';
  if (isCancelled) return;

  const status = error?.response?.status;
  const isServerError = typeof status === 'number' && status >= 500;
  const isTransportError = !error?.response; // no response → network/transport failure

  if (!isServerError && !isTransportError) return;

  const config = error?.config ?? {};
  const route = config.url ?? 'unknown';
  const method = (config.method ?? 'unknown').toUpperCase();
  const requestId = extractRequestId(error);

  Sentry.captureException(error, {
    tags: {
      route,
      method,
      ...(status ? { status: String(status) } : { kind: 'network' }),
      ...(requestId ? { requestId } : {}),
    },
  });
}
