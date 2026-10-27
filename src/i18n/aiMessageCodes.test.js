import { describe, it, expect, beforeEach } from 'vitest';
import { translateError, setLocale, getTranslations } from './index';
import en from './locales/en';

const AI_CODES = [
  'platformPlan.aiNotAvailable',
  'platformPlan.aiActionsExceeded',
  'ai.unavailable',
  'ai.rateLimited',
  'ai.overloaded',
  'ai.responseTooLong',
  'ai.confirmationRequired',
];

// Builds an axios-like error carrying a backend messageCode.
const makeError = (status, messageCode) => {
  const error = new Error('Request failed');
  error.response = { status, data: { error: 'SERVER_CODE', messageCode, message: 'RAW SERVER MESSAGE' } };
  return error;
};

describe('iArnold messageCodes (AC 40)', () => {
  beforeEach(() => setLocale('pt-BR'));

  it.each(AI_CODES)('pt-BR translates %s', (code) => {
    const translated = getTranslations().messageCodes[code];

    expect(typeof translated).toBe('string');
    expect(translated.trim().length).toBeGreaterThan(0);
  });

  it.each(AI_CODES)('en translates %s', (code) => {
    expect(typeof en.messageCodes[code]).toBe('string');
    expect(en.messageCodes[code].trim().length).toBeGreaterThan(0);
  });

  it.each(AI_CODES)('translateError resolves %s from the code, not the raw server message', (code) => {
    const result = translateError(makeError(403, code));

    expect(result).toBe(getTranslations().messageCodes[code]);
    expect(result).not.toBe('RAW SERVER MESSAGE');
  });
});
