// Live nutrition math for the nutritionist screens; mirrors the service helper (src/helpers/nutrition-calc.js).

const PERCENT = 100;
const DECIMAL_FACTOR = 100;
const MINUTES_PER_HOUR = 60;
const DAYS_PER_WEEK = 7;
const KCAL_PER_GRAM = Object.freeze({ protein: 4, carbs: 4, fat: 9 });
const NUTRIENT_KEYS = Object.freeze(['kcal', 'protein', 'carbs', 'fat', 'fiber']);
const OBJECTIVE_ADJUSTMENT = Object.freeze({ maintain: 0, deficit_10: -0.1, deficit_20: -0.2, surplus_10: 0.1 });
const GOAL_TOLERANCE = 0.05;
const CHECK_DIFF_KCAL = 5;
const KATCH_BASE = 370;
const KATCH_LEAN_FACTOR = 21.6;
const FAO_YOUNG_MAX_AGE = 30;
const FAO_ADULT_MAX_AGE = 60;

const FAO_WHO_TABLE = Object.freeze({
  female: [
    { maxAge: FAO_YOUNG_MAX_AGE, weightFactor: 14.7, constant: 496 },
    { maxAge: FAO_ADULT_MAX_AGE, weightFactor: 8.7, constant: 829 },
    { maxAge: Infinity, weightFactor: 10.5, constant: 596 },
  ],
  male: [
    { maxAge: FAO_YOUNG_MAX_AGE, weightFactor: 15.3, constant: 679 },
    { maxAge: FAO_ADULT_MAX_AGE, weightFactor: 11.6, constant: 879 },
    { maxAge: Infinity, weightFactor: 13.5, constant: 487 },
  ],
});

// Rounds to 2 decimal places.
const round2 = (value) => Math.round((value + Number.EPSILON) * DECIMAL_FACTOR) / DECIMAL_FACTOR;

// Lean mass in kg from weight and body fat %; null without body fat.
export const computeLeanMassKg = ({ weightKg, bodyFatPct }) =>
  (bodyFatPct == null ? null : weightKg * (1 - bodyFatPct / PERCENT));

// Mifflin-St Jeor resting energy expenditure.
const mifflin = ({ sex, age, weightKg, heightCm }) =>
  10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);

// Revised Harris-Benedict resting energy expenditure.
const harrisBenedict = ({ sex, age, weightKg, heightCm }) => (sex === 'male'
  ? 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age
  : 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age);

// FAO/WHO resting energy expenditure by sex and age bracket.
const faoWho = ({ sex, age, weightKg }) => {
  const brackets = FAO_WHO_TABLE[sex] ?? FAO_WHO_TABLE.female;
  const bracket = brackets.find((candidate) => age < candidate.maxAge);
  return bracket.weightFactor * weightKg + bracket.constant;
};

// Katch-McArdle resting energy expenditure from lean mass; null without body fat.
const katchMcArdle = (sheet) => {
  const leanMassKg = computeLeanMassKg(sheet);
  return leanMassKg == null ? null : KATCH_BASE + KATCH_LEAN_FACTOR * leanMassKg;
};

const BMR_FORMULAS = Object.freeze({
  mifflin,
  harris_benedict: harrisBenedict,
  fao_who: faoWho,
  katch_mcardle: katchMcArdle,
});

/**
 * Basal metabolic rate (kcal/day) for a formula and a sheet.
 *
 * @returns {number|null} null when the sheet lacks data the formula needs
 */
export const computeBmr = (formula, sheet) => {
  const calculate = BMR_FORMULAS[formula];
  if (!calculate) throw new Error(`Unknown BMR formula: ${formula}`);
  const hasInputs = sheet && [sheet.age, sheet.weightKg, sheet.heightCm, sheet.sex].every((value) => value != null);
  return hasInputs ? calculate(sheet) : null;
};

// Average kcal/day of an activity: MET x kg x hours x sessions per week / 7.
export const activityKcalPerDay = ({ met, minutes, perWeek }, weightKg) =>
  (met * weightKg * (minutes / MINUTES_PER_HOUR) * perWeek) / DAYS_PER_WEEK;

// Total energy expenditure: BMR x factor + kcal/day of the included activities.
export const computeTee = ({ bmr, factor, activities, weightKg }) => {
  const activityKcal = activities
    .filter((activity) => activity.included)
    .reduce((sum, activity) => sum + activityKcalPerDay(activity, weightKg), 0);
  return bmr * factor + activityKcal;
};

// Suggested kcal target: TEE adjusted by the objective.
export const suggestTarget = (tee, objective) => tee * (1 + (OBJECTIVE_ADJUSTMENT[objective] ?? 0));

// Builds one macro entry (grams, kcal, %VET) from grams.
const macroEntry = (grams, kcalPerGram, targetKcal) => {
  const kcal = grams * kcalPerGram;
  return { grams, kcal, pct: targetKcal > 0 ? (kcal / targetKcal) * PERCENT : 0 };
};

/**
 * Macro targets from g/kg values; with carbIsRemainder the carbs close the kcal target (floored at 0 g).
 */
export const macroTargets = (goals, weightKg) => {
  const { kcal: targetKcal, proteinPerKg, fatPerKg, carbPerKg, carbIsRemainder } = goals;
  const proteinGrams = (proteinPerKg ?? 0) * weightKg;
  const fatGrams = (fatPerKg ?? 0) * weightKg;
  const fixedKcal = proteinGrams * KCAL_PER_GRAM.protein + fatGrams * KCAL_PER_GRAM.fat;
  const carbGrams = carbIsRemainder
    ? Math.max(0, (targetKcal - fixedKcal) / KCAL_PER_GRAM.carbs)
    : (carbPerKg ?? 0) * weightKg;
  const protein = macroEntry(proteinGrams, KCAL_PER_GRAM.protein, targetKcal);
  const fat = macroEntry(fatGrams, KCAL_PER_GRAM.fat, targetKcal);
  const carbs = macroEntry(carbGrams, KCAL_PER_GRAM.carbs, targetKcal);
  const totalKcal = protein.kcal + fat.kcal + carbs.kcal;
  return { protein, carbs, fat, totalKcal, diffKcal: totalKcal - targetKcal };
};

/**
 * Checks whether the macros close the calorie target.
 *
 * @returns {{level: 'ok'|'diff'|'over_target', diffKcal: number}}
 */
export const macroCheck = (macros, { carbIsRemainder }) => {
  const { diffKcal } = macros;
  if (carbIsRemainder && macros.carbs.grams === 0 && diffKcal > 0) return { level: 'over_target', diffKcal };
  if (Math.abs(diffKcal) >= CHECK_DIFF_KCAL) return { level: 'diff', diffKcal };
  return { level: 'ok', diffKcal };
};

// Nutrients of a quantity (g/ml) of a food given its per-100g values.
export const itemNutrients = (per100g, quantity) =>
  Object.fromEntries(NUTRIENT_KEYS.map((key) => [key, round2(((per100g[key] ?? 0) * quantity) / PERCENT)]));

// Sums a list of nutrients objects.
const sumNutrients = (list) => Object.fromEntries(
  NUTRIENT_KEYS.map((key) => [key, round2(list.reduce((sum, nutrients) => sum + (nutrients[key] ?? 0), 0))]),
);

// Totals of the items (per100g + quantity) of one meal option.
export const mealTotals = (items) => sumNutrients(items.map((item) => itemNutrients(item.per100g, item.quantity)));

// Day totals: only option 1 of each meal counts.
export const dayTotals = (meals) => sumNutrients(
  meals
    .map((meal) => meal.options.find((option) => option.position === 1))
    .filter(Boolean)
    .map((option) => mealTotals(option.items)),
);

// Compares a value with a goal: within tolerance is ok; a minimum goal (fiber) is ok when reached.
export const goalStatus = (value, goal, { tolerance = GOAL_TOLERANCE, isMinimum = false } = {}) => {
  if (isMinimum) return value >= goal ? 'ok' : 'low';
  const allowedDeviation = goal * tolerance;
  if (value > goal + allowedDeviation) return 'high';
  if (value < goal - allowedDeviation) return 'low';
  return 'ok';
};

// Quantity of the substitute food that matches the original item protein or kcal (0 when impossible).
export const equivalentQuantity = (original, substitute, basis) => {
  const key = basis === 'kcal' ? 'kcal' : 'protein';
  const perGram = (substitute.per100g[key] ?? 0) / PERCENT;
  if (perGram <= 0) return 0;
  return ((original.per100g[key] ?? 0) * original.quantity) / PERCENT / perGram;
};
