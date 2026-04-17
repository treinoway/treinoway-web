import { t } from '../i18n';

/**
 * The 9 profile fields that gate `profileCompleted` server-side.
 * Order is intentional — it is preserved in the missing-fields subtitle.
 */
export const PROFILE_FIELDS = [
  'firstName',
  'lastName',
  'birthDate',
  'gender',
  'line1',
  'city',
  'state',
  'postalCode',
  'country',
];

const ADDRESS_FIELDS = new Set(['line1', 'city', 'state', 'postalCode', 'country']);

const isNonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;

/**
 * Returns the ordered array of missing field keys from the 9-field predicate,
 * given the `/me?include=trainerOnboarding,address` payload.
 */
export function computeMissingProfileFields(me) {
  if (!me) return [...PROFILE_FIELDS];

  return PROFILE_FIELDS.filter((field) => {
    if (ADDRESS_FIELDS.has(field)) {
      return !isNonEmpty(me.address?.[field]);
    }
    return !isNonEmpty(me[field]);
  });
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
 * 3+ missing: "Falta: {a}, {b} e mais {N}"
 */
export function formatMissingFieldsSubtitle(fields) {
  if (!Array.isArray(fields) || fields.length === 0) {
    return t('onboarding.profileCompleted.raceFallback');
  }

  const prefixTemplate = t('onboarding.profileCompleted.missing.prefix') || 'Falta: {fields}';
  const connector = t('onboarding.profileCompleted.missing.connector') || 'e';

  let body;
  if (fields.length <= 2) {
    body = joinWithAnd(fields.map(translateField), connector);
  } else {
    const [a, b, ...rest] = fields;
    const moreTemplate = t('onboarding.profileCompleted.missing.more') || 'mais {count}';
    const moreLabel = moreTemplate.replace('{count}', String(rest.length));
    body = `${translateField(a)}, ${translateField(b)} ${connector} ${moreLabel}`;
  }

  return prefixTemplate.replace('{fields}', body);
}

/**
 * Returns the encouragement copy for the given number of completed steps.
 * At 3/3 we return an empty string — the success state replaces the body.
 */
export function getEncouragementCopy(doneCount) {
  if (doneCount === 0) return t('onboarding.encouragement.zero');
  if (doneCount === 1) return t('onboarding.encouragement.one');
  if (doneCount === 2) return t('onboarding.encouragement.two');
  return '';
}
