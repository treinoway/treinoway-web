import {
  countLabel,
  formatByUnit,
  formatDateOnly,
  formatDecimal,
  formatFlexible,
  formatInteger,
  formatSigned,
  parseNumberInput,
  personName,
  previewTitle,
} from './nutritionFormat';

describe('nutritionFormat', () => {
  it('formats integers and decimals in pt-BR', () => {
    expect(formatInteger(1477.4)).toBe('1.477');
    expect(formatDecimal(118.8)).toBe('118,8');
    expect(formatDecimal(132)).toBe('132,0');
    expect(formatFlexible(2.5)).toBe('2,5');
    expect(formatFlexible(3)).toBe('3');
  });

  it('formats by unit: kcal as integer, grams with one decimal', () => {
    expect(formatByUnit(1550, 'kcal')).toBe('1.550');
    expect(formatByUnit(102, 'g')).toBe('102,0');
  });

  it('signs differences with the typographic minus and leaves zero unsigned', () => {
    expect(formatSigned(-73)).toBe('−73');
    expect(formatSigned(100)).toBe('+100');
    expect(formatSigned(0)).toBe('0');
    expect(formatSigned(-16.8, 'g')).toBe('−16,8');
    expect(formatSigned(0.02, 'g')).toBe('0,0');
  });

  it('formats date-only strings without timezone shifts and falls back to "-"', () => {
    expect(formatDateOnly('2026-10-12')).toBe('12/10/2026');
    expect(formatDateOnly('2026-11-20T12:00:00.000Z')).toBe('20/11/2026');
    expect(formatDateOnly(null)).toBe('-');
  });

  it('builds a person name from first + last name, falling back to the e-mail', () => {
    expect(personName({ firstName: 'Luiza', lastName: 'Andrade' })).toBe('Luiza Andrade');
    expect(personName({ email: 'a@b.com' })).toBe('a@b.com');
    expect(personName(null)).toBe('-');
  });

  it('pluralizes counts and parses number inputs', () => {
    expect(countLabel(1, 'item', 'itens')).toBe('1 item');
    expect(countLabel(2, 'item', 'itens')).toBe('2 itens');
    expect(parseNumberInput('')).toBeNull();
    expect(parseNumberInput('2.5')).toBe(2.5);
  });

  it('previewTitle names the patient or stays neutral', () => {
    expect(previewTitle('Luiza')).toBe('Como a Luiza vê');
    expect(previewTitle(null)).toBe('Como o paciente vê');
  });
});
