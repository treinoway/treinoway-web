import api from './axios';
import * as nutrition from './nutrition';

vi.mock('./axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe('nutrition api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(api).forEach((method) => method.mockResolvedValue({ data: { ok: true } }));
  });

  it('lists patients and unwraps the body', async () => {
    expect(await nutrition.listPatients()).toEqual({ ok: true });
    expect(api.get).toHaveBeenCalledWith('/nutritionist/patients');
  });

  it('searches foods with the three sources by default and only the given filters', async () => {
    await nutrition.searchFoods({ q: 'arroz', groupId: 'g1' });
    expect(api.get).toHaveBeenCalledWith('/foods', { params: { sources: 'taco,tbca,custom', limit: 20, q: 'arroz', groupId: 'g1' } });
    await nutrition.searchFoods({});
    expect(api.get).toHaveBeenLastCalledWith('/foods', { params: { sources: 'taco,tbca,custom', limit: 20 } });
  });

  it('lists only own foods', async () => {
    await nutrition.listMyFoods();
    expect(api.get).toHaveBeenCalledWith('/foods', { params: { sources: 'custom', limit: 100 } });
  });

  it('maps plan writes to their endpoints', async () => {
    await nutrition.patchGoals('p1', { kcalTarget: 1 });
    await nutrition.publishPlan('p1');
    await nutrition.addSubstitute('i1', 'f1');
    await nutrition.deleteSubstitute('s1');
    expect(api.patch).toHaveBeenCalledWith('/nutritionist/plans/p1/goals', { kcalTarget: 1 });
    expect(api.post).toHaveBeenCalledWith('/nutritionist/plans/p1/publish');
    expect(api.post).toHaveBeenCalledWith('/nutritionist/items/i1/substitutes', { foodId: 'f1' });
    expect(api.delete).toHaveBeenCalledWith('/nutritionist/substitutes/s1');
  });

  it('becomes a nutritionist without a body', async () => {
    await nutrition.becomeNutritionist();
    expect(api.patch).toHaveBeenCalledWith('/become-nutritionist');
  });
});
