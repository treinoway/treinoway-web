import { buildDayGoals, describeComparison, dayStatus, quantityMap, vetShares, withDraftQuantities, DAY_NUTRIENTS } from './planView';
import { buildPlan, nutrients } from '../test/nutritionFixtures';

describe('planView', () => {
  it('applies a typed quantity and recomputes item and option totals', () => {
    const meals = withDraftQuantities(buildPlan().meals, { 'item-1': '200' });
    const option = meals[0].options[0];
    expect(option.items[0].quantity).toBe(200);
    expect(option.items[0].nutrients.kcal).toBe(200);
    expect(option.totals.kcal).toBe(200);
  });

  it('treats an empty quantity as 0', () => {
    const meals = withDraftQuantities(buildPlan().meals, { 'item-1': '' });
    expect(meals[0].options[0].totals.kcal).toBe(0);
  });

  it('reads the day goals from goals and computed macros', () => {
    expect(buildDayGoals(buildPlan())).toEqual({ kcal: 400, protein: 40, carbs: 80, fat: 4, fiber: 25 });
  });

  it('has null macro goals without computed macros', () => {
    const plan = buildPlan({ computed: { macros: null } });
    expect(buildDayGoals(plan)).toMatchObject({ kcal: 400, protein: null, fiber: 25 });
  });

  it('treats fiber as a minimum', () => {
    const fiber = DAY_NUTRIENTS.find((nutrient) => nutrient.key === 'fiber');
    expect(dayStatus(fiber, 30, 25)).toBe('ok');
    expect(dayStatus(fiber, 20, 25)).toBe('low');
  });

  it('describes an option against option 1', () => {
    const reference = { totals: nutrients(100, 10, 20, 1, 2) };
    const option = { totals: nutrients(200, 0, 50, 0, 0) };
    expect(describeComparison(option, reference)).toBe('Comparada à opção 1: +100 kcal · PTN −10,0 g · CHO +30,0 g · LIP −1,0 g');
  });

  it('maps every item id to its quantity', () => {
    expect(quantityMap(buildPlan())).toEqual({ 'item-1': 100, 'item-2': 300 });
  });

  it('vetShares splits the day kcal between macros and is null without kcal', () => {
    const shares = vetShares(nutrients(400, 20, 57.5, 10, 0));
    expect(shares.protein).toBeCloseTo(20);
    expect(shares.carbs).toBeCloseTo(57.5);
    expect(shares.fat).toBeCloseTo(22.5);
    expect(vetShares(nutrients())).toEqual({ protein: null, carbs: null, fat: null });
  });
});
