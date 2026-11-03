import {
  getDisplayName,
  getNameOrDash,
  formatRepetitions,
  formatPrescription,
  formatLoad,
  formatRest,
  formatDuration,
  getRoleLabels,
} from './format';

describe('manager format', () => {
  it('getDisplayName joins first and last name', () => {
    expect(getDisplayName({ firstName: 'Ana', lastName: 'Silva', email: 'a@x.com' })).toBe('Ana Silva');
  });

  it('getDisplayName falls back to the email when names are empty strings', () => {
    expect(getDisplayName({ firstName: '', lastName: '', email: 'a@x.com' })).toBe('a@x.com');
  });

  it('getDisplayName falls back to an em dash when nothing is available', () => {
    expect(getDisplayName({ firstName: '', lastName: '', email: null })).toBe('—');
  });

  it('getNameOrDash renders an em dash for empty names', () => {
    expect(getNameOrDash('')).toBe('—');
    expect(getNameOrDash('Maria')).toBe('Maria');
  });

  it('formatRepetitions joins with a slash and handles null', () => {
    expect(formatRepetitions([10, 10, 8, 8])).toBe('10/10/8/8');
    expect(formatRepetitions(null)).toBe('—');
    expect(formatRepetitions([])).toBe('—');
  });

  it('formatLoad only shows a load when the exercise has one', () => {
    expect(formatLoad(true, 40)).toBe('40 kg');
    expect(formatLoad(false, null)).toBe('—');
    expect(formatLoad(true, null)).toBe('—');
  });

  it('formatRest appends seconds and handles null', () => {
    expect(formatRest(90)).toBe('90s');
    expect(formatRest(null)).toBe('—');
  });

  it('formatDuration converts seconds to minutes', () => {
    expect(formatDuration(3600)).toBe('60 min');
    expect(formatDuration(null)).toBe('—');
  });

  it('getRoleLabels translates roles and appends the student label', () => {
    expect(getRoleLabels(['trainer'], true)).toEqual(['Treinador', 'Aluno']);
    expect(getRoleLabels([], false)).toEqual([]);
  });

  it('formatRepetitions handles numbers and {min,max} objects', () => {
    expect(formatRepetitions(10)).toBe('10');
    expect(formatRepetitions({ min: 8, max: 12 })).toBe('8-12');
    expect(formatRepetitions({ min: 10, max: 10 })).toBe('10');
    expect(formatRepetitions({ min: 8, max: null })).toBe('8');
    expect(formatRepetitions({ min: null, max: 12 })).toBe('12');
    expect(formatRepetitions({ min: null, max: null })).toBe('—');
  });

  it('formatPrescription shows the duration for duration-based exercises', () => {
    expect(formatPrescription({ prescriptionMode: 'duration', duration: 45, repetitions: null })).toBe('45s');
    expect(formatPrescription({ prescriptionMode: 'duration', duration: null })).toBe('—');
    expect(formatPrescription({ prescriptionMode: 'repetitions', repetitions: { min: 8, max: 12 } })).toBe('8-12');
    expect(formatPrescription({ repetitions: [10, 8] })).toBe('10/8');
  });
});
