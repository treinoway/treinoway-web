export const formatDateForDisplay = (dateValue) => {
  if (!dateValue) return '-';

  if (typeof dateValue === 'string') {
    const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
    if (dateOnlyMatch) {
      const [, year, month, day] = dateOnlyMatch;
      return `${day}/${month}/${year}`;
    }
  }

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return '-';

  return parsedDate.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

/**
 * Formats a DateTime (ISO timestamp / Date) as dd/mm/aaaa in the viewer's local
 * timezone. Use for `createdAt`/`submittedAt`-style fields; date-only fields
 * belong to `formatDateForDisplay`.
 */
export const formatDateTimeForDisplay = (dateValue) => {
  if (!dateValue) return '-';

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return '-';

  return parsedDate.toLocaleDateString('pt-BR');
};

/**
 * Formats a DateTime as HH:mm in the viewer's local timezone; "-" when missing
 * or invalid.
 */
export const formatTimeForDisplay = (dateValue) => {
  if (!dateValue) return '-';

  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return '-';

  return parsedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};
