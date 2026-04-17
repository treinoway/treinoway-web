/**
 * Analytics no-op tracker.
 *
 * This is a placeholder wiring point until an analytics provider is chosen.
 * All callers use the same signature so we can swap this implementation later
 * without touching feature code.
 */
export function track(event, properties) {
  if (typeof event !== 'string' || event.length === 0) return;
  // Intentional no-op. Wire to a real provider here when needed.
  if (import.meta.env?.DEV) {
    console.debug('[analytics]', event, properties || {});
  }
}

export default track;
