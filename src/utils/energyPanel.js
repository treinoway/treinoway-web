import { computeBmr, computeTee, suggestTarget } from './nutritionCalc';

/**
 * Live energy breakdown for the goals screen: BMR, BMR x factor, activities, TEE, adjustment and suggestion.
 *
 * @returns {object|null} null while the sheet lacks data for the chosen formula
 */
export const buildEnergyPanel = (goals, sheet) => {
  const bmr = computeBmr(goals.bmrFormula, sheet);
  if (bmr == null) return null;
  const base = bmr * goals.activityFactor;
  const tee = computeTee({ bmr, factor: goals.activityFactor, activities: goals.activities, weightKg: sheet.weightKg });
  const activityKcal = tee - base;
  const suggestion = suggestTarget(tee, goals.objective);
  return { bmr, base, activityKcal, tee, adjustment: suggestion - tee, suggestion };
};

// Whether the sheet has everything the calculation needs.
export const isSheetComplete = (sheet) =>
  [sheet?.sex, sheet?.age, sheet?.weightKg, sheet?.heightCm].every((value) => value != null);
