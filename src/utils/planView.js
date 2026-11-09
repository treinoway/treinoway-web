import { goalStatus, itemNutrients, mealTotals } from './nutritionCalc';
import { formatSigned } from './nutritionFormat';

export const DAY_NUTRIENTS = Object.freeze([
  { key: 'kcal', label: 'Energia', unit: 'kcal' },
  { key: 'protein', label: 'Proteína', unit: 'g' },
  { key: 'carbs', label: 'Carboidrato', unit: 'g' },
  { key: 'fat', label: 'Lipídio', unit: 'g' },
  { key: 'fiber', label: 'Fibras', unit: 'g', isMinimum: true },
]);

// Applies an unsaved quantity (raw input text, '' = 0) to an item and recomputes its nutrients.
const applyDraft = (item, drafts) => {
  const raw = drafts[item.id];
  if (raw === undefined) return item;
  const quantity = raw === '' ? 0 : Number(raw);
  return { ...item, quantity, nutrients: itemNutrients(item.per100g, quantity) };
};

// Meals with unsaved quantities applied and every option total recomputed from per-100 g values.
export const withDraftQuantities = (meals, drafts) => meals.map((meal) => ({
  ...meal,
  options: meal.options.map((option) => {
    const items = option.items.map((item) => applyDraft(item, drafts));
    return { ...option, items, totals: mealTotals(items) };
  }),
}));

// Day goals by nutrient key: kcal and fiber minimum from the goals, macro grams from the computed targets.
export const buildDayGoals = (plan) => {
  const macros = plan.computed?.macros;
  return {
    kcal: plan.goals.kcalTarget ?? null,
    protein: macros?.protein.grams ?? null,
    carbs: macros?.carbs.grams ?? null,
    fat: macros?.fat.grams ?? null,
    fiber: plan.goals.fiberMinG ?? null,
  };
};

// Status of a day total against its goal (5% tolerance, fiber is a minimum).
export const dayStatus = (nutrient, value, goal) =>
  goalStatus(value, goal, { tolerance: 0.05, isMinimum: Boolean(nutrient.isMinimum) });

// "Comparada à opção 1: +100 kcal · PTN −10,0 g · CHO +30,0 g · LIP −1,0 g".
export const describeComparison = (option, reference) => {
  const diff = (key) => option.totals[key] - reference.totals[key];
  return `Comparada à opção 1: ${formatSigned(diff('kcal'))} kcal · PTN ${formatSigned(diff('protein'), 'g')} g · CHO ${formatSigned(diff('carbs'), 'g')} g · LIP ${formatSigned(diff('fat'), 'g')} g`;
};

const KCAL_PER_GRAM = Object.freeze({ protein: 4, carbs: 4, fat: 9 });
const PERCENT = 100;

export const VET_MACROS = Object.freeze([
  { key: 'protein', label: 'Proteína' },
  { key: 'carbs', label: 'Carboidrato' },
  { key: 'fat', label: 'Lipídio' },
]);

// Share of the day kcal (%) coming from each macro, null while the day has no kcal.
export const vetShares = (totals) => Object.fromEntries(VET_MACROS.map(({ key }) => [
  key,
  totals.kcal > 0 ? ((totals[key] * KCAL_PER_GRAM[key]) / totals.kcal) * PERCENT : null,
]));

// Quantities by item id for every item of the plan (the last saved values).
export const quantityMap = (plan) => Object.fromEntries(
  plan.meals.flatMap((meal) => meal.options.flatMap((option) => option.items.map((item) => [item.id, item.quantity]))),
);
