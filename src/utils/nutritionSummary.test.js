import { itemsSummary, pickNextMeal, shortName } from './nutritionSummary';

describe('shortName', () => {
  it('keeps the first segment before the comma', () => {
    expect(shortName('Cuscuz, de milho, cozido com sal')).toBe('Cuscuz');
  });

  it('returns the whole name without a comma and tolerates empty values', () => {
    expect(shortName('Mamão')).toBe('Mamão');
    expect(shortName('')).toBe('');
    expect(shortName(undefined)).toBe('');
  });
});

describe('itemsSummary', () => {
  it('joins the short names of the items', () => {
    const items = [{ name: 'Cuscuz, de milho' }, { name: 'Ovo, cozido' }, { name: 'Mamão' }];
    expect(itemsSummary(items)).toBe('Cuscuz, Ovo, Mamão');
  });

  it('is empty for no items', () => {
    expect(itemsSummary([])).toBe('');
  });
});

describe('pickNextMeal', () => {
  const meals = [
    { id: 'b', time: '12:30', order: 2 },
    { id: 'a', time: '07:00', order: 1 },
    { id: 'c', time: '20:00', order: 3 },
  ];

  it('picks the first meal that has not started yet', () => {
    expect(pickNextMeal(meals, new Date(2026, 10, 1, 9, 0)).id).toBe('b');
  });

  it('keeps a meal at the exact time as the next one', () => {
    expect(pickNextMeal(meals, new Date(2026, 10, 1, 12, 30)).id).toBe('b');
  });

  it('wraps to the first meal of the day after the last one', () => {
    expect(pickNextMeal(meals, new Date(2026, 10, 1, 21, 0)).id).toBe('a');
  });

  it('returns undefined without meals', () => {
    expect(pickNextMeal([], new Date())).toBeUndefined();
  });
});
