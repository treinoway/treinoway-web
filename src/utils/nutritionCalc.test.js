import {
  activityKcalPerDay,
  computeBmr,
  computeLeanMassKg,
  computeTee,
  dayTotals,
  equivalentQuantity,
  goalStatus,
  itemNutrients,
  macroCheck,
  macroTargets,
  mealTotals,
  suggestTarget,
} from './nutritionCalc';

// Same reference patient as the service helper: female, 29 y, 66 kg, 165 cm, 28% body fat.
const SHEET = { sex: 'female', age: 29, weightKg: 66, heightCm: 165, bodyFatPct: 28 };

// Test helper: nutrients.
const nutrients = (kcal, protein, carbs, fat, fiber) => ({ kcal, protein, carbs, fat, fiber });

describe('nutritionCalc', () => {
  describe('computeLeanMassKg (criterion 6)', () => {
    it('is weight x (1 - body fat %)', () => {
      expect(computeLeanMassKg(SHEET)).toBeCloseTo(47.52, 2);
    });
  });

  describe('computeBmr (criterion 6)', () => {
    it('Mifflin-St Jeor = 1385.25 kcal', () => {
      expect(computeBmr('mifflin', SHEET)).toBeCloseTo(1385.25, 2);
    });

    it('Harris-Benedict revised = 1443.50 kcal', () => {
      expect(computeBmr('harris_benedict', SHEET)).toBeCloseTo(1443.5, 1);
    });

    it('FAO/OMS = 1466.20 kcal', () => {
      expect(computeBmr('fao_who', SHEET)).toBeCloseTo(1466.2, 2);
    });

    it('Katch-McArdle uses lean mass = 1396.43 kcal', () => {
      expect(computeBmr('katch_mcardle', SHEET)).toBeCloseTo(1396.43, 2);
    });

    it('uses the male Mifflin offset (+5) for male sheets', () => {
      const male = { ...SHEET, sex: 'male' };
      expect(computeBmr('mifflin', male)).toBeCloseTo(10 * 66 + 6.25 * 165 - 5 * 29 + 5, 2);
    });

    it('rejects an unknown formula', () => {
      expect(() => computeBmr('nope', SHEET)).toThrow(/formula/i);
    });
  });

  describe('activityKcalPerDay (criterion 7)', () => {
    it('MET x kg x hours x sessions per week / 7 (5.0 MET, 60 min, 4x/wk, 66 kg = 188.57)', () => {
      expect(activityKcalPerDay({ met: 5, minutes: 60, perWeek: 4 }, 66)).toBeCloseTo(188.57, 2);
    });

    it('is 0 with no sessions', () => {
      expect(activityKcalPerDay({ met: 5, minutes: 60, perWeek: 0 }, 66)).toBe(0);
    });
  });

  describe('computeTee and suggestTarget (criterion 7)', () => {
    const activities = [
      { name: 'Musculação', met: 5, minutes: 60, perWeek: 4, included: true },
      { name: 'Caminhada', met: 3.5, minutes: 40, perWeek: 3, included: true },
    ];

    it('TEE = BMR x factor + sum of included activities', () => {
      const tee = computeTee({ bmr: 1385.25, factor: 1.2, activities, weightKg: 66 });
      expect(tee).toBeCloseTo(1385.25 * 1.2 + 188.5714 + 66, 1);
    });

    it('leaves out activities that are not included', () => {
      const off = activities.map((a) => (a.name === 'Caminhada' ? { ...a, included: false } : a));
      expect(computeTee({ bmr: 1385.25, factor: 1.2, activities: off, weightKg: 66 })).toBeCloseTo(
        1385.25 * 1.2 + 188.5714,
        1,
      );
    });

    it.each([
      ['maintain', 2000, 2000],
      ['deficit_10', 2000, 1800],
      ['deficit_20', 2000, 1600],
      ['surplus_10', 2000, 2200],
    ])('suggestTarget(%s) = TEE x (1 + adjust)', (objective, tee, expected) => {
      expect(suggestTarget(tee, objective)).toBeCloseTo(expected, 2);
    });
  });

  describe('macroTargets (criterion 9)', () => {
    const goals = { kcal: 1550, proteinPerKg: 1.8, fatPerKg: 0.8, carbPerKg: null, carbIsRemainder: true, fiberMinG: 25 };

    it('turns g/kg into grams, kcal and %VET', () => {
      const macros = macroTargets(goals, 66);
      expect(macros.protein.grams).toBeCloseTo(118.8, 1);
      expect(macros.protein.kcal).toBeCloseTo(475.2, 1);
      expect(macros.protein.pct).toBeCloseTo(30.66, 1);
      expect(macros.fat.grams).toBeCloseTo(52.8, 1);
      expect(macros.fat.kcal).toBeCloseTo(475.2, 1);
    });

    it('lets carbohydrate complete the kcal when carbIsRemainder', () => {
      const macros = macroTargets(goals, 66);
      expect(macros.carbs.kcal).toBeCloseTo(599.6, 1);
      expect(macros.carbs.grams).toBeCloseTo(149.9, 1);
      expect(macros.totalKcal).toBeCloseTo(1550, 1);
      expect(macros.diffKcal).toBeCloseTo(0, 1);
    });

    it('uses carbPerKg when not remainder and reports the kcal difference', () => {
      const macros = macroTargets({ ...goals, carbIsRemainder: false, carbPerKg: 2.3 }, 66);
      expect(macros.carbs.grams).toBeCloseTo(151.8, 1);
      expect(macros.totalKcal).toBeCloseTo(1557.6, 1);
      expect(macros.diffKcal).toBeCloseTo(7.6, 1);
    });

    it('clamps remainder carbohydrate at 0 when protein and fat already pass the target', () => {
      const macros = macroTargets({ ...goals, kcal: 900 }, 66);
      expect(macros.carbs.grams).toBe(0);
    });
  });

  describe('macroCheck (criterion 9)', () => {
    const goals = { kcal: 1550, proteinPerKg: 1.8, fatPerKg: 0.8, carbPerKg: 2.3, carbIsRemainder: false, fiberMinG: 25 };

    it('is ok when the macros close within 5 kcal of the target', () => {
      const macros = macroTargets({ ...goals, carbPerKg: 2.27 }, 66);
      expect(macroCheck(macros, { kcal: 1550, carbIsRemainder: false }).level).toBe('ok');
    });

    it('warns with the difference when it is 5 kcal or more', () => {
      const macros = macroTargets(goals, 66);
      const check = macroCheck(macros, { kcal: 1550, carbIsRemainder: false });
      expect(check.level).toBe('diff');
      expect(check.diffKcal).toBeCloseTo(7.6, 1);
    });

    it('flags "protein and fat already pass the target" for remainder carbs', () => {
      const remainder = { ...goals, kcal: 900, carbIsRemainder: true, carbPerKg: null };
      const macros = macroTargets(remainder, 66);
      expect(macroCheck(macros, { kcal: 900, carbIsRemainder: true }).level).toBe('over_target');
    });
  });

  describe('itemNutrients / mealTotals / dayTotals (criteria 14, 15)', () => {
    const per100g = nutrients(113, 2.2, 25.3, 0.7, 2.1);

    it('scales per-100 g values by the quantity', () => {
      const result = itemNutrients(per100g, 150);
      expect(result.kcal).toBeCloseTo(169.5, 2);
      expect(result.protein).toBeCloseTo(3.3, 2);
      expect(result.carbs).toBeCloseTo(37.95, 2);
      expect(result.fat).toBeCloseTo(1.05, 2);
      expect(result.fiber).toBeCloseTo(3.15, 2);
    });

    it('is all zeros for quantity 0', () => {
      expect(itemNutrients(per100g, 0)).toEqual(nutrients(0, 0, 0, 0, 0));
    });

    it('sums an option from per100g and quantity', () => {
      const items = [
        { per100g: nutrients(100, 10, 20, 1, 2), quantity: 100 },
        { per100g: nutrients(200, 0, 50, 0, 0), quantity: 50 },
      ];
      expect(mealTotals(items)).toEqual(nutrients(200, 10, 45, 1, 2));
    });

    it('day totals take only option 1 of each meal', () => {
      const meals = [
        {
          options: [
            { position: 1, items: [{ per100g: nutrients(100, 10, 20, 1, 2), quantity: 100 }] },
            { position: 2, items: [{ per100g: nutrients(500, 50, 90, 9, 9), quantity: 100 }] },
          ],
        },
        { options: [{ position: 1, items: [{ per100g: nutrients(100, 5, 20, 1, 2), quantity: 300 }] }] },
      ];
      expect(dayTotals(meals)).toEqual(nutrients(400, 25, 80, 4, 8));
    });
  });

  describe('goalStatus (criterion 15)', () => {
    it('is ok within the 5% tolerance', () => {
      expect(goalStatus(1477, 1550, { tolerance: 0.05 })).toBe('ok');
      expect(goalStatus(1475, 1550, { tolerance: 0.05 })).toBe('ok');
      expect(goalStatus(1625, 1550, { tolerance: 0.05 })).toBe('ok');
    });

    it('is low below and high above the tolerance', () => {
      expect(goalStatus(1400, 1550, { tolerance: 0.05 })).toBe('low');
      expect(goalStatus(1700, 1550, { tolerance: 0.05 })).toBe('high');
    });

    it('treats fiber as a minimum: ok when at or above, low below, never high', () => {
      expect(goalStatus(25, 25, { tolerance: 0.05, isMinimum: true })).toBe('ok');
      expect(goalStatus(40, 25, { tolerance: 0.05, isMinimum: true })).toBe('ok');
      expect(goalStatus(24.9, 25, { tolerance: 0.05, isMinimum: true })).toBe('low');
    });
  });

  describe('equivalentQuantity (criterion 18)', () => {
    const original = { quantity: 120, per100g: nutrients(159, 32, 0, 2.5, 0) };

    it('by protein: 120 g @32 g/100 g -> food @35.9 g/100 g = 106.96 g', () => {
      const substitute = { per100g: nutrients(190, 35.9, 0, 6, 0) };
      expect(equivalentQuantity(original, substitute, 'protein')).toBeCloseTo(106.96, 1);
    });

    it('by kcal: keeps the same energy', () => {
      const substitute = { per100g: nutrients(200, 20, 0, 10, 0) };
      expect(equivalentQuantity(original, substitute, 'kcal')).toBeCloseTo(95.4, 1);
    });

    it('returns 0 when the substitute has none of the basis nutrient', () => {
      const substitute = { per100g: nutrients(40, 0, 10, 0, 1) };
      expect(equivalentQuantity(original, substitute, 'protein')).toBe(0);
    });
  });
});
