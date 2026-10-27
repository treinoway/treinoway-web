import { t, tf } from '../i18n';

/**
 * The profile fields that gate `profileCompleted` server-side.
 * Order is intentional — it is preserved in the missing-fields subtitle.
 */
export const PROFILE_FIELDS = ['firstName', 'lastName', 'avatar'];

const USER_KEY_BY_FIELD = {
  firstName: 'firstName',
  lastName: 'lastName',
  avatar: 'avatarUrl',
};

const isNonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;

/**
 * Returns the ordered array of missing field keys, given the user payload
 * (`/me` or the stored AuthContext user).
 */
export function computeMissingProfileFields(me) {
  if (!me) return [...PROFILE_FIELDS];

  return PROFILE_FIELDS.filter((field) => !isNonEmpty(me[USER_KEY_BY_FIELD[field]]));
}

function translateField(field) {
  return t(`onboarding.fields.${field}`) || field;
}

function joinWithAnd(parts, connector) {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  const head = parts.slice(0, -1).join(', ');
  const tail = parts[parts.length - 1];
  return `${head} ${connector} ${tail}`;
}

/**
 * Formats the missing-fields subtitle for row 1 in pt-BR / en-US.
 * 1 missing:  "Falta: {field}"
 * 2 missing:  "Falta: {a} e {b}"
 * 3 missing: "Falta: {a}, {b} e {c}"
 */
export function formatMissingFieldsSubtitle(fields) {
  if (!Array.isArray(fields) || fields.length === 0) {
    return t('onboarding.profileCompleted.raceFallback');
  }

  const prefixTemplate = t('onboarding.profileCompleted.missing.prefix') || 'Falta: {fields}';
  const connector = t('onboarding.profileCompleted.missing.connector') || 'e';

  const body = joinWithAnd(fields.map(translateField), connector);

  return prefixTemplate.replace('{fields}', body);
}

/**
 * Returns the encouragement copy for the checklist progress.
 * When every step is done we return an empty string — the success state
 * replaces the body.
 */
export function getEncouragementCopy({ done, total }) {
  const remaining = total - done;
  if (remaining <= 0) return '';
  if (remaining === 1) return t('onboarding.encouragement.almostThere');
  if (done === 0) return tf('onboarding.encouragement.zero', { total });
  return tf('onboarding.encouragement.remaining', { remaining });
}
