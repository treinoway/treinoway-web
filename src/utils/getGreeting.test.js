import { describe, it, expect } from 'vitest';
import getGreeting from './getGreeting';

const at = (hour, minute) => new Date(2026, 6, 14, hour, minute, 0);

describe('getGreeting', () => {
  it('returns "Boa noite" at 04:59 (just before the "Bom dia" boundary)', () => {
    expect(getGreeting(at(4, 59))).toBe('Boa noite');
  });

  it('returns "Bom dia" at 05:00 (the "Bom dia" boundary)', () => {
    expect(getGreeting(at(5, 0))).toBe('Bom dia');
  });

  it('returns "Bom dia" at 11:59 (just before the "Boa tarde" boundary)', () => {
    expect(getGreeting(at(11, 59))).toBe('Bom dia');
  });

  it('returns "Boa tarde" at 12:00 (the "Boa tarde" boundary)', () => {
    expect(getGreeting(at(12, 0))).toBe('Boa tarde');
  });

  it('returns "Boa tarde" at 17:59 (just before the "Boa noite" boundary)', () => {
    expect(getGreeting(at(17, 59))).toBe('Boa tarde');
  });

  it('returns "Boa noite" at 18:00 (the "Boa noite" boundary)', () => {
    expect(getGreeting(at(18, 0))).toBe('Boa noite');
  });

  it('returns "Boa noite" at midnight', () => {
    expect(getGreeting(at(0, 0))).toBe('Boa noite');
  });

  it('returns "Boa noite" at 23:59', () => {
    expect(getGreeting(at(23, 59))).toBe('Boa noite');
  });

  it('defaults to the current date when called without arguments', () => {
    expect(['Bom dia', 'Boa tarde', 'Boa noite']).toContain(getGreeting());
  });
});
