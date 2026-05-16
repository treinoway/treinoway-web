const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a monetary value (number or numeric string like "270.00") as BRL currency.
 * Returns "-" for null/undefined/invalid input.
 */
export const formatCurrencyBRL = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) return '-';
  return currencyFormatter.format(numericValue);
};

/**
 * Format a numeric value as a plain BRL amount without the currency symbol.
 * Useful for input fields. Returns "" for null/invalid.
 */
export const formatAmountBRL = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) return '';
  return numberFormatter.format(numericValue);
};

/**
 * Parse a BRL-formatted string ("1.234,56" or "1234,56" or "1234.56") into a number.
 * Returns null if the value cannot be parsed.
 */
export const parseCurrencyBRL = (rawValue) => {
  if (rawValue === null || rawValue === undefined) return null;
  const text = String(rawValue).trim();
  if (text === '') return null;
  const normalized = text.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const numericValue = Number(normalized);
  if (!Number.isFinite(numericValue)) return null;
  return numericValue;
};
