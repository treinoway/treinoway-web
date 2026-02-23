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
