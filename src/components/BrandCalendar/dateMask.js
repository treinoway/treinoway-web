// ---------------------------------------------------------------------------
// Date mask helpers — shared by BrandCalendar and DateInput.
// All logic is pure (no side effects, no DOM access).
// ---------------------------------------------------------------------------

/**
 * Converts an ISO date string ("YYYY-MM-DD") to the display format ("DD/MM/YYYY").
 */
export const formatISOToDisplay = (isoDate) => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

/**
 * Converts a display date string ("DD/MM/YYYY") to ISO format ("YYYY-MM-DD").
 * Returns null if the input does not have exactly 8 digits.
 */
export const formatDisplayToISO = (displayDate) => {
  const cleaned = displayDate.replace(/\D/g, '');
  if (cleaned.length !== 8) return null;

  const day = cleaned.substring(0, 2);
  const month = cleaned.substring(2, 4);
  const year = cleaned.substring(4, 8);

  return `${year}-${month}-${day}`;
};

/**
 * Returns true if the given day/month/year combination represents a valid calendar date.
 */
export const isValidDate = (day, month, year) => {
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  if (y < 1900 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;

  const daysInMonth = new Date(y, m, 0).getDate();
  if (d > daysInMonth) return false;

  return true;
};

/**
 * Applies the dd/mm/yyyy mask to a raw input string as the user types.
 * Strips non-digits and inserts slashes at positions 2 and 4.
 */
export const formatAsUserTypes = (input) => {
  const cleaned = input.replace(/\D/g, '');
  let formatted = cleaned;

  if (cleaned.length >= 2) {
    formatted = cleaned.substring(0, 2);
    if (cleaned.length >= 4) {
      formatted += '/' + cleaned.substring(2, 4);
      if (cleaned.length >= 8) {
        formatted += '/' + cleaned.substring(4, 8);
      } else if (cleaned.length > 4) {
        formatted += '/' + cleaned.substring(4);
      }
    } else if (cleaned.length > 2) {
      formatted += '/' + cleaned.substring(2);
    }
  }

  return formatted;
};
