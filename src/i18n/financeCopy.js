import { t, tf } from './index';

export const FINANCE_AUDIENCE = Object.freeze({
  TRAINER: 'trainer',
  NUTRITIONIST: 'nutritionist',
  DUAL: 'dual',
});

/** Audience of the finance copy from the user's roles: both → dual, nutritionist only → nutritionist, else trainer. */
export const resolveFinanceAudience = (hasRole) => {
  const isTrainer = Boolean(hasRole?.('TRAINER'));
  const isNutritionist = Boolean(hasRole?.('NUTRITIONIST'));
  if (isTrainer && isNutritionist) return FINANCE_AUDIENCE.DUAL;
  if (isNutritionist) return FINANCE_AUDIENCE.NUTRITIONIST;
  return FINANCE_AUDIENCE.TRAINER;
};

/** Key of the audience variant of a `finance.*` key, or the key itself when the audience has none. */
const resolveCopyKey = (audience, path) => {
  if (audience === FINANCE_AUDIENCE.TRAINER) return path;
  const overlayKey = `finance.copy.${audience}.${path.replace(/^finance\./, '')}`;
  return t(overlayKey) === undefined ? path : overlayKey;
};

/** `tf` that swaps in the audience wording (aluno / paciente / noun-free). */
export const ftf = (audience, path, params) => tf(resolveCopyKey(audience, path), params);

/** `tCount` that swaps in the audience wording. */
export const ftCount = (audience, path, count, params = {}) => {
  const form = count === 1 ? 'one' : 'other';
  return tf(`${resolveCopyKey(audience, path)}.${form}`, { ...params, n: count });
};
