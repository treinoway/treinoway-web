import { t } from '../i18n';

/**
 * Formats an estimated workout duration into display text + accessibility label.
 *
 * Buckets:
 *   - null / undefined / 0  → "not_estimated"
 *   - 1–299s (under 5 min)  → "quick"
 *   - 300–7199s             → minutes, rounded to nearest 5 (min 5)
 *   - ≥ 7200s               → "{H}h" or "{H}h {round5(M)}min" (M omitted when 0)
 *
 * No tilde — rounded values are shown as-is so the imprecision is visible.
 *
 * @param {number|null|undefined} seconds Estimated duration in seconds.
 * @returns {{ text: string, ariaLabel: string, state: 'not_estimated'|'quick'|'estimated' }}
 */
export function formatDuration(seconds) {
  const minLabel = t('training.duration.minutesShort') || 'min';
  const hourLabel = t('training.duration.hoursShort') || 'h';

  if (seconds == null || seconds === 0) {
    return {
      text: t('training.duration.notEstimated') || 'Duração não estimada',
      ariaLabel:
        t('training.duration.ariaNotEstimated') || 'Duração estimada não disponível',
      state: 'not_estimated',
    };
  }

  if (seconds < 300) {
    return {
      text: t('training.duration.quick') || 'Treino rápido',
      ariaLabel:
        t('training.duration.ariaQuick') || 'Treino rápido, menos de 5 minutos',
      state: 'quick',
    };
  }

  if (seconds < 7200) {
    const minutes = round5(seconds / 60);
    const text = `${minutes} ${minLabel}`;
    return {
      text,
      ariaLabel: buildEstimatedAria(buildAriaValue({ minutes })),
      state: 'estimated',
    };
  }

  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const rawRemaining = totalMinutes - hours * 60;
  // Do NOT apply the 5-minute floor here: a clean hour mark (e.g. 2h flat)
  // should render as "2h", not "2h 5min". The floor only matters when we
  // actually have a partial-hour estimate to round.
  const remainingMinutes = rawRemaining === 0 ? 0 : round5(rawRemaining);

  // Handle the edge case where rounding pushes minutes to 60 (e.g. 58 → 60):
  // promote it to a full hour so we never render "2h 60min".
  const normalizedHours = remainingMinutes >= 60 ? hours + 1 : hours;
  const normalizedMinutes = remainingMinutes >= 60 ? 0 : remainingMinutes;

  const text =
    normalizedMinutes === 0
      ? `${normalizedHours}${hourLabel}`
      : `${normalizedHours}${hourLabel} ${normalizedMinutes}${minLabel}`;

  return {
    text,
    ariaLabel: buildEstimatedAria(
      buildAriaValue({ hours: normalizedHours, minutes: normalizedMinutes }),
    ),
    state: 'estimated',
  };
}

/**
 * Rounds a value to the nearest multiple of 5 with a floor of 5.
 * @param {number} n
 * @returns {number}
 */
function round5(n) {
  return Math.max(5, Math.round(n / 5) * 5);
}

function buildAriaValue({ hours = 0, minutes = 0 }) {
  if (hours > 0 && minutes > 0) {
    return `${hours} ${pluralUnit(hours, 'hora', 'horas')} e ${minutes} ${pluralUnit(minutes, 'minuto', 'minutos')}`;
  }
  if (hours > 0) {
    return `${hours} ${pluralUnit(hours, 'hora', 'horas')}`;
  }
  return `${minutes} ${pluralUnit(minutes, 'minuto', 'minutos')}`;
}

function pluralUnit(value, singular, plural) {
  return value === 1 ? singular : plural;
}

function buildEstimatedAria(value) {
  const template =
    t('training.duration.ariaEstimated') || 'Duração estimada: {{value}}';
  return template.replace('{{value}}', value);
}
