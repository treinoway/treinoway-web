/**
 * Calculates aggregate macros from an array of meals.
 * Each meal may contain foodItems with macro snapshots.
 */
export function aggregateMealsMacros(meals = []) {
  let kcal = 0;
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;

  for (const meal of meals) {
    for (const item of meal.foodItems || []) {
      kcal += item.kcal ?? 0;
      proteinG += item.proteinG ?? 0;
      carbsG += item.carbsG ?? 0;
      fatG += item.fatG ?? 0;
    }
  }

  return { kcal, proteinG, carbsG, fatG };
}

/**
 * Formats a macro value for display. Returns "—" when null/undefined/0-but-intentionally-null.
 * Pass `nullish=true` to display "—" even for zero.
 */
export function formatMacro(value, nullish = false) {
  if (value === null || value === undefined) return '—';
  if (nullish && value === 0) return '—';
  return Math.round(value).toString();
}

/**
 * Calculates the macro bar segments (percentages of kcal from each macro).
 * Protein and carbs = 4 kcal/g; fat = 9 kcal/g.
 */
export function calculateMacroPercentages(proteinG, carbsG, fatG) {
  const proteinKcal = (proteinG ?? 0) * 4;
  const carbsKcal = (carbsG ?? 0) * 4;
  const fatKcal = (fatG ?? 0) * 9;
  const total = proteinKcal + carbsKcal + fatKcal;

  if (total === 0) return { protein: 0, carbs: 0, fat: 0 };

  return {
    protein: Math.round((proteinKcal / total) * 100),
    carbs: Math.round((carbsKcal / total) * 100),
    fat: Math.round((fatKcal / total) * 100),
  };
}

/**
 * Recalculates macros for a food item based on quantity.
 * Returns null for any macro that is null in the food record.
 */
export function recalcMacrosForQuantity(food, quantityG) {
  if (!food || !quantityG || quantityG <= 0) {
    return { kcal: null, proteinG: null, carbsG: null, fatG: null };
  }

  const factor = quantityG / 100;

  return {
    kcal: food.kcalPer100g != null ? food.kcalPer100g * factor : null,
    proteinG: food.proteinGPer100g != null ? food.proteinGPer100g * factor : null,
    carbsG: food.carbsGPer100g != null ? food.carbsGPer100g * factor : null,
    fatG: food.fatGPer100g != null ? food.fatGPer100g * factor : null,
  };
}

/**
 * Calculates the delta percentage between actual kcal and target kcal.
 * Returns null when either is missing.
 */
export function calculateGoalDelta(actualKcal, targetKcal) {
  if (!actualKcal || !targetKcal || targetKcal === 0) return null;
  return ((actualKcal - targetKcal) / targetKcal) * 100;
}

/**
 * Returns the GoalDeltaIndicator severity level.
 * - 'ok': within 10%
 * - 'warn': 10–25%
 * - 'danger': >25%
 */
export function getDeltaSeverity(deltaPct) {
  const abs = Math.abs(deltaPct);
  if (abs <= 10) return 'ok';
  if (abs <= 25) return 'warn';
  return 'danger';
}
