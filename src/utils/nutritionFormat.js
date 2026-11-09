const MINUS = '−';

const integerFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const oneDecimalFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const flexibleFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

// Whole number in pt-BR ("1.477").
export const formatInteger = (value) => integerFormat.format(value ?? 0);

// One decimal place in pt-BR ("118,8").
export const formatDecimal = (value) => oneDecimalFormat.format(value ?? 0);

// Up to two decimals without trailing zeros ("2,5").
export const formatFlexible = (value) => flexibleFormat.format(value ?? 0);

// Formats by unit: kcal as integer, everything else with one decimal.
export const formatByUnit = (value, unit) => (unit === 'kcal' ? formatInteger(value) : formatDecimal(value));

// Signed difference using the typographic minus ("−73", "+100", "0").
export const formatSigned = (value, unit = 'kcal') => {
  const precision = unit === 'kcal' ? 1 : 10;
  const rounded = Math.round(value * precision) / precision;
  const text = formatByUnit(Math.abs(rounded), unit);
  if (rounded === 0) return text;
  return `${rounded < 0 ? MINUS : '+'}${text}`;
};

// Date-only "YYYY-MM-DD" to "DD/MM/YYYY" without timezone shifts; "-" when empty.
export const formatDateOnly = (value) => {
  if (!value) return '-';
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
};

// Full name from first + last name, falling back to the e-mail.
export const personName = (person) =>
  [person?.firstName, person?.lastName].filter(Boolean).join(' ') || person?.email || '-';

// Section title: named when the patient first name is known, neutral otherwise.
export const previewTitle = (firstName) => (firstName ? `Como a ${firstName} vê` : 'Como o paciente vê');

// Parses a number input value; empty means "not set".
export const parseNumberInput = (raw) => (raw === '' ? null : Number(raw));

// Plural-aware "N item(ns)".
export const countLabel = (count, singular, plural) => `${count} ${count === 1 ? singular : plural}`;
