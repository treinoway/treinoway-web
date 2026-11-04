// First segment of a food name ("Cuscuz, de milho, cozido" -> "Cuscuz") so long TBCA names stay short.
export const shortName = (name) => (name ?? '').split(',')[0].trim();

// Comma-separated short names of the items of an option.
export const itemsSummary = (items) => items.map((item) => shortName(item.name)).join(', ');

// "HH:MM" of a date.
const clockOf = (date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

// The next meal of the day by clock time (wraps to the first one after the last meal).
export const pickNextMeal = (meals, now = new Date()) => {
  const ordered = [...meals].sort((a, b) => a.order - b.order);
  const clock = clockOf(now);
  return ordered.find((meal) => meal.time >= clock) ?? ordered[0];
};
