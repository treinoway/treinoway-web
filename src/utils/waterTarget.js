import { WATER_ML_PER_KG } from '../constants/nutrition';

const ML_PER_DECILITRE = 100;

// Suggested water target (35 ml/kg) rounded to 100 ml, null without weight.
export const suggestedWaterMl = (weightKg) =>
  (weightKg ? Math.round((weightKg * WATER_ML_PER_KG) / ML_PER_DECILITRE) * ML_PER_DECILITRE : null);
