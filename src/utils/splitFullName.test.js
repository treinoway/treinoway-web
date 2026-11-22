import { splitFullName } from './splitFullName';

describe('splitFullName', () => {
  it('splits on the first space, keeping the rest as lastName', () => {
    expect(splitFullName('Ana Maria Lima')).toEqual({ firstName: 'Ana', lastName: 'Maria Lima' });
  });

  it('returns only firstName for a single word', () => {
    expect(splitFullName('Ana')).toEqual({ firstName: 'Ana' });
  });

  it('trims the ends and collapses repeated spaces', () => {
    expect(splitFullName('  Ana   Maria  Lima ')).toEqual({ firstName: 'Ana', lastName: 'Maria Lima' });
  });

  it('returns an empty firstName for an empty or missing value', () => {
    expect(splitFullName('   ')).toEqual({ firstName: '' });
    expect(splitFullName(undefined)).toEqual({ firstName: '' });
  });
});
