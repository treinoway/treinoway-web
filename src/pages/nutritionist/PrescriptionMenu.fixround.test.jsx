import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { act, fireEvent, render, screen, waitFor, within } from '../../test/test-utils';
import { layoutCalls } from '../../test/prescriptionLayoutStub';
import PrescriptionMenu from './PrescriptionMenu';
import { AUTOSAVE_DEBOUNCE_MS } from '../../hooks/usePlanAutosave';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import {
  PATIENT_ID,
  PLAN_ID,
  buildFoodGroups,
  buildGoals,
  buildItem,
  buildMeal,
  buildOption,
  buildPlan,
  nutrients,
} from '../../test/nutritionFixtures';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../components/nutrition/PrescriptionLayout', async () => import('../../test/prescriptionLayoutStub'));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const showToast = vi.fn();
const BASE = `/nutritionist/patients/${PATIENT_ID}`;
const SAVE_TIMEOUT = { timeout: 3000 };
const MENU_ROUTE = `${BASE}/plan/menu`;

// Test helper: api error.
const apiError = (userMessage, status = 422, messageCode = 'nutrition.item.notFound') =>
  Object.assign(new Error(userMessage), { userMessage, response: { status, data: { messageCode } } });

// Test helper: a promise settled from outside.
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

// Test helper: waits longer than the autosave debounce.
const waitPastDebounce = () => new Promise((resolve) => { setTimeout(resolve, AUTOSAVE_DEBOUNCE_MS + 400); });

// Breakfast option 2 (a second option for the first meal).
const secondOption = () => buildOption({
  id: 'opt-1b',
  position: 2,
  items: [buildItem({ id: 'item-tapioca', name: 'Tapioca (goma hidratada)', per100g: nutrients(200, 0, 50, 0, 0), nutrients: nutrients(200, 0, 50, 0, 0) })],
  totals: nutrients(200, 0, 50, 0, 0),
});

// Same plan with the item removed from its option.
const withoutItem = (plan, itemId) => {
  const copy = structuredClone(plan);
  copy.meals.forEach((meal) => meal.options.forEach((option) => {
    option.items = option.items.filter((item) => item.id !== itemId);
    option.totals = nutrients();
  }));
  return copy;
};

// Same plan with one item quantity changed.
const withQuantity = (plan, itemId, quantity) => {
  const copy = structuredClone(plan);
  copy.meals.forEach((meal) => meal.options.forEach((option) => option.items.forEach((item) => {
    if (item.id !== itemId) return;
    item.quantity = quantity;
    Object.keys(item.per100g).forEach((key) => { item.nutrients[key] = (item.per100g[key] * quantity) / 100; });
  })));
  return copy;
};

// Test helper: mock api (GETs only; writes are mocked per test).
const mockApi = ({ plan = buildPlan(), foods = [] } = {}) => {
  api.get.mockImplementation((url) => {
    if (url === `${BASE}/plan`) return Promise.resolve({ data: plan });
    if (url === '/foods') return Promise.resolve({ data: { items: foods } });
    if (url === '/food-groups') return Promise.resolve({ data: buildFoodGroups() });
    return Promise.resolve({ data: {} });
  });
};

// Test helper: render the menu with the neighbouring steps as plain pages.
const renderPage = () => render(
  <MemoryRouter initialEntries={[MENU_ROUTE]}>
    <Routes>
      <Route path="/nutritionist/patients/:patientId/plan/menu" element={<PrescriptionMenu />} />
      <Route path="/nutritionist/patients/:patientId/plan/guidance" element={<p>Tela de orientações</p>} />
      <Route path="/nutritionist/patients/:patientId/plan/goals" element={<p>Tela de metas</p>} />
    </Routes>
  </MemoryRouter>,
);

// Test helper: render loaded.
const renderLoaded = async () => {
  const view = renderPage();
  await screen.findByRole('heading', { name: 'Cardápio' });
  return view;
};

// Test helper: breakfast.
const breakfast = () => screen.getByRole('rowgroup', { name: 'Café da manhã' });
// Test helper: quantity input of an item by its lowercase name.
const quantityInput = (name) => screen.getByLabelText(`Quantidade de ${name}`);
// Test helper: retype number.
const retypeNumber = async (user, input, value) => {
  await user.clear(input);
  await user.type(input, value);
};
// Test helper: opens the three-dot menu of a meal and picks an entry.
const pickMealAction = async (user, mealName, action) => {
  await user.click(within(screen.getByRole('rowgroup', { name: mealName })).getByRole('button', { name: `Ações de ${mealName}` }));
  await user.click(screen.getByRole('button', { name: action }));
};
// Test helper: meal sections in rendered order.
const mealOrder = () => screen.getAllByRole('rowgroup')
  .map((region) => region.getAttribute('aria-label'))
  .filter((name) => ['Café da manhã', 'Almoço', 'Desjejum'].includes(name));

describe('PrescriptionMenu — fix round', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast });
    mockApi();
  });

  describe('B1 — removing an item with an unsaved quantity', () => {
    it('drops the removed item from the pending autosave and still saves the other item', async () => {
      const user = userEvent.setup();
      const plan = buildPlan();
      const afterRemoval = withoutItem(plan, 'item-1');
      api.delete.mockResolvedValue({ data: afterRemoval });
      api.patch.mockImplementation((url, body) => (url === '/nutritionist/items/item-1'
        ? Promise.reject(apiError('Alimento do plano não encontrado.', 404))
        : Promise.resolve({ data: withQuantity(afterRemoval, 'item-2', body.quantity) })));
      await renderLoaded();

      await retypeNumber(user, quantityInput('cuscuz de milho cozido'), '150');
      await user.click(screen.getByRole('button', { name: 'Remover cuscuz de milho cozido' }));
      await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/nutritionist/items/item-1'));
      await retypeNumber(user, quantityInput('arroz integral cozido'), '250');

      await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/nutritionist/items/item-2', { quantity: 250 }), SAVE_TIMEOUT);
      expect(api.patch).not.toHaveBeenCalledWith('/nutritionist/items/item-1', expect.anything());
      expect(await screen.findByText(/^Salvo automaticamente às/)).toBeInTheDocument();
      expect(screen.queryByText(/Não foi possível salvar/)).not.toBeInTheDocument();
    });

    it('never PATCHes a removed item even when nothing else is edited afterwards', async () => {
      const user = userEvent.setup();
      api.delete.mockResolvedValue({ data: withoutItem(buildPlan(), 'item-1') });
      api.patch.mockResolvedValue({ data: buildPlan() });
      await renderLoaded();

      await retypeNumber(user, quantityInput('cuscuz de milho cozido'), '150');
      await user.click(screen.getByRole('button', { name: 'Remover cuscuz de milho cozido' }));
      await waitFor(() => expect(api.delete).toHaveBeenCalled());
      await waitPastDebounce();

      expect(api.patch).not.toHaveBeenCalled();
      expect(screen.queryByText(/Não foi possível salvar/)).not.toBeInTheDocument();
    });
  });

  describe('B2 — meal menu (rename, retime, tip, delete, reorder)', () => {
    const mockMealPatch = (changes) => {
      const renamed = buildPlan();
      Object.assign(renamed.meals[0], changes);
      api.patch.mockResolvedValue({ data: renamed });
    };

    it('renames a meal with PATCH /nutritionist/meals/:id and shows the new name', async () => {
      const user = userEvent.setup();
      mockMealPatch({ name: 'Desjejum' });
      await renderLoaded();

      await pickMealAction(user, 'Café da manhã', 'Editar refeição');
      const dialog = await screen.findByRole('dialog', { name: 'Editar refeição' });
      expect(within(dialog).getByLabelText('Nome da refeição')).toHaveValue('Café da manhã');
      await user.clear(within(dialog).getByLabelText('Nome da refeição'));
      await user.type(within(dialog).getByLabelText('Nome da refeição'), 'Desjejum');
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/nutritionist/meals/meal-1', expect.objectContaining({ name: 'Desjejum' })));
      expect(await screen.findByRole('rowgroup', { name: 'Desjejum' })).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('changes the time of a meal', async () => {
      const user = userEvent.setup();
      mockMealPatch({ time: '06:30' });
      await renderLoaded();

      await pickMealAction(user, 'Café da manhã', 'Editar refeição');
      const dialog = await screen.findByRole('dialog', { name: 'Editar refeição' });
      expect(within(dialog).getByLabelText('Horário')).toHaveValue('07:00');
      fireEvent.change(within(dialog).getByLabelText('Horário'), { target: { value: '06:30' } });
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/nutritionist/meals/meal-1', expect.objectContaining({ time: '06:30' })));
    });

    it('edits the tip for the patient', async () => {
      const user = userEvent.setup();
      mockMealPatch({ tip: 'Beber água antes' });
      await renderLoaded();

      await pickMealAction(user, 'Café da manhã', 'Editar refeição');
      const dialog = await screen.findByRole('dialog', { name: 'Editar refeição' });
      await user.type(within(dialog).getByLabelText('Dica para o paciente (opcional)'), 'Beber água antes');
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/nutritionist/meals/meal-1', expect.objectContaining({ tip: 'Beber água antes' })));
    });

    it('toasts the API error and keeps the modal open when the edit fails', async () => {
      const user = userEvent.setup();
      api.patch.mockRejectedValue(apiError('Refeição não encontrada.', 404, 'nutrition.meal.notFound'));
      await renderLoaded();

      await pickMealAction(user, 'Café da manhã', 'Editar refeição');
      const dialog = await screen.findByRole('dialog', { name: 'Editar refeição' });
      await user.clear(within(dialog).getByLabelText('Nome da refeição'));
      await user.type(within(dialog).getByLabelText('Nome da refeição'), 'Desjejum');
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Refeição não encontrada.', 'error'));
      expect(screen.getByRole('dialog', { name: 'Editar refeição' })).toBeInTheDocument();
    });

    it('deletes a meal only after the ConfirmDialog is confirmed', async () => {
      const user = userEvent.setup();
      const afterDelete = buildPlan();
      afterDelete.meals = afterDelete.meals.filter((meal) => meal.id !== 'meal-1');
      api.delete.mockResolvedValue({ data: afterDelete });
      await renderLoaded();

      await pickMealAction(user, 'Café da manhã', 'Excluir refeição');
      await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
      expect(api.delete).not.toHaveBeenCalled();
      expect(screen.getByRole('rowgroup', { name: 'Café da manhã' })).toBeInTheDocument();

      await pickMealAction(user, 'Café da manhã', 'Excluir refeição');
      await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /^Excluir/ }));

      await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/nutritionist/meals/meal-1'));
      await waitFor(() => expect(screen.queryByRole('rowgroup', { name: 'Café da manhã' })).not.toBeInTheDocument());
    });

    it('moves a meal down and PUTs the full id list', async () => {
      const user = userEvent.setup();
      const reordered = buildPlan();
      reordered.meals = [{ ...reordered.meals[1], order: 1 }, { ...reordered.meals[0], order: 2 }];
      api.put.mockResolvedValue({ data: reordered });
      await renderLoaded();

      await pickMealAction(user, 'Café da manhã', 'Mover para baixo');

      await waitFor(() => expect(api.put).toHaveBeenCalledWith(`/nutritionist/plans/${PLAN_ID}/meals/order`, { mealIds: ['meal-2', 'meal-1'] }));
      await waitFor(() => expect(mealOrder()).toEqual(['Almoço', 'Café da manhã']));
    });

    it('moves a meal up and PUTs the full id list', async () => {
      const user = userEvent.setup();
      api.put.mockResolvedValue({ data: buildPlan() });
      await renderLoaded();

      await pickMealAction(user, 'Almoço', 'Mover para cima');

      await waitFor(() => expect(api.put).toHaveBeenCalledWith(`/nutritionist/plans/${PLAN_ID}/meals/order`, { mealIds: ['meal-2', 'meal-1'] }));
    });

    it('disables moving the first meal up and the last meal down', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(within(breakfast()).getByRole('button', { name: 'Ações de Café da manhã' }));
      expect(screen.getByRole('button', { name: 'Mover para cima' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Mover para baixo' })).toBeEnabled();
    });
  });

  describe('B2 — removing an extra option', () => {
    const planWithSecondOption = () => {
      const plan = buildPlan();
      plan.meals[0].options.push(secondOption());
      return plan;
    };

    const confirmIfAsked = async (user) => {
      const dialog = screen.queryByRole('alertdialog');
      if (dialog) await user.click(within(dialog).getByRole('button', { name: /^(Remover|Excluir)/ }));
    };

    it('removes option 2 with DELETE /nutritionist/meal-options/:id and falls back to option 1', async () => {
      const user = userEvent.setup();
      mockApi({ plan: planWithSecondOption() });
      api.delete.mockResolvedValue({ data: buildPlan() });
      await renderLoaded();

      await user.click(within(breakfast()).getByRole('tab', { name: 'Opção 2' }));
      await user.click(within(breakfast()).getByRole('button', { name: 'Remover opção 2' }));
      await confirmIfAsked(user);

      await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/nutritionist/meal-options/opt-1b'));
      await waitFor(() => expect(within(breakfast()).queryByRole('tab', { name: 'Opção 2' })).not.toBeInTheDocument());
      expect(within(breakfast()).getByText('Cuscuz de milho cozido')).toBeInTheDocument();
    });

    it('offers no removal for option 1', async () => {
      mockApi({ plan: planWithSecondOption() });
      await renderLoaded();

      expect(within(breakfast()).queryByRole('button', { name: /Remover opção/ })).not.toBeInTheDocument();
    });

    it('offers no removal when the meal has a single option', async () => {
      await renderLoaded();
      expect(within(breakfast()).queryByRole('button', { name: /Remover opção/ })).not.toBeInTheDocument();
    });
  });

  describe('autosave of quantities', () => {
    it.each([
      ['empty', async (user, input) => user.clear(input)],
      ['zero', async (user, input) => retypeNumber(user, input, '0')],
      ['negative', async (user, input) => retypeNumber(user, input, '-5')],
    ])('shows an inline .form-error, never reports "Salvo" and sends no PATCH for an %s quantity', async (_label, edit) => {
      const user = userEvent.setup();
      await renderLoaded();
      const input = quantityInput('cuscuz de milho cozido');

      await edit(user, input);
      await waitPastDebounce();

      const row = input.closest('tr');
      expect(row.querySelector('.form-error')).not.toBeNull();
      expect(row.querySelector('.form-error')).toHaveTextContent(/\S/);
      expect(api.patch).not.toHaveBeenCalled();
      expect(screen.queryByText(/Salvo automaticamente/)).not.toBeInTheDocument();
    });

    it('clears the error and saves once the quantity is valid again', async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValue({ data: withQuantity(buildPlan(), 'item-1', 120) });
      await renderLoaded();
      const input = quantityInput('cuscuz de milho cozido');

      await retypeNumber(user, input, '0');
      expect(input.closest('tr').querySelector('.form-error')).not.toBeNull();
      await retypeNumber(user, input, '120');

      expect(input.closest('tr').querySelector('.form-error')).toBeNull();
      await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/nutritionist/items/item-1', { quantity: 120 }), SAVE_TIMEOUT);
    });
  });

  describe('step navigation waits for the autosave (onBeforeNavigate, used by the layout links)', () => {
    it('resolves only after the pending PATCH succeeds', async () => {
      const user = userEvent.setup();
      const pending = deferred();
      api.patch.mockImplementation(() => pending.promise);
      await renderLoaded();

      await retypeNumber(user, quantityInput('cuscuz de milho cozido'), '150');
      let outcome;
      const flushing = layoutCalls.last.onBeforeNavigate().then((saved) => { outcome = saved; });

      await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/nutritionist/items/item-1', { quantity: 150 }));
      expect(outcome).toBeUndefined();

      await act(async () => {
        pending.resolve({ data: withQuantity(buildPlan(), 'item-1', 150) });
        await flushing;
      });
      expect(outcome).toBe(true);
    });

    it('resolves false and shows the server reason when the flush fails', async () => {
      const user = userEvent.setup();
      api.patch.mockRejectedValue(apiError('Quantidade acima do limite.', 422, 'validation.failed'));
      await renderLoaded();

      await retypeNumber(user, quantityInput('cuscuz de milho cozido'), '150');
      let saved;
      await act(async () => { saved = await layoutCalls.last.onBeforeNavigate(); });

      expect(saved).toBe(false);
      expect(await screen.findByText(/Quantidade acima do limite\./)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Cardápio' })).toBeInTheDocument();
    });

    it('resolves true straight away when there is nothing unsaved', async () => {
      await renderLoaded();
      let saved;
      await act(async () => { saved = await layoutCalls.last.onBeforeNavigate(); });
      expect(saved).toBe(true);
      expect(api.patch).not.toHaveBeenCalled();
    });

    it('"Editar metas" navigates only after the pending PATCH succeeds', async () => {
      const user = userEvent.setup();
      const pending = deferred();
      api.patch.mockImplementation(() => pending.promise);
      await renderLoaded();

      await retypeNumber(user, quantityInput('cuscuz de milho cozido'), '150');
      await user.click(screen.getByRole('link', { name: 'Editar metas' }));

      await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/nutritionist/items/item-1', { quantity: 150 }));
      expect(screen.queryByText('Tela de metas')).not.toBeInTheDocument();

      pending.resolve({ data: withQuantity(buildPlan(), 'item-1', 150) });
      expect(await screen.findByText('Tela de metas')).toBeInTheDocument();
    });

    it('"Editar metas" stays on the page when the flush fails', async () => {
      const user = userEvent.setup();
      api.patch.mockRejectedValue(apiError('Quantidade acima do limite.', 422, 'validation.failed'));
      await renderLoaded();

      await retypeNumber(user, quantityInput('cuscuz de milho cozido'), '150');
      await user.click(screen.getByRole('link', { name: 'Editar metas' }));

      expect(await screen.findByText(/Quantidade acima do limite\./)).toBeInTheDocument();
      expect(screen.queryByText('Tela de metas')).not.toBeInTheDocument();
    });

    it('"Editar metas" navigates straight away when nothing is unsaved', async () => {
      const user = userEvent.setup();
      await renderLoaded();
      await user.click(screen.getByRole('link', { name: 'Editar metas' }));
      expect(await screen.findByText('Tela de metas')).toBeInTheDocument();
      expect(api.patch).not.toHaveBeenCalled();
    });
  });

  describe('"+ Substituta" in the meal header', () => {
    it('adds an option to the meal (never a per-item substitute) and selects it', async () => {
      const user = userEvent.setup();
      const withOption = buildPlan();
      withOption.meals[0].options.push(secondOption());
      api.post.mockResolvedValue({ data: withOption });
      await renderLoaded();

      await user.click(within(breakfast()).getByRole('button', { name: '+ Substituta' }));

      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/nutritionist/meals/meal-1/options'));
      expect(api.post.mock.calls.map(([url]) => url).some((url) => url.includes('/substitutes'))).toBe(false);
      expect(await within(breakfast()).findByRole('tab', { name: 'Opção 2', selected: true })).toBeInTheDocument();
      expect(within(breakfast()).getByText('Tapioca (goma hidratada)')).toBeInTheDocument();
    });

    it('offers one "+ Substituta" per meal, not per item', async () => {
      await renderLoaded();
      expect(within(breakfast()).getAllByRole('button', { name: /Substituta/ })).toHaveLength(1);
      expect(within(screen.getByRole('rowgroup', { name: 'Almoço' })).getAllByRole('button', { name: /Substituta/ })).toHaveLength(1);
    });
  });

  describe('"Distribuição do VET"', () => {
    const vetPlan = () => {
      const food = nutrients(400, 20, 57.5, 10, 0);
      return buildPlan({
        goals: buildGoals({ kcalTarget: 1800 }),
        meals: [buildMeal({ options: [buildOption({ items: [buildItem({ quantity: 100, per100g: food, nutrients: food })], totals: food })] })],
        computed: {
          ...buildPlan().computed,
          macros: {
            protein: { grams: 135, kcal: 540, pct: 30 },
            carbs: { grams: 202.5, kcal: 810, pct: 45 },
            fat: { grams: 50, kcal: 450, pct: 25 },
            totalKcal: 1800,
            diffKcal: 0,
          },
        },
      });
    };

    const vetRow = (label) => within(screen.getByRole('region', { name: 'Distribuição do VET' })).getByText(new RegExp(`^${label}`)).closest('li');

    it('shows protein, carbs and fat as % of the day total next to the goal %', async () => {
      mockApi({ plan: vetPlan() });
      await renderLoaded();

      expect(vetRow('Proteína')).toHaveTextContent(/(^|\D)20,0\s?%/);
      expect(vetRow('Proteína')).toHaveTextContent(/meta 30,0\s?%/);
      expect(vetRow('Carboidrato')).toHaveTextContent(/57,5\s?%/);
      expect(vetRow('Carboidrato')).toHaveTextContent(/meta 45,0\s?%/);
      expect(vetRow('Lipídio')).toHaveTextContent(/22,5\s?%/);
      expect(vetRow('Lipídio')).toHaveTextContent(/meta 25,0\s?%/);
    });

    it('updates the distribution live while a quantity is edited', async () => {
      const user = userEvent.setup();
      mockApi({ plan: vetPlan() });
      await renderLoaded();

      await retypeNumber(user, quantityInput('cuscuz de milho cozido'), '200');

      expect(vetRow('Proteína')).toHaveTextContent(/(^|\D)20,0\s?%/);
      expect(vetRow('Carboidrato')).toHaveTextContent(/57,5\s?%/);
    });
  });
});
