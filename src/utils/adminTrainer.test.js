import { getTrainerName, hasTrainerName, isAbnormalStatus } from './adminTrainer';

describe('adminTrainer utils', () => {
  it('joins first and last name', () => {
    expect(getTrainerName({ firstName: 'Ana', lastName: 'Lima', email: 'a@b.c' })).toBe('Ana Lima');
  });

  it('falls back to email, then to a dash', () => {
    expect(getTrainerName({ firstName: null, lastName: null, email: 'a@b.c' })).toBe('a@b.c');
    expect(getTrainerName({ firstName: null, lastName: null, email: null })).toBe('—');
  });

  it('detects whether a name exists', () => {
    expect(hasTrainerName({ firstName: 'Ana', lastName: null })).toBe(true);
    expect(hasTrainerName({ firstName: null, lastName: null })).toBe(false);
  });

  it('flags only non-null, non-ACTIVE statuses', () => {
    expect(isAbnormalStatus(null)).toBe(false);
    expect(isAbnormalStatus('ACTIVE')).toBe(false);
    expect(isAbnormalStatus('PAST_DUE')).toBe(true);
  });
});
