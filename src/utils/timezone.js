/**
 * Returns the browser's IANA timezone string (e.g. "America/Sao_Paulo")
 * or null when the runtime cannot resolve it (junk Intl, sandboxed env, etc).
 *
 * Per the v2 design: resolved per-request, never cached. The microsecond cost
 * keeps the trainer-driving-between-timezones case correct.
 */
export const getDeviceTimezone = () => {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof timezone === 'string' && timezone.length > 0) {
      return timezone;
    }
    return null;
  } catch {
    return null;
  }
};
