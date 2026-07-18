const WEEKDAYS_PT_BR = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];

const MONTHS_PT_BR = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO',
];

/**
 * Formats the Dashboard hero eyebrow date label, e.g. "SEGUNDA, 14 DE JULHO".
 *
 * Returns null when the date is unavailable/invalid so the caller can omit
 * the eyebrow entirely instead of ever rendering "Invalid Date".
 *
 * @param {Date} [date] — injected for tests; defaults to "now".
 * @returns {string|null}
 */
const formatHeroDateLabel = (date = new Date()) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;

  const weekday = WEEKDAYS_PT_BR[date.getDay()];
  const day = date.getDate();
  const month = MONTHS_PT_BR[date.getMonth()];

  return `${weekday}, ${day} DE ${month}`;
};

export default formatHeroDateLabel;
