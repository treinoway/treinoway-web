import { describe, it, expect } from 'vitest';
import { DISCOUNT_MODE, parseDiscountInput, parsePositiveMoney } from './financeForm';

describe('financeForm', () => {
  it('parses a positive price', () => {
    expect(parsePositiveMoney('99,90')).toEqual({ cents: 9990, error: null });
    expect(parsePositiveMoney('0').error).toBe('O valor deve ser maior que zero.');
  });

  it('parses discounts with the 2-decimal and range rules', () => {
    expect(parseDiscountInput(DISCOUNT_MODE.NONE, '', 100)).toEqual({ percentHundredths: null, discountCents: null, error: null });
    expect(parseDiscountInput(DISCOUNT_MODE.PERCENT, '33,33', 100).percentHundredths).toBe(3333);
    expect(parseDiscountInput(DISCOUNT_MODE.PERCENT, '101', 100).error).toBe('O percentual deve estar entre 0 e 100.');
    expect(parseDiscountInput(DISCOUNT_MODE.PERCENT, '1,234', 100).error).toBe('Use até duas casas decimais.');
    expect(parseDiscountInput(DISCOUNT_MODE.AMOUNT, '2,00', 100).error).toBe('O desconto não pode ser maior que o valor.');
    expect(parseDiscountInput(DISCOUNT_MODE.AMOUNT, '0,50', 100).discountCents).toBe(50);
  });
});
