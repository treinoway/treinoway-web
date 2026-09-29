import { normalizeInviteCode } from './inviteCode';

describe('normalizeInviteCode', () => {
  it('uppercases and keeps an already well-formed code', () => {
    expect(normalizeInviteCode('tf-7bca-yazs-bd')).toBe('TF-7BCA-YAZS-BD');
  });

  it('maps Crockford lookalikes (O→0, I/L→1) and regroups', () => {
    expect(normalizeInviteCode('tfoil2q7m04')).toBe('TF-0112-Q7M0-4');
  });

  it('strips separators and extra characters and caps at 12 alphanumerics', () => {
    expect(normalizeInviteCode(' TF 7BCA_YAZS.BD99 ')).toBe('TF-7BCA-YAZS-BD');
  });

  it('returns an empty string for empty or nullish input', () => {
    expect(normalizeInviteCode('')).toBe('');
    expect(normalizeInviteCode(null)).toBe('');
    expect(normalizeInviteCode(undefined)).toBe('');
  });
});
