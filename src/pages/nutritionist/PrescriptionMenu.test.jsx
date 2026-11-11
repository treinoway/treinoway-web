import userEvent from '@testing-library/user-event';
import { act, fireEvent, renderWithRoute, screen, waitFor, within } from '../../test/test-utils';
import { layoutCalls } from '../../test/prescriptionLayoutStub';
import PrescriptionMenu from './PrescriptionMenu';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import {
  PATIENT_ID,
  buildFood,
  buildFoodGroups,
  buildItem,
  buildOption,
  buildOverview,
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

// Test helper: api error.
const apiError = (userMessage, status = 422, messageCode = 'nutrition.meal.maxOptions') =>
  Object.assign(new Error(userMessage), { userMessage, response: { status, data: { messageCode } } });

// Breakfast option 2: 100 g of a 200 kcal / 0 g protein / 50 g carb food.
const tapiocaOption = () =>
  buildOption({
    id: 'opt-1b',
    position: 2,
    items: [
      buildItem({
        id: 'item-tapioca',
        foodId: 'food-tapioca',
        name: 'Tapioca (goma hidratada)',
        source: 'tbca',
        householdMeasure: '3 col. de sopa',
        per100g: nutrients(200, 0, 50, 0, 0),
        nutrients: nutrients(200, 0, 50, 0, 0),
      }),
    ],
    totals: nutrients(200, 0, 50, 0, 0),
  });

// Test helper: plan with options.
const planWithOptions = () => {
  const plan = buildPlan();
  plan.meals[0].options.push(tapiocaOption());
  return plan;
};

// Same plan with one item quantity changed, nutrients recomputed from per-100 g.
const withQuantity = (plan, itemId, quantity) => {
  const copy = structuredClone(plan);
  copy.meals.forEach((meal) => meal.options.forEach((option) => option.items.forEach((item) => {
    if (item.id !== itemId) return;
    item.quantity = quantity;
    Object.keys(item.per100g).forEach((key) => { item.nutrients[key] = (item.per100g[key] * quantity) / 100; });
  })));
  return copy;
};

// Test helper: mock api.
const mockApi = ({ plan = buildPlan(), foods = [] } = {}) => {
  api.get.mockImplementation((url) => {
    if (url === `${BASE}/plan`) return Promise.resolve({ data: plan });
    if (url === `${BASE}/overview`) return Promise.resolve({ data: buildOverview() });
    if (url === '/foods') return Promise.resolve({ data: { items: foods } });
    if (url === '/food-groups') return Promise.resolve({ data: buildFoodGroups() });
    return Promise.resolve({ data: {} });
  });
};

// Test helper: render page.
const renderPage = () =>
  renderWithRoute(<PrescriptionMenu />, { route: `${BASE}/plan/menu`, path: '/nutritionist/patients/:patientId/plan/menu' });

// Test helper: render loaded.
const renderLoaded = async () => {
  const view = renderPage();
  await screen.findByRole('heading', { name: 'Cardápio' });
  return view;
};

// Test helper: breakfast.
const breakfast = () => screen.getByRole('rowgroup', { name: 'Café da manhã' });
// Test helper: lunch.
const lunch = () => screen.getByRole('rowgroup', { name: 'Almoço' });
// Test helper: tile.
const tile = (name) => screen.getByRole('progressbar', { name }).closest('.nutrient-goal-tile');
// Test helper: retype number.
const retypeNumber = async (user, input, value) => {
  await user.clear(input);
  await user.type(input, value);
};

describe('PrescriptionMenu (tela C)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast });
    mockApi();
  });

  describe('states', () => {
    it('shows the loading state first', () => {
      api.get.mockImplementation(() => new Promise(() => {}));
      renderPage();
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Cardápio' })).not.toBeInTheDocument();
    });

    it('shows an error with retry when the plan fails to load', async () => {
      const user = userEvent.setup();
      api.get.mockRejectedValueOnce(Object.assign(new Error('x'), { userMessage: 'Erro interno do servidor.' }));
      renderPage();

      expect(await screen.findByText('Erro interno do servidor.')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

      expect(await screen.findByRole('heading', { name: 'Cardápio' })).toBeInTheDocument();
    });

    it('shows an empty hint when the plan has no meals', async () => {
      mockApi({ plan: buildPlan({ meals: [] }) });
      await renderLoaded();
      expect(screen.getByText(/Nenhuma refeição/)).toBeInTheDocument();
    });

    it('shows an empty hint inside a meal that has no items', async () => {
      const plan = buildPlan();
      plan.meals[0].options[0].items = [];
      plan.meals[0].options[0].totals = nutrients();
      mockApi({ plan });
      await renderLoaded();
      expect(within(breakfast()).getByText(/Sem alimentos nesta opção/)).toBeInTheDocument();
    });
  });

  describe('shell and navigation', () => {
    it('wraps the page in PrescriptionLayout for the menu step with the patient, plan, title and subtitle', async () => {
      await renderLoaded();
      expect(layoutCalls.last).toEqual(expect.objectContaining({
        step: 'menu',
        title: 'Cardápio',
        subtitle: 'Muda a quantidade de qualquer item e os totais se ajustam na hora.',
        patient: expect.objectContaining({ id: PATIENT_ID, firstName: 'Luiza', weightKg: 66 }),
        plan: expect.objectContaining({ id: 'plan-1' }),
      }));
    });

    it('still renders when the overview fails to load', async () => {
      api.get.mockImplementation((url) => {
        if (url === `${BASE}/overview`) return Promise.reject(new Error('x'));
        if (url === `${BASE}/plan`) return Promise.resolve({ data: buildPlan() });
        return Promise.resolve({ data: { items: [] } });
      });
      await renderLoaded();
      expect(layoutCalls.last.patient).toEqual({ id: PATIENT_ID });
    });

    it('"Editar metas" links to the goals step', async () => {
      await renderLoaded();
      expect(screen.getByRole('link', { name: 'Editar metas' })).toHaveAttribute('href', `${BASE}/plan/goals`);
      expect(screen.getByText('Total do dia contra as metas')).toBeInTheDocument();
      expect(screen.getByText(/Metas da etapa 1 · tolerância de 5% · considera a opção 1 de cada refeição/)).toBeInTheDocument();
    });

    it('exposes the pending autosave to the layout through onBeforeNavigate', async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValue({ data: withQuantity(buildPlan(), 'item-1', 200) });
      await renderLoaded();
      await retypeNumber(user, screen.getByLabelText(/Quantidade de cuscuz de milho cozido/i), '200');

      let saved;
      await act(async () => { saved = await layoutCalls.last.onBeforeNavigate(); });

      expect(saved).toBe(true);
      expect(api.patch).toHaveBeenCalledWith('/nutritionist/items/item-1', { quantity: 200 });
    });

    it('shows the save status text in the layout footer', async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValue({ data: withQuantity(buildPlan(), 'item-1', 200) });
      await renderLoaded();
      await retypeNumber(user, screen.getByLabelText(/Quantidade de cuscuz de milho cozido/i), '200');
      expect(await screen.findByText(/^Salvo automaticamente às \d{2}:\d{2}$/, {}, SAVE_TIMEOUT)).toBeInTheDocument();
    });
  });

  describe('day vs goals tiles (DS NutrientGoalTile, criterion 15)', () => {
    it('renders five tiles: Energia, Proteína, Carboidrato, Lipídio and Fibras', async () => {
      const { container } = await renderLoaded();
      ['Energia', 'Proteína', 'Carboidrato', 'Lipídio', 'Fibras'].forEach((name) => {
        expect(screen.getByRole('progressbar', { name })).toBeInTheDocument();
      });
      expect(container.querySelectorAll('.nutrient-goal-tile')).toHaveLength(5);
    });

    it('marks energy, carbs and fat as "NA META" and protein/fiber as below target', async () => {
      await renderLoaded();
      expect(within(tile('Energia')).getByText('NA META')).toBeInTheDocument();
      expect(within(tile('Energia')).getByText(/\/\s*400 kcal/)).toBeInTheDocument();
      expect(within(tile('Carboidrato')).getByText('NA META')).toBeInTheDocument();
      expect(within(tile('Lipídio')).getByText('NA META')).toBeInTheDocument();
      expect(within(tile('Proteína')).getByText(/ABAIXO\s+−15,0\s+g/)).toBeInTheDocument();
      expect(within(tile('Fibras')).getByText(/ABAIXO\s+−17,0\s+g/)).toBeInTheDocument();
    });

    it('treats fiber as a minimum: reaching it reads "NA META"', async () => {
      const plan = buildPlan();
      plan.goals.fiberMinG = 8;
      mockApi({ plan });
      await renderLoaded();
      expect(within(tile('Fibras')).getByText('NA META')).toBeInTheDocument();
    });

    it('adds the context line of each tile: share of the goal, g/kg and VET share', async () => {
      await renderLoaded();
      expect(within(tile('Energia')).getByText('100% da meta')).toBeInTheDocument();
      expect(within(tile('Proteína')).getByText('0,4 de 0,6 g/kg')).toBeInTheDocument();
      expect(within(tile('Carboidrato')).getByText('80,0% do VET')).toBeInTheDocument();
      expect(within(tile('Fibras')).getByText('mínimo de 25 g')).toBeInTheDocument();
    });

    it('only counts option 1 of each meal', async () => {
      const user = userEvent.setup();
      mockApi({ plan: planWithOptions() });
      await renderLoaded();

      await user.click(within(breakfast()).getByRole('tab', { name: 'Opção 2' }));

      expect(within(tile('Energia')).getByText('NA META')).toBeInTheDocument();
      expect(within(tile('Energia')).getByText('400')).toBeInTheDocument();
    });
  });

  describe('meal table (DS .data-table) and item row', () => {
    it('shows time, name, item count and share of the day kcal for each meal', async () => {
      await renderLoaded();
      expect(within(breakfast()).getByText('07:00')).toBeInTheDocument();
      expect(within(breakfast()).getByText('1 item · 25% das kcal do dia')).toBeInTheDocument();
      expect(within(lunch()).getByText('12:30')).toBeInTheDocument();
      expect(within(lunch()).getByText('1 item · 75% das kcal do dia')).toBeInTheDocument();
    });

    it('renders ONE table for the whole menu with the nutrient columns', async () => {
      await renderLoaded();
      expect(screen.getAllByRole('table')).toHaveLength(1);
      const table = screen.getByRole('table');
      ['Alimento', 'Quantidade', 'Energia kcal', 'PTN g', 'CHO g', 'LIP g', 'Fibras g'].forEach((name) => {
        expect(within(table).getByRole('columnheader', { name })).toBeInTheDocument();
      });
      expect(within(table).getAllByRole('rowgroup').length).toBeGreaterThanOrEqual(3);
    });

    it('shows the item name, household measure, source and the computed nutrients', async () => {
      await renderLoaded();
      const row = within(breakfast()).getByText('Cuscuz de milho cozido').closest('tr');
      expect(within(row).getByText('1 fatia média')).toBeInTheDocument();
      expect(within(row).getByText('TACO')).toBeInTheDocument();
      expect(within(row).getByLabelText(/Quantidade de cuscuz de milho cozido/i)).toHaveValue(100);
      ['100', '10,0', '20,0', '1,0', '2,0'].forEach((value) => {
        expect(within(row).getByText(value)).toBeInTheDocument();
      });
    });

    it('labels custom foods as "Meus alimentos" and TBCA foods as TBCA', async () => {
      const plan = buildPlan();
      plan.meals[0].options[0].items.push(
        buildItem({ id: 'item-c', name: 'Salada da casa', source: 'custom' }),
        buildItem({ id: 'item-t', name: 'Tapioca', source: 'tbca' }),
      );
      mockApi({ plan });
      await renderLoaded();
      expect(within(within(breakfast()).getByText('Salada da casa').closest('tr')).getByText('Meus alimentos')).toBeInTheDocument();
      expect(within(within(breakfast()).getByText('Tapioca').closest('tr')).getByText('TBCA')).toBeInTheDocument();
    });

    it('shows the meal subtotal, the day total, the goal and the difference', async () => {
      await renderLoaded();
      expect(screen.getByText('· opção 1 de cada refeição')).toBeInTheDocument();
      expect(within(within(breakfast()).getByRole('row', { name: /Subtotal · Café da manhã/ })).getByText('100')).toBeInTheDocument();
      expect(within(screen.getByRole('row', { name: /Total do dia/ })).getByText('400')).toBeInTheDocument();
      expect(within(screen.getByRole('row', { name: /^Meta/ })).getByText('400')).toBeInTheDocument();
      expect(within(screen.getByRole('row', { name: /Diferença/ })).getByText('0')).toBeInTheDocument();
      expect(screen.getByText(/Composição por 100 g da TACO/)).toBeInTheDocument();
    });
  });

  describe('editing quantity (criterion 14)', () => {
    it('recalculates the item, subtotal, share, day total, difference and tiles immediately', async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValue({ data: withQuantity(buildPlan(), 'item-1', 200) });
      await renderLoaded();

      await retypeNumber(user, screen.getByLabelText(/Quantidade de cuscuz de milho cozido/i), '200');

      const row = within(breakfast()).getByText('Cuscuz de milho cozido').closest('tr');
      ['200', '20,0', '40,0', '2,0', '4,0'].forEach((value) => {
        expect(within(row).getByText(value)).toBeInTheDocument();
      });
      expect(within(within(breakfast()).getByRole('row', { name: /Subtotal/ })).getByText('200')).toBeInTheDocument();
      expect(within(breakfast()).getByText('1 item · 40% das kcal do dia')).toBeInTheDocument();
      expect(within(lunch()).getByText('1 item · 60% das kcal do dia')).toBeInTheDocument();
      expect(within(screen.getByRole('row', { name: /Total do dia/ })).getByText('500')).toBeInTheDocument();
      expect(within(screen.getByRole('row', { name: /Diferença/ })).getByText('+100')).toBeInTheDocument();
      expect(within(tile('Energia')).getByText(/ACIMA\s+\+100\s+kcal/)).toBeInTheDocument();
      expect(within(tile('Proteína')).getByText(/ABAIXO\s+−5,0\s+g/)).toBeInTheDocument();
    });

    it('treats an empty quantity as 0 without sending NaN', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.clear(screen.getByLabelText(/Quantidade de cuscuz de milho cozido/i));

      const row = within(breakfast()).getByText('Cuscuz de milho cozido').closest('tr');
      expect(within(row).getAllByText('0').length).toBeGreaterThan(0);
      expect(within(screen.getByRole('row', { name: /Total do dia/ })).getByText('300')).toBeInTheDocument();
      expect(api.patch).not.toHaveBeenCalledWith(expect.anything(), { quantity: NaN });
    });

    it('autosaves one PATCH with the final quantity and shows "Salvo automaticamente às HH:MM"', async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValue({ data: withQuantity(buildPlan(), 'item-1', 200) });
      await renderLoaded();

      await retypeNumber(user, screen.getByLabelText(/Quantidade de cuscuz de milho cozido/i), '200');
      expect(api.patch).not.toHaveBeenCalled();

      await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/nutritionist/items/item-1', expect.objectContaining({ quantity: 200 })), SAVE_TIMEOUT);
      expect(api.patch).not.toHaveBeenCalledWith('/nutritionist/items/item-1', expect.objectContaining({ quantity: 2 }));
      expect(await screen.findByText(/^Salvo automaticamente às \d{2}:\d{2}$/)).toBeInTheDocument();
    });

    it('shows the save error with retry', async () => {
      const user = userEvent.setup();
      api.patch
        .mockRejectedValueOnce(Object.assign(new Error('boom'), { userMessage: 'Falhou' }))
        .mockResolvedValue({ data: withQuantity(buildPlan(), 'item-1', 200) });
      await renderLoaded();

      await retypeNumber(user, screen.getByLabelText(/Quantidade de cuscuz de milho cozido/i), '200');

      expect(await screen.findByText(/Não foi possível salvar/, {}, SAVE_TIMEOUT)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
      expect(await screen.findByText(/^Salvo automaticamente às/)).toBeInTheDocument();
    });
  });

  describe('meal options (DS Segmented, criteria 12, 16)', () => {
    it('shows no option tabs for a meal with a single option', async () => {
      await renderLoaded();
      expect(within(lunch()).queryByRole('tablist')).not.toBeInTheDocument();
    });

    it('shows Opção 1 / Opção 2 as Segmented tabs when a meal has more options', async () => {
      mockApi({ plan: planWithOptions() });
      await renderLoaded();
      const tabs = within(breakfast()).getByRole('tablist', { name: 'Opções de Café da manhã' });
      expect(tabs.closest('.segmented') ?? tabs).toHaveClass('segmented');
      expect(within(tabs).getByRole('tab', { name: 'Opção 1' })).toHaveAttribute('aria-selected', 'true');
      expect(within(tabs).getByRole('tab', { name: 'Opção 2' })).toHaveAttribute('aria-selected', 'false');
    });

    it('option 2 shows its items, the "escolhe no dia" label and the comparison with option 1', async () => {
      const user = userEvent.setup();
      mockApi({ plan: planWithOptions() });
      await renderLoaded();

      await user.click(within(breakfast()).getByRole('tab', { name: 'Opção 2' }));

      expect(within(breakfast()).getByText('Tapioca (goma hidratada)')).toBeInTheDocument();
      expect(within(breakfast()).queryByText('Cuscuz de milho cozido')).not.toBeInTheDocument();
      expect(within(breakfast()).getByText(/escolhe no dia/)).toBeInTheDocument();
      expect(within(breakfast()).getByText('Comparada à opção 1: +100 kcal · PTN −10,0 g · CHO +30,0 g · LIP −1,0 g')).toBeInTheDocument();
      expect(within(breakfast()).getByRole('row', { name: /Subtotal · Café da manhã · opção 2/ })).toBeInTheDocument();
    });

    it('option 1 shows no comparison', async () => {
      mockApi({ plan: planWithOptions() });
      await renderLoaded();
      expect(within(breakfast()).queryByText(/Comparada à opção 1/)).not.toBeInTheDocument();
    });

    it('"+ Substituta" adds an option of the meal with POST and shows the new tab (copy of option 1)', async () => {
      const user = userEvent.setup();
      const added = buildPlan();
      added.meals[1].options.push({ ...structuredClone(added.meals[1].options[0]), id: 'opt-2b', position: 2 });
      api.post.mockResolvedValue({ data: added });
      await renderLoaded();

      await user.click(within(lunch()).getByRole('button', { name: '+ Substituta' }));

      await waitFor(() => expect(api.post.mock.calls.map(([url]) => url)).toContain('/nutritionist/meals/meal-2/options'));
      expect(await within(lunch()).findByRole('tab', { name: 'Opção 2' })).toBeInTheDocument();
    });

    it('hides "+ Substituta" once a meal has 3 options', async () => {
      const plan = planWithOptions();
      plan.meals[0].options.push({ ...tapiocaOption(), id: 'opt-1c', position: 3 });
      mockApi({ plan });
      await renderLoaded();
      expect(within(breakfast()).queryByRole('button', { name: '+ Substituta' })).not.toBeInTheDocument();
      expect(within(lunch()).getByRole('button', { name: '+ Substituta' })).toBeInTheDocument();
    });

    it('shows the API error when the option limit is hit server-side', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValue(apiError('Máximo de 3 opções por refeição.'));
      await renderLoaded();

      await user.click(within(lunch()).getByRole('button', { name: '+ Substituta' }));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Máximo de 3 opções por refeição.', 'error'));
    });
  });

  describe('remove item', () => {
    it('DELETEs the item and drops the row', async () => {
      const user = userEvent.setup();
      const without = buildPlan();
      without.meals[0].options[0].items = [];
      without.meals[0].options[0].totals = nutrients();
      api.delete.mockResolvedValue({ data: without });
      await renderLoaded();

      await user.click(within(breakfast()).getByRole('button', { name: 'Remover cuscuz de milho cozido' }));

      await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/nutritionist/items/item-1'));
      await waitFor(() => expect(within(breakfast()).queryByText('Cuscuz de milho cozido')).not.toBeInTheDocument());
    });

    it('shows the error and keeps the row when removal fails', async () => {
      const user = userEvent.setup();
      api.delete.mockRejectedValue(Object.assign(new Error('x'), { userMessage: 'Falha ao remover.' }));
      await renderLoaded();

      await user.click(within(breakfast()).getByRole('button', { name: 'Remover cuscuz de milho cozido' }));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Falha ao remover.', 'error'));
      expect(within(breakfast()).getByText('Cuscuz de milho cozido')).toBeInTheDocument();
    });
  });

  describe('inline food search (DS FoodSearchCombobox, criterion 13)', () => {
    const TAPIOCA = buildFood({ id: 'f-tap', name: 'Tapioca (goma hidratada)', source: 'tbca' });
    const openSearch = async (user, region) => {
      await user.click(within(region).getByRole('button', { name: '+ Alimento' }));
      return within(region).findByRole('combobox', { name: 'Buscar alimento' });
    };

    it('opens the search inside the meal and queries /foods with the typed text and the three sources', async () => {
      const user = userEvent.setup();
      mockApi({ foods: [TAPIOCA] });
      await renderLoaded();

      const input = await openSearch(user, lunch());
      await user.type(input, 'tapioca');

      await waitFor(() => expect(api.get).toHaveBeenCalledWith('/foods', {
        params: expect.objectContaining({ q: 'tapioca', sources: 'taco,tbca,custom' }),
      }));
      expect(await screen.findByRole('option', { name: /Tapioca \(goma hidratada\)/ })).toBeInTheDocument();
    });

    it('filters by food group', async () => {
      const user = userEvent.setup();
      mockApi({ foods: [TAPIOCA] });
      await renderLoaded();
      await openSearch(user, lunch());

      await user.click(await screen.findByRole('button', { name: 'Carnes e ovos' }));

      await waitFor(() => expect(api.get).toHaveBeenCalledWith('/foods', {
        params: expect.objectContaining({ groupId: 'g-carnes' }),
      }));
    });

    it('adds the picked food to the active option with POST and closes the search', async () => {
      const user = userEvent.setup();
      const added = buildPlan();
      added.meals[1].options[0].items.push(buildItem({ id: 'item-new', foodId: 'f-tap', name: 'Tapioca (goma hidratada)', source: 'tbca' }));
      api.post.mockResolvedValue({ data: added });
      mockApi({ foods: [TAPIOCA] });
      await renderLoaded();
      const input = await openSearch(user, lunch());
      await user.type(input, 'tap');

      await user.click(await screen.findByRole('option', { name: /Tapioca \(goma hidratada\)/ }));

      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/nutritionist/meal-options/opt-2/items', expect.objectContaining({ foodId: 'f-tap' })));
      expect(await within(lunch()).findByText('Tapioca (goma hidratada)')).toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: 'Buscar alimento' })).not.toBeInTheDocument();
    });

    it('adds to the option that is active (option 2)', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: planWithOptions() });
      mockApi({ plan: planWithOptions(), foods: [TAPIOCA] });
      await renderLoaded();
      await user.click(within(breakfast()).getByRole('tab', { name: 'Opção 2' }));
      const input = await openSearch(user, breakfast());
      await user.type(input, 'tap');

      await user.click(await screen.findByRole('option', { name: /Tapioca/ }));

      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/nutritionist/meal-options/opt-1b/items', expect.objectContaining({ foodId: 'f-tap' })));
    });

    it('closes without adding on Cancelar and on Escape', async () => {
      const user = userEvent.setup();
      mockApi({ foods: [TAPIOCA] });
      await renderLoaded();
      await openSearch(user, lunch());

      await user.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByRole('combobox', { name: 'Buscar alimento' })).not.toBeInTheDocument();

      const input = await openSearch(user, lunch());
      input.focus();
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('combobox', { name: 'Buscar alimento' })).not.toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('shows the empty state pointing to Meus alimentos when nothing matches', async () => {
      const user = userEvent.setup();
      mockApi({ foods: [] });
      await renderLoaded();
      const input = await openSearch(user, lunch());

      await user.type(input, 'zzzz');

      expect(await screen.findByText(/cadastra em Meus alimentos/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Meus alimentos' })).toHaveAttribute('href', '/nutritionist/foods');
    });

    it('shows the API error when adding the food fails', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValue(Object.assign(new Error('x'), { userMessage: 'Alimento inválido.' }));
      mockApi({ foods: [TAPIOCA] });
      await renderLoaded();
      const input = await openSearch(user, lunch());
      await user.type(input, 'tap');

      await user.click(await screen.findByRole('option', { name: /Tapioca/ }));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Alimento inválido.', 'error'));
    });
  });
  describe('add meal', () => {
    it('opens the add-meal modal and POSTs the new meal to the plan', async () => {
      const user = userEvent.setup();
      const created = buildPlan();
      created.meals.push({ ...structuredClone(created.meals[1]), id: 'meal-3', name: 'Ceia', time: '22:00', order: 3 });
      api.post.mockResolvedValue({ data: created });
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Adicionar refeição' }));
      const dialog = await screen.findByRole('dialog', { name: 'Adicionar refeição' });
      await user.type(within(dialog).getByLabelText('Nome da refeição'), 'Ceia');
      fireEvent.change(within(dialog).getByLabelText('Horário'), { target: { value: '22:00' } });
      await user.click(within(dialog).getByRole('button', { name: 'Adicionar' }));

      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/nutritionist/plans/plan-1/meals', { name: 'Ceia', time: '22:00' }));
      expect(await screen.findByRole('rowgroup', { name: 'Ceia' })).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('offers to add the first meal when the plan has none', async () => {
      mockApi({ plan: buildPlan({ meals: [] }) });
      await renderLoaded();
      expect(screen.getByRole('button', { name: 'Adicionar refeição' })).toBeInTheDocument();
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('keeps the modal open and toasts the API error when creating fails', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValue(apiError('Horário inválido.', 400, 'validation.failed'));
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Adicionar refeição' }));
      const dialog = await screen.findByRole('dialog', { name: 'Adicionar refeição' });
      await user.type(within(dialog).getByLabelText('Nome da refeição'), 'Ceia');
      fireEvent.change(within(dialog).getByLabelText('Horário'), { target: { value: '22:00' } });
      await user.click(within(dialog).getByRole('button', { name: 'Adicionar' }));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Horário inválido.', 'error'));
      expect(screen.getByRole('dialog', { name: 'Adicionar refeição' })).toBeInTheDocument();
    });

    it('cancels without creating anything', async () => {
      const user = userEvent.setup();
      await renderLoaded();
      await user.click(screen.getByRole('button', { name: 'Adicionar refeição' }));
      await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  describe('save error', () => {
    it('offers a retry button that flushes the autosave again', async () => {
      const user = userEvent.setup();
      api.patch
        .mockRejectedValueOnce(Object.assign(new Error('boom'), { userMessage: 'Falhou' }))
        .mockResolvedValue({ data: withQuantity(buildPlan(), 'item-1', 200) });
      await renderLoaded();

      await retypeNumber(user, screen.getByLabelText(/Quantidade de cuscuz de milho cozido/i), '200');
      await user.click(await screen.findByRole('button', { name: 'Tentar novamente' }, SAVE_TIMEOUT));

      expect(await screen.findByText(/^Salvo automaticamente às/)).toBeInTheDocument();
    });
  });
});
