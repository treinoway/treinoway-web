import { act, renderHook } from '../test/test-utils';
import useMenuEditor, { sortByOrder } from './useMenuEditor';
import * as nutrition from '../api/nutrition';
import { useToast } from '../contexts/ToastContext';
import { PLAN_ID, buildMeal, buildPlan } from '../test/nutritionFixtures';

vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../api/nutrition', () => ({
  addItem: vi.fn(),
  addMeal: vi.fn(),
  addOption: vi.fn(),
  deleteItem: vi.fn(),
  deleteMeal: vi.fn(),
  deleteOption: vi.fn(),
  patchItem: vi.fn(),
  patchMeal: vi.fn(),
  reorderMeals: vi.fn(),
}));

// Test helper: renders the hook on the default plan.
const renderEditor = (plan = buildPlan()) => renderHook(() => useMenuEditor(plan));

describe('useMenuEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
  });

  describe('sortByOrder', () => {
    it('sorts meals by order without mutating the input', () => {
      const meals = [buildMeal({ id: 'b', order: 2 }), buildMeal({ id: 'a', order: 1 })];
      expect(sortByOrder(meals).map((meal) => meal.id)).toEqual(['a', 'b']);
      expect(meals[0].id).toBe('b');
    });
  });

  describe('quantity drafts', () => {
    it('saves a valid typed quantity with PATCH and applies the returned plan', async () => {
      const updated = buildPlan({ id: 'updated' });
      vi.mocked(nutrition.patchItem).mockResolvedValue(updated);
      const { result } = renderEditor();

      act(() => result.current.handlers.onQuantityChange('item-1', '150'));
      let saved;
      await act(async () => { saved = await result.current.autosave.flush(); });

      expect(saved).toBe(true);
      expect(nutrition.patchItem).toHaveBeenCalledWith('item-1', { quantity: 150 });
      expect(result.current.plan.id).toBe('updated');
    });

    it.each(['', '0', '-4'])('rejects the quantity "%s" with an error and no PATCH', async (raw) => {
      const { result } = renderEditor();

      act(() => result.current.handlers.onQuantityChange('item-1', raw));
      let saved;
      await act(async () => { saved = await result.current.autosave.flush(); });

      expect(saved).toBe(false);
      expect(nutrition.patchItem).not.toHaveBeenCalled();
      expect(result.current.autosave.status).toBe('error');
      expect(result.current.autosave.statusText).toContain('Corrija as quantidades');
    });

    it('drops the draft of a removed item', async () => {
      vi.mocked(nutrition.deleteItem).mockResolvedValue(buildPlan());
      const { result } = renderEditor();
      act(() => result.current.handlers.onQuantityChange('item-1', '150'));
      expect(result.current.drafts['item-1']).toBe('150');

      await act(async () => { await result.current.handlers.onRemoveItem({ id: 'item-1' }); });

      expect(nutrition.deleteItem).toHaveBeenCalledWith('item-1');
      expect(result.current.drafts).toEqual({});
    });

    it('keeps the draft when the removal fails', async () => {
      vi.mocked(nutrition.deleteItem).mockRejectedValue(Object.assign(new Error('x'), { userMessage: 'Falhou' }));
      const { result } = renderEditor();
      act(() => result.current.handlers.onQuantityChange('item-1', '150'));

      await act(async () => { await result.current.handlers.onRemoveItem({ id: 'item-1' }); });

      expect(result.current.drafts['item-1']).toBe('150');
    });
  });

  describe('meal actions', () => {
    it('patches the edited meal, applies the plan and closes the editor', async () => {
      const updated = buildPlan({ id: 'renamed' });
      vi.mocked(nutrition.patchMeal).mockResolvedValue(updated);
      const { result } = renderEditor();
      act(() => result.current.mealActions.setEditingMeal({ id: 'meal-1' }));

      await act(async () => { await result.current.mealActions.saveMeal({ name: 'Desjejum', time: '06:30', tip: null }); });

      expect(nutrition.patchMeal).toHaveBeenCalledWith('meal-1', { name: 'Desjejum', time: '06:30', tip: null });
      expect(result.current.plan.id).toBe('renamed');
      expect(result.current.mealActions.editingMeal).toBeNull();
    });

    it('keeps the editor open when the patch fails', async () => {
      vi.mocked(nutrition.patchMeal).mockRejectedValue(Object.assign(new Error('x'), { userMessage: 'Falhou' }));
      const { result } = renderEditor();
      act(() => result.current.mealActions.setEditingMeal({ id: 'meal-1' }));

      await act(async () => { await result.current.mealActions.saveMeal({ name: 'X', time: '06:30', tip: null }); });

      expect(result.current.mealActions.editingMeal).toEqual({ id: 'meal-1' });
    });

    it('creates a meal with POST, applies the plan and closes the add form', async () => {
      vi.mocked(nutrition.addMeal).mockResolvedValue(buildPlan({ id: 'with-meal' }));
      const { result } = renderEditor();
      act(() => result.current.handlers.onAddMeal());
      expect(result.current.mealActions.addingMeal).toBe(true);

      await act(async () => { await result.current.mealActions.createMeal({ name: 'Ceia', time: '22:00' }); });

      expect(nutrition.addMeal).toHaveBeenCalledWith(PLAN_ID, { name: 'Ceia', time: '22:00' });
      expect(result.current.plan.id).toBe('with-meal');
      expect(result.current.mealActions.addingMeal).toBe(false);
    });

    it('keeps the add form open when creating the meal fails', async () => {
      vi.mocked(nutrition.addMeal).mockRejectedValue(Object.assign(new Error('x'), { userMessage: 'Falhou' }));
      const { result } = renderEditor();
      act(() => result.current.handlers.onAddMeal());

      await act(async () => { await result.current.mealActions.createMeal({ name: 'Ceia', time: '22:00' }); });

      expect(result.current.mealActions.addingMeal).toBe(true);
    });

    it('offers no per-item substitute handler (swaps live in the plan summary)', () => {
      const { result } = renderEditor();
      expect(result.current.handlers.onAddSubstitute).toBeUndefined();
    });

    it('deletes a meal only after the confirmation and applies the response', async () => {
      vi.mocked(nutrition.deleteMeal).mockResolvedValue(buildPlan({ id: 'after-delete' }));
      const { result } = renderEditor();

      act(() => result.current.mealActions.confirmDeleteMeal({ id: 'meal-1', name: 'Café da manhã' }));
      expect(nutrition.deleteMeal).not.toHaveBeenCalled();
      await act(async () => { await result.current.dialogProps.onConfirm(); });

      expect(nutrition.deleteMeal).toHaveBeenCalledWith('meal-1');
      expect(result.current.plan.id).toBe('after-delete');
    });

    it('removes an option only after the confirmation', async () => {
      vi.mocked(nutrition.deleteOption).mockResolvedValue(buildPlan({ id: 'after-option' }));
      const { result } = renderEditor();

      act(() => result.current.mealActions.confirmRemoveOption({ id: 'opt-1b', position: 2 }));
      expect(nutrition.deleteOption).not.toHaveBeenCalled();
      await act(async () => { await result.current.dialogProps.onConfirm(); });

      expect(nutrition.deleteOption).toHaveBeenCalledWith('opt-1b');
      expect(result.current.plan.id).toBe('after-option');
    });

    it('moves a meal by PUTting the full reordered id list', async () => {
      vi.mocked(nutrition.reorderMeals).mockResolvedValue(buildPlan({ id: 'reordered' }));
      const { result } = renderEditor();
      const first = result.current.plan.meals[0];

      await act(async () => { await result.current.mealActions.moveMeal(first, 1); });

      expect(nutrition.reorderMeals).toHaveBeenCalledWith(PLAN_ID, ['meal-2', 'meal-1']);
      expect(result.current.plan.id).toBe('reordered');
    });
  });
});
