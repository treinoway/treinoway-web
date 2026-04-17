import { describe, it, expect } from 'vitest';
import {
  computeMissingProfileFields,
  formatMissingFieldsSubtitle,
  getEncouragementCopy,
  PROFILE_FIELDS,
} from './onboardingProfile';

const completeUser = {
  firstName: 'Ana',
  lastName: 'Silva',
  birthDate: '1990-01-01',
  gender: 'female',
  address: {
    line1: 'Rua X, 123',
    city: 'Sao Paulo',
    state: 'SP',
    postalCode: '01000-000',
    country: 'Brasil',
  },
};

describe('computeMissingProfileFields', () => {
  it('returns all fields when input is nullish', () => {
    expect(computeMissingProfileFields(null)).toEqual([...PROFILE_FIELDS]);
    expect(computeMissingProfileFields(undefined)).toEqual([...PROFILE_FIELDS]);
  });

  it('returns empty array when all 9 fields are filled', () => {
    expect(computeMissingProfileFields(completeUser)).toEqual([]);
  });

  it('detects missing top-level fields', () => {
    const user = { ...completeUser, firstName: '' };
    expect(computeMissingProfileFields(user)).toEqual(['firstName']);
  });

  it('detects missing address fields', () => {
    const user = {
      ...completeUser,
      address: { ...completeUser.address, city: '   ', postalCode: '' },
    };
    expect(computeMissingProfileFields(user)).toEqual(['city', 'postalCode']);
  });

  it('preserves canonical field order', () => {
    const user = {
      ...completeUser,
      firstName: '',
      gender: '',
      address: { ...completeUser.address, state: '' },
    };
    expect(computeMissingProfileFields(user)).toEqual(['firstName', 'gender', 'state']);
  });

  it('treats whitespace-only values as missing', () => {
    const user = { ...completeUser, firstName: '   ' };
    expect(computeMissingProfileFields(user)).toEqual(['firstName']);
  });
});

describe('formatMissingFieldsSubtitle', () => {
  it('returns race-fallback when list is empty', () => {
    expect(formatMissingFieldsSubtitle([])).toBe('Revise seus dados');
  });

  it('formats single missing field', () => {
    expect(formatMissingFieldsSubtitle(['city'])).toBe('Falta: cidade');
  });

  it('formats two missing fields with "e"', () => {
    expect(formatMissingFieldsSubtitle(['city', 'postalCode'])).toBe('Falta: cidade e CEP');
  });

  it('formats three or more with "e mais N"', () => {
    const result = formatMissingFieldsSubtitle(['firstName', 'lastName', 'city', 'state']);
    expect(result).toBe('Falta: nome, sobrenome e mais 2');
  });
});

describe('getEncouragementCopy', () => {
  it('returns zero-copy for 0 done', () => {
    expect(getEncouragementCopy(0)).toBe('Vamos começar — 3 passos rápidos.');
  });

  it('returns one-copy for 1 done', () => {
    expect(getEncouragementCopy(1)).toBe('Boa! Mais 2 para você decolar.');
  });

  it('returns two-copy for 2 done', () => {
    expect(getEncouragementCopy(2)).toBe('Quase lá — falta só 1!');
  });

  it('returns empty string when 3 done', () => {
    expect(getEncouragementCopy(3)).toBe('');
  });
});
