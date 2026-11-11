import { describe, it, expect, beforeEach } from 'vitest';
import { translateError, setLocale, getTranslations } from './index';
import en from './locales/en';

const CONSISTENCY_CODES = [
  'consistencyRanking.config.invalid',
  'consistencyRanking.pause.weekNotEditable',
  'consistencyRanking.season.notFound',
  'consistencyRanking.target.notEditable',
  'trainer.notFound',
];

// Builds an axios-like error carrying a backend messageCode.
const makeError = (status, messageCode) => {
  const error = new Error('Request failed');
  error.response = { status, data: { error: 'SERVER_CODE', messageCode, message: 'RAW SERVER MESSAGE' } };
  return error;
};

describe('consistency ranking messageCodes (PAN-34)', () => {
  beforeEach(() => setLocale('pt-BR'));

  it.each(CONSISTENCY_CODES)('pt-BR translates %s', (code) => {
    expect(getTranslations().messageCodes[code]?.trim().length).toBeGreaterThan(0);
  });

  it.each(CONSISTENCY_CODES)('en translates %s', (code) => {
    expect(en.messageCodes[code]?.trim().length).toBeGreaterThan(0);
  });

  it.each(CONSISTENCY_CODES)('a 409 with %s shows its own text, not the generic conflict', (code) => {
    const result = translateError(makeError(409, code));

    expect(result).toBe(getTranslations().messageCodes[code]);
    expect(result).not.toBe(getTranslations().messageCodes['resource.conflict']);
  });

  it('keeps the accents of the Portuguese target message', () => {
    expect(translateError(makeError(409, 'consistencyRanking.target.notEditable'))).toBe(
      'A meta só pode ser reduzida na semana em andamento, de zero até a meta original.'
    );
  });
});
