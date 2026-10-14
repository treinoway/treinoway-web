import { t } from '../i18n';
import { moneyErrorMessage } from './financeErrors';
import { MONEY_ERROR, parseMoneyToCents, parsePercentToHundredths } from './subscriptionHelpers';

export const DISCOUNT_MODE = Object.freeze({ NONE: 'none', PERCENT: 'percent', AMOUNT: 'amount' });

/** Price text → `{ cents, error }`; must be > 0, ≤ 2 decimals, ≤ 99.999.999,99. */
export const parsePositiveMoney = (text) => {
  const { cents, error } = parseMoneyToCents(text);
  if (error) return { cents: null, error: moneyErrorMessage(error) };
  if (cents <= 0) return { cents: null, error: t('finance.money.positive') };
  return { cents, error: null };
};

/**
 * Discount input → `{ percentHundredths, discountCents, error }`.
 * Percent: 0–100 with at most 2 decimals. Amount: ≤ 2 decimals and ≤ price.
 */
export const parseDiscountInput = (mode, text, priceCents) => {
  if (mode === DISCOUNT_MODE.NONE) return { percentHundredths: null, discountCents: null, error: null };
  if (mode === DISCOUNT_MODE.PERCENT) {
    const { hundredths, error } = parsePercentToHundredths(text);
    if (error === MONEY_ERROR.MAX) return { error: t('finance.money.percentRange') };
    return error ? { error: moneyErrorMessage(error) } : { percentHundredths: hundredths, discountCents: null, error: null };
  }
  const { cents, error } = parseMoneyToCents(text);
  if (error) return { error: moneyErrorMessage(error) };
  if (priceCents !== null && priceCents !== undefined && cents > priceCents) {
    return { error: t('finance.money.discountExceedsPrice') };
  }
  return { percentHundredths: null, discountCents: cents, error: null };
};
