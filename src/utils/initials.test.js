import { getInitials } from './initials';

describe('getInitials', () => {
  it('uses first and last name initials in uppercase', () => {
    expect(getInitials('gabriel de almeida')).toBe('GA');
  });

  it('handles a single name', () => {
    expect(getInitials('Ana')).toBe('A');
  });

  it('falls back to a question mark when empty', () => {
    expect(getInitials('')).toBe('?');
  });
});
