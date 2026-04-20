import { describe, it, expect } from 'vitest';
import {
  aggregateMealsMacros,
  formatMacro,
  calculateMacroPercentages,
  recalcMacrosForQuantity,
  calculateGoalDelta,
  getDeltaSeverity,
} from './dietMacros';

describe('aggregateMealsMacros', () => {
  it('returns zeros for empty meals', () => {
    expect(aggregateMealsMacros([])).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });

  it('sums macros across meals and food items', () => {
    const meals = [
      {
        foodItems: [
          { kcal: 100, proteinG: 20, carbsG: 10, fatG: 5 },
          { kcal: 50, proteinG: 5, carbsG: 8, fatG: 2 },
        ],
      },
      {
        foodItems: [{ kcal: 200, proteinG: 30, carbsG: 20, fatG: 10 }],
      },
    ];
    expect(aggregateMealsMacros(meals)).toEqual({
      kcal: 350,
      proteinG: 55,
      carbsG: 38,
      fatG: 17,
    });
  });

  it('handles null macro values gracefully', () => {
    const meals = [
      { foodItems: [{ kcal: null, proteinG: null, carbsG: null, fatG: null }] },
    ];
    expect(aggregateMealsMacros(meals)).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });

  it('handles meals with no foodItems', () => {
    const meals = [{ foodItems: [] }, {}];
    expect(aggregateMealsMacros(meals)).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });
});

describe('formatMacro', () => {
  it('returns em-dash for null', () => {
    expect(formatMacro(null)).toBe('—');
  });

  it('returns em-dash for undefined', () => {
    expect(formatMacro(undefined)).toBe('—');
  });

  it('rounds to integer', () => {
    expect(formatMacro(25.7)).toBe('26');
    expect(formatMacro(25.2)).toBe('25');
  });

  it('returns 0 as string for zero (non-nullish mode)', () => {
    expect(formatMacro(0)).toBe('0');
  });

  it('returns em-dash for zero when nullish=true', () => {
    expect(formatMacro(0, true)).toBe('—');
  });
});

describe('calculateMacroPercentages', () => {
  it('returns zeros when all macros are zero', () => {
    expect(calculateMacroPercentages(0, 0, 0)).toEqual({ protein: 0, carbs: 0, fat: 0 });
  });

  it('calculates percentages correctly', () => {
    // 25g prot = 100 kcal, 25g carbs = 100 kcal, 11.11g fat = 100 kcal → 33/33/33
    const result = calculateMacroPercentages(25, 25, 11.11);
    expect(result.protein).toBe(33);
    expect(result.carbs).toBe(33);
    expect(result.fat).toBe(33);
  });
});

describe('recalcMacrosForQuantity', () => {
  const food = {
    kcalPer100g: 200,
    proteinGPer100g: 20,
    carbsGPer100g: 10,
    fatGPer100g: 5,
  };

  it('returns nulls when food is null', () => {
    const result = recalcMacrosForQuantity(null, 100);
    expect(result).toEqual({ kcal: null, proteinG: null, carbsG: null, fatG: null });
  });

  it('scales correctly for 50g', () => {
    const result = recalcMacrosForQuantity(food, 50);
    expect(result).toEqual({ kcal: 100, proteinG: 10, carbsG: 5, fatG: 2.5 });
  });

  it('scales correctly for 200g', () => {
    const result = recalcMacrosForQuantity(food, 200);
    expect(result).toEqual({ kcal: 400, proteinG: 40, carbsG: 20, fatG: 10 });
  });

  it('returns null for macros not present in food', () => {
    const partialFood = { kcalPer100g: 100, proteinGPer100g: null, carbsGPer100g: null, fatGPer100g: null };
    const result = recalcMacrosForQuantity(partialFood, 100);
    expect(result.kcal).toBe(100);
    expect(result.proteinG).toBeNull();
    expect(result.carbsG).toBeNull();
    expect(result.fatG).toBeNull();
  });
});

describe('calculateGoalDelta', () => {
  it('returns null when target is missing', () => {
    expect(calculateGoalDelta(2000, null)).toBeNull();
    expect(calculateGoalDelta(2000, 0)).toBeNull();
  });

  it('calculates positive delta when above target', () => {
    const delta = calculateGoalDelta(2200, 2000);
    expect(delta).toBeCloseTo(10, 1);
  });

  it('calculates negative delta when below target', () => {
    const delta = calculateGoalDelta(1800, 2000);
    expect(delta).toBeCloseTo(-10, 1);
  });
});

describe('getDeltaSeverity', () => {
  it('returns ok for delta <= 10%', () => {
    expect(getDeltaSeverity(5)).toBe('ok');
    expect(getDeltaSeverity(-5)).toBe('ok');
    expect(getDeltaSeverity(10)).toBe('ok');
  });

  it('returns warn for delta 10–25%', () => {
    expect(getDeltaSeverity(15)).toBe('warn');
    expect(getDeltaSeverity(-20)).toBe('warn');
    expect(getDeltaSeverity(25)).toBe('warn');
  });

  it('returns danger for delta > 25%', () => {
    expect(getDeltaSeverity(30)).toBe('danger');
    expect(getDeltaSeverity(-50)).toBe('danger');
  });
});
