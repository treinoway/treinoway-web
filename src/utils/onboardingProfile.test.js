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
  avatarUrl: 'https://cdn.example.com/ana.png',
};

describe('computeMissingProfileFields', () => {
  it('only gates on first name, last name and avatar', () => {
    expect(PROFILE_FIELDS).toEqual(['firstName', 'lastName', 'avatar']);
  });

  it('returns all fields when input is nullish', () => {
    expect(computeMissingProfileFields(null)).toEqual(['firstName', 'lastName', 'avatar']);
    expect(computeMissingProfileFields(undefined)).toEqual(['firstName', 'lastName', 'avatar']);
  });

  it('returns empty array when name, surname and avatar are set, ignoring birthDate, gender and address', () => {
    expect(computeMissingProfileFields(completeUser)).toEqual([]);
  });

  it('detects a missing avatar', () => {
    expect(computeMissingProfileFields({ ...completeUser, avatarUrl: null })).toEqual(['avatar']);
  });

  it('detects missing top-level fields in canonical order', () => {
    expect(computeMissingProfileFields({ firstName: '', lastName: '', avatarUrl: null }))
      .toEqual(['firstName', 'lastName', 'avatar']);
  });

  it('treats whitespace-only values as missing', () => {
    expect(computeMissingProfileFields({ ...completeUser, firstName: '   ' })).toEqual(['firstName']);
  });
});

describe('formatMissingFieldsSubtitle', () => {
  it('returns race-fallback when list is empty', () => {
    expect(formatMissingFieldsSubtitle([])).toBe('Revise seus dados');
  });

  it('formats a single missing field', () => {
    expect(formatMissingFieldsSubtitle(['avatar'])).toBe('Falta: foto');
  });

  it('formats two missing fields with "e"', () => {
    expect(formatMissingFieldsSubtitle(['lastName', 'avatar'])).toBe('Falta: sobrenome e foto');
  });

  it('lists nome, sobrenome and foto in full when all three are missing', () => {
    expect(formatMissingFieldsSubtitle(['firstName', 'lastName', 'avatar']))
      .toBe('Falta: nome, sobrenome e foto');
  });
});

describe('getEncouragementCopy({ done, total })', () => {
  it('returns the zero-copy with the real total', () => {
    expect(getEncouragementCopy({ done: 0, total: 4 })).toBe('Vamos começar — 4 passos rápidos.');
    expect(getEncouragementCopy({ done: 0, total: 5 })).toBe('Vamos começar — 5 passos rápidos.');
  });

  it('returns the "Mais N" copy while more than one step remains', () => {
    expect(getEncouragementCopy({ done: 1, total: 4 })).toBe('Boa! Mais 3 para você decolar.');
    expect(getEncouragementCopy({ done: 2, total: 4 })).toBe('Boa! Mais 2 para você decolar.');
    expect(getEncouragementCopy({ done: 1, total: 5 })).toBe('Boa! Mais 4 para você decolar.');
    expect(getEncouragementCopy({ done: 3, total: 5 })).toBe('Boa! Mais 2 para você decolar.');
  });

  it('returns the almost-there copy when exactly one step remains', () => {
    expect(getEncouragementCopy({ done: 3, total: 4 })).toBe('Quase lá — falta só 1!');
    expect(getEncouragementCopy({ done: 4, total: 5 })).toBe('Quase lá — falta só 1!');
  });

  it('returns empty string when every step is done', () => {
    expect(getEncouragementCopy({ done: 4, total: 4 })).toBe('');
    expect(getEncouragementCopy({ done: 5, total: 5 })).toBe('');
  });
});
