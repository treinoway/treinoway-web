import userEvent from '@testing-library/user-event';
import { renderWithRoute, screen, waitFor, within, fireEvent } from '../../test/test-utils';
import PlanSummary from './PlanSummary';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import {
  PATIENT_ID,
  PLAN_ID,
  buildFood,
  buildFoodGroups,
  buildGuidance,
  buildItem,
  buildMeal,
  buildOption,
  buildOverview,
  buildPatientRow,
  buildPlan,
  buildSubstitute,
  nutrients,
} from '../../test/nutritionFixtures';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const showToast = vi.fn();
const ROUTE = `/nutritionist/patients/${PATIENT_ID}/plan`;

// Test helper: api error.
const apiError = (userMessage, status = 422, messageCode = 'nutrition.plan.noMeals') =>
  Object.assign(new Error(userMessage), { userMessage, response: { status, data: { messageCode } } });

// Lunch has two items; the chicken has one substitute (protein basis).
const chickenItem = (overrides = {}) =>
  buildItem({
    id: 'item-frango',
    foodId: 'food-frango',
    name: 'Peito de frango grelhado',
    householdMeasure: '1 filé médio',
    quantity: 120,
    per100g: nutrients(159, 32, 0, 2.5, 0),
    nutrients: nutrients(190.8, 38.4, 0, 3, 0),
    swapBasis: 'protein',
    substitutes: [buildSubstitute()],
    ...overrides,
  });

// Test helper: build summary plan.
const buildSummaryPlan = (overrides = {}) => {
  const lunchItems = [
    buildItem({
      id: 'item-arroz',
      foodId: 'food-arroz',
      name: 'Arroz integral cozido',
      householdMeasure: '4 col. de sopa',
      quantity: 100,
      per100g: nutrients(124, 2.6, 25.8, 1, 2.7),
      nutrients: nutrients(124, 2.6, 25.8, 1, 2.7),
    }),
    chickenItem(),
  ];
  return buildPlan({
    status: 'published',
    publishedAt: '2026-10-20T12:00:00.000Z',
    hasUnpublishedChanges: false,
    meals: [
      buildMeal({
        options: [buildOption({
          items: [buildItem({ substitutes: [] })],
          totals: nutrients(100, 10, 20, 1, 2),
        })],
      }),
      buildMeal({
        id: 'meal-2',
        name: 'Almoço',
        time: '12:30',
        order: 2,
        options: [buildOption({ id: 'opt-2', items: lunchItems, totals: nutrients(314.8, 41, 25.8, 4, 2.7) })],
      }),
    ],
    computed: {
      ...buildPlan().computed,
      dayTotals: nutrients(1477, 102, 155, 52, 20),
      macros: {
        protein: { grams: 118.8, kcal: 475.2, pct: 30.66 },
        carbs: { grams: 149.9, kcal: 599.6, pct: 38.68 },
        fat: { grams: 52.8, kcal: 475.2, pct: 30.66 },
        totalKcal: 1550,
        diffKcal: 0,
      },
    },
    goals: { ...buildPlan().goals, kcalTarget: 1550 },
    ...overrides,
  });
};

// Test helper: mock api.
const mockApi = ({ plan = buildSummaryPlan(), overview = buildOverview(), foods = [] } = {}) => {
  api.get.mockImplementation((url) => {
    if (url === `/nutritionist/patients/${PATIENT_ID}/plan`) return Promise.resolve({ data: plan });
    if (url === `/nutritionist/patients/${PATIENT_ID}/overview`) return Promise.resolve({ data: overview });
    if (url === '/foods') return Promise.resolve({ data: { items: foods } });
    if (url === '/food-groups') return Promise.resolve({ data: buildFoodGroups() });
    return Promise.resolve({ data: {} });
  });
};

// Test helper: render page.
const renderPage = () =>
  renderWithRoute(<PlanSummary />, { route: ROUTE, path: '/nutritionist/patients/:patientId/plan' });

// Test helper: render loaded.
const renderLoaded = async () => {
  const view = renderPage();
  await screen.findByRole('heading', { name: 'Luiza Andrade' });
  return view;
};

// Test helper: expand lunch.
const expandLunch = async (user) => {
  await user.click(screen.getByRole('button', { name: /Almoço/ }));
};

describe('PlanSummary (tela A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast });
    mockApi();
  });

  describe('states', () => {
    it('shows the loading state and not-found/empty feedback only after the requests finish', () => {
      api.get.mockImplementation(() => new Promise(() => {}));
      renderPage();
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Luiza Andrade' })).not.toBeInTheDocument();
    });

    it('requests the plan and the overview of the patient in the URL', async () => {
      await renderLoaded();
      expect(api.get).toHaveBeenCalledWith(`/nutritionist/patients/${PATIENT_ID}/plan`);
      expect(api.get).toHaveBeenCalledWith(`/nutritionist/patients/${PATIENT_ID}/overview`);
    });

    it('shows an error with retry when loading fails', async () => {
      const user = userEvent.setup();
      api.get.mockRejectedValueOnce(Object.assign(new Error('x'), { userMessage: 'Erro interno do servidor.' }));
      renderPage();

      expect(await screen.findByText('Erro interno do servidor.')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

      expect(await screen.findByRole('heading', { name: 'Luiza Andrade' })).toBeInTheDocument();
    });

    it('shows an empty-menu hint when the plan has no meals yet', async () => {
      mockApi({ plan: buildSummaryPlan({ status: 'draft', meals: [] }) });
      await renderLoaded();
      expect(screen.getByText(/Nenhuma refeição no plano/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '+ Adicionar refeição' })).toBeInTheDocument();
    });
  });

  describe('header (criterion 23)', () => {
    it('shows the breadcrumb Meus Pacientes › paciente › Plano alimentar (.wizard-breadcrumb)', async () => {
      const { container } = await renderLoaded();
      const breadcrumb = container.querySelector('.wizard-breadcrumb');
      expect(breadcrumb).not.toBeNull();
      expect(within(breadcrumb).getByRole('link', { name: 'Meus Pacientes' })).toHaveAttribute('href', '/nutritionist/patients');
      expect(within(breadcrumb).getByText('Luiza Andrade')).toBeInTheDocument();
      expect(within(breadcrumb).getByText('Plano alimentar')).toHaveAttribute('aria-current', 'page');
    });

    it('shows the avatar initials, the eyebrow and name, age and weight', async () => {
      await renderLoaded();
      expect(screen.getByText('LA')).toBeInTheDocument();
      expect(screen.getByText('Paciente · Plano alimentar')).toBeInTheDocument();
      expect(screen.getByText(/29 anos · 66 kg/)).toBeInTheDocument();
    });

    it.each([
      ['maintain', 'Manter o peso'],
      ['deficit_10', 'Déficit leve'],
      ['deficit_20', 'Déficit moderado'],
      ['surplus_10', 'Superávit leve'],
    ])('shows the pt-BR label of the objective %s', async (objective, label) => {
      mockApi({ overview: buildOverview({ patient: buildPatientRow({ objective }) }) });
      await renderLoaded();
      expect(screen.getByText(new RegExp(`Objetivo: ${label}`))).toBeInTheDocument();
    });

    it('omits the objective when the patient has none', async () => {
      mockApi({ overview: buildOverview({ patient: buildPatientRow({ objective: null }) }) });
      await renderLoaded();
      expect(screen.queryByText(/Objetivo:/)).not.toBeInTheDocument();
    });

    it('shows Rascunho as the status of a draft plan', async () => {
      mockApi({ plan: buildSummaryPlan({ status: 'draft', publishedAt: null }) });
      await renderLoaded();
      expect(screen.getByText('Rascunho')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Publicar plano' })).toBeInTheDocument();
      expect(screen.queryByText('Alterações não publicadas')).not.toBeInTheDocument();
    });

    it('shows the published state instead of the publish button for a published plan', async () => {
      await renderLoaded();
      expect(screen.getByRole('status', { name: 'Plano publicado' })).toHaveTextContent('Publicado');
      expect(screen.queryByRole('button', { name: 'Publicar plano' })).not.toBeInTheDocument();
    });

    it('shows "Alterações não publicadas" when a published plan has pending edits (criterion 22)', async () => {
      mockApi({ plan: buildSummaryPlan({ hasUnpublishedChanges: true }) });
      await renderLoaded();
      expect(screen.getByText('Alterações não publicadas')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Publicar plano' })).toBeInTheDocument();
    });

    it('saves the draft: flushes the pending message and shows Salvo', async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValue({ data: buildSummaryPlan({ guidance: buildGuidance({ patientMessage: 'Foco!' }) }) });
      await renderLoaded();
      await user.type(screen.getByRole('textbox', { name: 'Recado pra paciente' }), '!');

      await user.click(screen.getByRole('button', { name: 'Salvar rascunho' }));

      await waitFor(() => expect(api.patch).toHaveBeenCalledWith(`/nutritionist/plans/${PLAN_ID}/guidance`, expect.objectContaining({ patientMessage: 'Bora pra semana!!' })));
      expect(await screen.findByText(/^Salvo automaticamente às/)).toBeInTheDocument();
    });

    it('shows Salvo when saving the draft with nothing pending', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Salvar rascunho' }));

      expect(await screen.findByText('Salvo')).toBeInTheDocument();
      expect(api.patch).not.toHaveBeenCalled();
    });
  });

  describe('view switch', () => {
    it('shows Prescrição simples selected and the detailed prescription opens the menu step', async () => {
      const user = userEvent.setup();
      await renderLoaded();
      expect(screen.getByRole('tab', { name: 'Prescrição simples' })).toHaveAttribute('aria-selected', 'true');

      await user.click(screen.getByRole('tab', { name: 'Prescrição detalhada' }));

      expect(await screen.findByTestId('redirected')).toBeInTheDocument();
    });

    it('shows the number of meals and the kcal of the day', async () => {
      await renderLoaded();
      expect(screen.getByText('2 refeições · 1.477 kcal no dia')).toBeInTheDocument();
    });
  });

  describe('adherence KPIs', () => {
    it('shows 7-day adherence, swaps used and ate-different tiles', async () => {
      await renderLoaded();
      expect(screen.getByText('Adesão · 7 dias')).toBeInTheDocument();
      expect(screen.getByText('82%')).toBeInTheDocument();
      expect(screen.getByText('23 de 28 refeições')).toBeInTheDocument();
      expect(screen.getByText('Trocas usadas')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
      expect(screen.getByText(/frango → patinho/)).toBeInTheDocument();
      expect(screen.getByText('Comeu diferente')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText(/Lanche da tarde/)).toBeInTheDocument();
    });

    it('handles a patient with no logs yet (no top pair, no meal)', async () => {
      mockApi({
        overview: buildOverview({
          adherence7d: {
            mealsDone: 0,
            mealsExpected: 0,
            percent: 0,
            swaps: { total: 0, topPair: null },
            ateDifferent: { total: 0, topMealName: null },
          },
        }),
      });
      await renderLoaded();
      expect(screen.getByText('Trocas usadas')).toBeInTheDocument();
      expect(screen.queryByText(/→/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Mais em/)).not.toBeInTheDocument();
    });
  });

  describe('personal trainer card', () => {
    it("shows the patient's trainer", async () => {
      await renderLoaded();
      expect(screen.getByText('Personal')).toBeInTheDocument();
      expect(screen.getByText('José Teste')).toBeInTheDocument();
    });

    it('hides the card when the patient has no trainer', async () => {
      mockApi({ overview: buildOverview({ trainer: null }) });
      await renderLoaded();
      expect(screen.queryByText('Personal')).not.toBeInTheDocument();
    });
  });

  describe('patient tabs', () => {
    it('lists Plano alimentar, Anamnese, Acompanhamento and Evolução with the first selected', async () => {
      await renderLoaded();
      expect(screen.getByRole('tab', { name: 'Plano alimentar' })).toHaveAttribute('aria-selected', 'true');
      ['Anamnese', 'Acompanhamento', 'Evolução'].forEach((name) => {
        expect(screen.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'false');
      });
    });

    it('shows a coming-soon state for the tabs that are not built yet', async () => {
      const user = userEvent.setup();
      await renderLoaded();

      await user.click(screen.getByRole('tab', { name: 'Anamnese' }));

      expect(screen.getByText('Esta seção chega em breve.')).toBeInTheDocument();
      expect(screen.queryByRole('region', { name: 'Refeições do plano' })).not.toBeInTheDocument();
    });
  });

  describe('meal list', () => {
    it('shows time, name, item summary, counts and kcal of option 1 per meal', async () => {
      await renderLoaded();
      const lunch = screen.getByRole('button', { name: /Almoço/ });
      expect(within(lunch).getByText('12:30')).toBeInTheDocument();
      expect(within(lunch).getByText(/Arroz integral cozido, Peito de frango grelhado/)).toBeInTheDocument();
      expect(within(lunch).getByText(/2 itens · 1 troca/)).toBeInTheDocument();
      expect(within(lunch).getByText(/315 kcal/)).toBeInTheDocument();
    });

    it('expands a meal into the items table and collapses it again', async () => {
      const user = userEvent.setup();
      await renderLoaded();
      const lunch = screen.getByRole('button', { name: /Almoço/ });
      expect(lunch).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('table')).not.toBeInTheDocument();

      await user.click(lunch);

      expect(lunch).toHaveAttribute('aria-expanded', 'true');
      const table = screen.getByRole('table');
      ['Alimento', 'Qtd', 'Kcal', 'PTN', 'Trocas'].forEach((name) => {
        expect(within(table).getByRole('columnheader', { name })).toBeInTheDocument();
      });
      const row = within(table).getByText('Arroz integral cozido').closest('tr');
      expect(within(row).getByText('4 col. de sopa')).toBeInTheDocument();
      expect(within(row).getByText('100 g')).toBeInTheDocument();
      expect(within(row).getByText('124')).toBeInTheDocument();
      expect(within(row).getByText('2,6 g')).toBeInTheDocument();

      await user.click(lunch);
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });

    it('adds a food to the meal through the search (POST item with the chosen foodId)', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: buildSummaryPlan() });
      mockApi({ foods: [buildFood({ id: 'food-coxa', name: 'Coxa de frango assada' })] });
      await renderLoaded();
      await expandLunch(user);

      await user.click(screen.getByRole('button', { name: '+ Adicionar alimento' }));
      await user.type(await screen.findByRole('combobox', { name: 'Buscar alimento' }), 'coxa');
      await user.click(await screen.findByRole('option', { name: /Coxa de frango assada/ }));

      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/nutritionist/meal-options/opt-2/items', expect.objectContaining({ foodId: 'food-coxa' })));
    });

    it('removes a food only after confirming', async () => {
      const user = userEvent.setup();
      const without = buildSummaryPlan();
      without.meals[1].options[0].items.pop();
      api.delete.mockResolvedValue({ data: without });
      await renderLoaded();
      await expandLunch(user);

      await user.click(screen.getByRole('button', { name: 'Ações de Peito de frango grelhado' }));
      await user.click(screen.getByRole('button', { name: 'Remover alimento' }));
      expect(api.delete).not.toHaveBeenCalled();
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remover' }));

      await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/nutritionist/items/item-frango'));
    });

    it('keeps the food when the removal is cancelled', async () => {
      const user = userEvent.setup();
      await renderLoaded();
      await expandLunch(user);

      await user.click(screen.getByRole('button', { name: 'Ações de Peito de frango grelhado' }));
      await user.click(screen.getByRole('button', { name: 'Remover alimento' }));
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));

      expect(api.delete).not.toHaveBeenCalled();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  describe('swap editor (criterion 18)', () => {
    const openSwaps = async (user) => {
      await expandLunch(user);
      await user.click(screen.getByRole('button', { name: '1 troca' }));
      return screen.getByRole('region', { name: 'Trocas liberadas' });
    };

    it('lists the allowed substitutes with measure, grams and the primary value', async () => {
      const user = userEvent.setup();
      await renderLoaded();
      const panel = await openSwaps(user);

      expect(within(panel).getByText(/Original: Peito de frango grelhado · 120 g/)).toBeInTheDocument();
      expect(within(panel).getByText('Patinho grelhado')).toBeInTheDocument();
      expect(within(panel).getByText('1 filé pequeno')).toBeInTheDocument();
      expect(within(panel).getByText('107 g')).toBeInTheDocument();
      expect(within(panel).getByText(/≈ 38,4 g PTN/)).toBeInTheDocument();
      expect(within(panel).getByText(/180 kcal/)).toBeInTheDocument();
    });

    it('shows the basis (Proteína / Calorias) in a Segmented with the item basis selected', async () => {
      const user = userEvent.setup();
      await renderLoaded();
      const panel = await openSwaps(user);

      expect(within(panel).getByRole('tab', { name: 'Proteína' })).toHaveAttribute('aria-selected', 'true');
      expect(within(panel).getByRole('tab', { name: 'Calorias' })).toHaveAttribute('aria-selected', 'false');
    });

    it('changing the basis PATCHes the item and re-renders the recalculated quantities', async () => {
      const user = userEvent.setup();
      const recalculated = buildSummaryPlan();
      recalculated.meals[1].options[0].items[1] = chickenItem({
        swapBasis: 'kcal',
        substitutes: [buildSubstitute({ quantity: 95.4 })],
      });
      api.patch.mockResolvedValue({ data: recalculated });
      await renderLoaded();
      const panel = await openSwaps(user);

      await user.click(within(panel).getByRole('tab', { name: 'Calorias' }));

      await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/nutritionist/items/item-frango', { swapBasis: 'kcal' }));
      expect(await within(screen.getByRole('region', { name: 'Trocas liberadas' })).findByText('95 g')).toBeInTheDocument();
      expect(within(screen.getByRole('region', { name: 'Trocas liberadas' })).getByRole('tab', { name: 'Calorias' })).toHaveAttribute('aria-selected', 'true');
    });

    it('removes a substitute with DELETE and shows the no-swaps hint', async () => {
      const user = userEvent.setup();
      const withoutSubs = buildSummaryPlan();
      withoutSubs.meals[1].options[0].items[1] = chickenItem({ substitutes: [] });
      api.delete.mockResolvedValue({ data: withoutSubs });
      await renderLoaded();
      const panel = await openSwaps(user);

      await user.click(within(panel).getByRole('button', { name: 'Remover troca Patinho grelhado' }));

      await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/nutritionist/substitutes/sub-1'));
      expect(await screen.findByText(/Sem trocas liberadas/)).toBeInTheDocument();
      expect(screen.queryByText('Patinho grelhado')).not.toBeInTheDocument();
    });

    it('adds a substitute through the food search and POSTs the chosen foodId', async () => {
      const user = userEvent.setup();
      const added = buildSummaryPlan();
      added.meals[1].options[0].items[1] = chickenItem({
        substitutes: [buildSubstitute(), buildSubstitute({ id: 'sub-2', foodId: 'food-coxa', name: 'Coxa de frango assada' })],
      });
      api.post.mockResolvedValue({ data: added });
      mockApi({ foods: [buildFood({ id: 'food-coxa', name: 'Coxa de frango assada' })] });
      await renderLoaded();
      const panel = await openSwaps(user);

      await user.click(within(panel).getByRole('button', { name: '+ Adicionar troca' }));
      await user.type(await screen.findByRole('combobox', { name: 'Buscar alimento' }), 'coxa');
      await user.click(await screen.findByRole('option', { name: /Coxa de frango assada/ }));

      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/nutritionist/items/item-frango/substitutes', expect.objectContaining({ foodId: 'food-coxa' })));
      expect(await within(screen.getByRole('region', { name: 'Trocas liberadas' })).findByText('Coxa de frango assada')).toBeInTheDocument();
    });

    it('shows the API error when adding a substitute fails', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValue(apiError('Substituto inválido.', 422, 'nutrition.swap.invalid'));
      mockApi({ foods: [buildFood({ id: 'food-coxa', name: 'Coxa de frango assada' })] });
      await renderLoaded();
      const panel = await openSwaps(user);

      await user.click(within(panel).getByRole('button', { name: '+ Adicionar troca' }));
      await user.type(await screen.findByRole('combobox', { name: 'Buscar alimento' }), 'coxa');
      await user.click(await screen.findByRole('option', { name: /Coxa de frango assada/ }));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Substituto inválido.', 'error'));
    });
  });

  describe('day summary vs goals', () => {
    it('shows kcal against the target and the protein gap in g and g/kg', async () => {
      await renderLoaded();
      const summary = screen.getByRole('region', { name: 'Resumo do dia' });

      expect(within(summary).getByText('1.477')).toBeInTheDocument();
      expect(within(summary).getByText('/ 1.550 kcal')).toBeInTheDocument();
      expect(within(summary).getByText(/1,5 g\/kg/)).toBeInTheDocument();
      expect(within(summary).getByText(/17 g abaixo da meta/)).toBeInTheDocument();
    });
  });

  describe('app preview', () => {
    it('shows "Como a Luiza vê" with the first meal as the patient sees it', async () => {
      await renderLoaded();
      const preview = screen.getByRole('region', { name: 'Como a Luiza vê' });
      expect(within(preview).getAllByText(/Cuscuz de milho cozido|Arroz integral cozido/).length).toBeGreaterThan(0);
      expect(within(preview).getByText('Atualiza no app quando o plano for publicado.')).toBeInTheDocument();
    });

    it('previews the next meal by the clock (lunch at 10:00)', async () => {
      vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 10, 1, 10, 0) });
      try {
        await renderLoaded();
        expect(screen.getByText('Prévia do almoço no app')).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('message to the patient', () => {
    it('shows the current message and autosaves edits through PATCH guidance', async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValue({ data: buildSummaryPlan({ guidance: buildGuidance({ patientMessage: 'Foco total!' }) }) });
      await renderLoaded();
      const field = screen.getByRole('textbox', { name: 'Recado pra paciente' });
      expect(field).toHaveValue('Bora pra semana!');
      expect(field).toHaveAttribute('maxlength', '500');

      await user.clear(field);
      await user.type(field, 'Foco total!');

      await waitFor(
        () => expect(api.patch).toHaveBeenLastCalledWith(`/nutritionist/plans/${PLAN_ID}/guidance`, expect.objectContaining({ patientMessage: 'Foco total!' })),
        { timeout: 3000 },
      );
    });
  });

  describe('add meal', () => {
    it('opens a modal, POSTs name/time/tip and shows the new meal', async () => {
      const user = userEvent.setup();
      const withSupper = buildSummaryPlan();
      withSupper.meals.push(buildMeal({ id: 'meal-3', name: 'Ceia', time: '22:00', order: 3, options: [buildOption({ id: 'opt-3', items: [], totals: nutrients() })] }));
      api.post.mockResolvedValue({ data: withSupper });
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: '+ Adicionar refeição' }));
      const dialog = await screen.findByRole('dialog', { name: 'Adicionar refeição' });
      await user.type(within(dialog).getByLabelText('Nome da refeição'), 'Ceia');
      fireEvent.change(within(dialog).getByLabelText('Horário'), { target: { value: '22:00' } });
      await user.click(within(dialog).getByRole('button', { name: 'Adicionar' }));

      await waitFor(() => expect(api.post).toHaveBeenCalledWith(
        `/nutritionist/plans/${PLAN_ID}/meals`,
        expect.objectContaining({ name: 'Ceia', time: '22:00' }),
      ));
      expect(await screen.findByRole('button', { name: /Ceia/ })).toBeInTheDocument();
    });
  });

  describe('publish (criteria 21, 22)', () => {
    it('POSTs publish, updates the badge and clears "Alterações não publicadas"', async () => {
      const user = userEvent.setup();
      mockApi({ plan: buildSummaryPlan({ hasUnpublishedChanges: true }) });
      api.post.mockResolvedValue({ data: buildSummaryPlan({ version: 2, hasUnpublishedChanges: false }) });
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Publicar plano' }));

      await waitFor(() => expect(api.post.mock.calls.map(([url]) => url)).toContain(`/nutritionist/plans/${PLAN_ID}/publish`));
      await waitFor(() => expect(screen.queryByText('Alterações não publicadas')).not.toBeInTheDocument());
      expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/publicado/i), 'success');
    });

    it('turns a draft into Publicado after publishing', async () => {
      const user = userEvent.setup();
      mockApi({ plan: buildSummaryPlan({ status: 'draft', publishedAt: null }) });
      api.post.mockResolvedValue({ data: buildSummaryPlan() });
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Publicar plano' }));

      expect(await screen.findByRole('status', { name: 'Plano publicado' })).toBeInTheDocument();
      expect(screen.queryByText('Rascunho')).not.toBeInTheDocument();
    });

    it('shows the API reason (no meals / no kcal target) and stays a draft', async () => {
      const user = userEvent.setup();
      mockApi({ plan: buildSummaryPlan({ status: 'draft', publishedAt: null }) });
      api.post.mockRejectedValue(apiError('Adicione ao menos uma refeição.', 422, 'nutrition.plan.noMeals'));
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Publicar plano' }));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Adicione ao menos uma refeição.', 'error'));
      expect(screen.getByText('Rascunho')).toBeInTheDocument();
      expect(screen.queryByText('Publicado')).not.toBeInTheDocument();
    });

    it('disables the button while publishing', async () => {
      const user = userEvent.setup();
      mockApi({ plan: buildSummaryPlan({ status: 'draft', publishedAt: null }) });
      api.post.mockImplementation(() => new Promise(() => {}));
      await renderLoaded();

      await user.click(screen.getByRole('button', { name: 'Publicar plano' }));

      expect(await screen.findByRole('button', { name: /Publicando/ })).toBeDisabled();
    });
  });
});
