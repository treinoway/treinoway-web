/**
 * Returns the pt-BR time-of-day greeting prefix for the Dashboard hero,
 * based on the LOCAL hour of the given (or current) date.
 *
 * Boundaries:
 *  - 05:00–11:59 → "Bom dia"
 *  - 12:00–17:59 → "Boa tarde"
 *  - 18:00–04:59 → "Boa noite"
 *
 * @param {Date} [date] — injected for tests; defaults to "now".
 * @returns {string}
 */
const getGreeting = (date = new Date()) => {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

export default getGreeting;
