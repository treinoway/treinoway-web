import api from './axios';
import * as nutrition from './nutrition';

vi.mock('./axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe('nutrition api — meal and option management (fix round B2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(api).forEach((method) => method.mockResolvedValue({ data: { id: 'plan-1' } }));
  });

  it('patchMeal PATCHes /nutritionist/meals/:id with the changes and unwraps the plan', async () => {
    const plan = await nutrition.patchMeal('m1', { name: 'Desjejum', time: '06:30', tip: 'Beber água' });
    expect(api.patch).toHaveBeenCalledWith('/nutritionist/meals/m1', { name: 'Desjejum', time: '06:30', tip: 'Beber água' });
    expect(plan).toEqual({ id: 'plan-1' });
  });

  it('deleteMeal DELETEs /nutritionist/meals/:id and unwraps the plan', async () => {
    const plan = await nutrition.deleteMeal('m1');
    expect(api.delete).toHaveBeenCalledWith('/nutritionist/meals/m1');
    expect(plan).toEqual({ id: 'plan-1' });
  });

  it('reorderMeals PUTs the full id list to /nutritionist/plans/:id/meals/order', async () => {
    const plan = await nutrition.reorderMeals('p1', ['m2', 'm1']);
    expect(api.put).toHaveBeenCalledWith('/nutritionist/plans/p1/meals/order', { mealIds: ['m2', 'm1'] });
    expect(plan).toEqual({ id: 'plan-1' });
  });

  it('deleteOption DELETEs /nutritionist/meal-options/:id and unwraps the plan', async () => {
    const plan = await nutrition.deleteOption('o2');
    expect(api.delete).toHaveBeenCalledWith('/nutritionist/meal-options/o2');
    expect(plan).toEqual({ id: 'plan-1' });
  });
});
