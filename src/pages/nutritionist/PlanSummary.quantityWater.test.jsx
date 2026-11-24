import userEvent from '@testing-library/user-event';
import { renderWithRoute, screen, waitFor, within, fireEvent } from '../../test/test-utils';
import PlanSummary from './PlanSummary';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import { NUTRITIONIST_ONLY, authAs } from '../../test/financeFixtures';
import {
  PATIENT_ID,
  PLAN_ID,
  buildFoodGroups,
  buildGuidance,
  buildItem,
  buildMeal,
  buildOption,
  buildOverview,
  buildPlan,
  nutrients,
} from '../../test/nutritionFixtures';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const ROUTE = `/nutritionist/patients/${PATIENT_ID}/plan`;
const ITEM_URL = '/nutritionist/items/item-arroz';
const GUIDANCE_URL = `/nutritionist/plans/${PLAN_ID}/guidance`;
const SLOW = { timeout: 4000 };

// Test helper: plan with a lunch of one 100 g rice item (124 kcal per 100 g) and one 120 g chicken.
const buildQuantityPlan = (overrides = {}) => buildPlan({
  status: 'draft',
  meals: [
    buildMeal({
      id: 'meal-2',
      name: 'Almoço',
      time: '12:30',
      order: 1,
      options: [buildOption({
        id: 'opt-2',
        items: [
          buildItem({ id: 'item-arroz', foodId: 'food-arroz', name: 'Arroz integral cozido', quantity: 100, per100g: nutrients(124, 2.6, 25.8, 1, 2.7), nutrients: nutrients(124, 2.6, 25.8, 1, 2.7), substitutes: [] }),
          buildItem({ id: 'item-frango', foodId: 'food-frango', name: 'Peito de frango', quantity: 120, per100g: nutrients(159, 32, 0, 2.5, 0), nutrients: nutrients(190.8, 38.4, 0, 3, 0), substitutes: [] }),
        ],
        totals: nutrients(314.8, 41, 25.8, 4, 2.7),
      })],
    }),
  ],
  guidance: buildGuidance({ waterTargetMl: 2500, patientMessage: 'Bora!' }),
  ...overrides,
});

// Test helper: mock api.
const mockApi = (plan = buildQuantityPlan()) => {
  api.get.mockImplementation((url) => {
    if (url === `/nutritionist/patients/${PATIENT_ID}/plan`) return Promise.resolve({ data: plan });
    if (url === `/nutritionist/patients/${PATIENT_ID}/overview`) return Promise.resolve({ data: buildOverview() });
    if (url === '/food-groups') return Promise.resolve({ data: buildFoodGroups() });
    return Promise.resolve({ data: { items: [] } });
  });
  api.patch.mockResolvedValue({ data: plan });
  api.post.mockResolvedValue({ data: plan });
};

// Test helper: render loaded with lunch expanded.
const renderExpanded = async () => {
  const user = userEvent.setup();
  renderWithRoute(<PlanSummary />, { route: ROUTE, path: '/nutritionist/patients/:patientId/plan' });
  await screen.findByRole('heading', { name: 'Luiza Andrade' });
  await user.click(screen.getByRole('button', { name: /Almoço/ }));
  return user;
};

// Types a new quantity in the rice input.
const setRice = (value) =>fireEvent.change(screen.getByRole('spinbutton', { name: 'Quantidade de arroz integral cozido' }), { target: { value } });
// Types a new daily water target in litres.
const setWater = (value) =>fireEvent.change(screen.getByLabelText('Meta diária'), { target: { value } });

describe('PlanSummary editable quantity and water target', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    vi.mocked(useAuth).mockReturnValue(authAs(NUTRITIONIST_ONLY));
    mockApi();
  });

  describe('quantity', () => {
    it('shows the quantity of each item as an editable number input', async () => {
      await renderExpanded();
      expect(screen.getByRole('spinbutton', { name: 'Quantidade de arroz integral cozido' })).toHaveValue(100);
      expect(screen.getByRole('spinbutton', { name: 'Quantidade de peito de frango' })).toHaveValue(120);
    });

    it('updates the meal kcal and the day totals immediately, before any save', async () => {
      await renderExpanded();
      expect(screen.getByRole('button', { name: /Almoço/ })).toHaveTextContent('315 kcal');
      const aside = screen.getByRole('complementary', { name: 'Resumo do plano' });
      const dayBefore = aside.querySelector('.nutri-day__kcal').textContent;

      setRice('200');

      expect(screen.getByRole('button', { name: /Almoço/ })).toHaveTextContent('439 kcal');
      expect(aside.querySelector('.nutri-day__kcal').textContent).not.toBe(dayBefore);
      expect(api.patch).not.toHaveBeenCalled();
    });

    it('autosaves patchItem(itemId, { quantity }) after the debounce', async () => {
      await renderExpanded();
      setRice('200');
      expect(api.patch).not.toHaveBeenCalled();
      await waitFor(() => expect(api.patch).toHaveBeenCalledWith(ITEM_URL, { quantity: 200 }), SLOW);
    });

    it('does not call patchItem for an invalid quantity and shows the error', async () => {
      await renderExpanded();
      setRice('');
      expect(await screen.findByText('Informe uma quantidade maior que zero.')).toBeInTheDocument();
      expect(screen.getByRole('spinbutton', { name: 'Quantidade de arroz integral cozido' })).toHaveAttribute('aria-invalid', 'true');
      await new Promise((resolve) => { setTimeout(resolve, 1800); });
      expect(api.patch).not.toHaveBeenCalledWith(ITEM_URL, expect.anything());
    });
  });

  describe('water target', () => {
    it('shows the Ingestão hídrica section in the aside with the plan target in litres', async () => {
      await renderExpanded();
      const aside = screen.getByRole('complementary', { name: 'Resumo do plano' });
      expect(within(aside).getByText('Ingestão hídrica')).toBeInTheDocument();
      expect(within(aside).getByLabelText('Meta diária')).toHaveValue(2.5);
    });

    it('offers the ml/kg suggestion from the patient weight (66 kg)', async () => {
      await renderExpanded();
      expect(screen.getByRole('button', { name: /Usar 35 ml\/kg · 2,3 L/ })).toBeInTheDocument();
    });

    it('autosaves the target together with the patient message', async () => {
      await renderExpanded();
      setWater('3');
      expect(api.patch).not.toHaveBeenCalled();
      await waitFor(() => expect(api.patch).toHaveBeenCalledWith(GUIDANCE_URL, { patientMessage: 'Bora!', waterTargetMl: 3000 }), SLOW);
    });

    it('keeps sending the water target when only the message changes', async () => {
      await renderExpanded();
      fireEvent.change(screen.getByRole('textbox', { name: 'Recado pra paciente' }), { target: { value: 'Foco!' } });
      await waitFor(() => expect(api.patch).toHaveBeenCalledWith(GUIDANCE_URL, { patientMessage: 'Foco!', waterTargetMl: 2500 }), SLOW);
    });
  });

  describe('publish flushes both autosaves', () => {
    it('saves quantity and guidance before publishPlan', async () => {
      const user = await renderExpanded();
      setRice('200');
      setWater('3');

      await user.click(screen.getByRole('button', { name: 'Publicar plano' }));

      await waitFor(() => expect(api.post).toHaveBeenCalledWith(`/nutritionist/plans/${PLAN_ID}/publish`));
      expect(api.patch).toHaveBeenCalledWith(ITEM_URL, { quantity: 200 });
      expect(api.patch).toHaveBeenCalledWith(GUIDANCE_URL, { patientMessage: 'Bora!', waterTargetMl: 3000 });
      const lastPatch = Math.max(...api.patch.mock.invocationCallOrder);
      expect(lastPatch).toBeLessThan(api.post.mock.invocationCallOrder[0]);
    });

    it('does not publish when the quantity flush fails', async () => {
      const user = await renderExpanded();
      api.patch.mockImplementation((url) => (url === ITEM_URL
        ? Promise.reject(Object.assign(new Error('x'), { userMessage: 'Falhou.' }))
        : Promise.resolve({ data: buildQuantityPlan() })));
      setRice('200');

      await user.click(screen.getByRole('button', { name: 'Publicar plano' }));

      await waitFor(() => expect(api.patch).toHaveBeenCalledWith(ITEM_URL, { quantity: 200 }));
      await new Promise((resolve) => { setTimeout(resolve, 200); });
      expect(api.post).not.toHaveBeenCalled();
    });

    it('does not publish when the guidance flush fails', async () => {
      const user = await renderExpanded();
      api.patch.mockImplementation((url) => (url === GUIDANCE_URL
        ? Promise.reject(Object.assign(new Error('x'), { userMessage: 'Falhou.' }))
        : Promise.resolve({ data: buildQuantityPlan() })));
      setWater('3');

      await user.click(screen.getByRole('button', { name: 'Publicar plano' }));

      await waitFor(() => expect(api.patch).toHaveBeenCalledWith(GUIDANCE_URL, expect.anything()));
      await new Promise((resolve) => { setTimeout(resolve, 200); });
      expect(api.post).not.toHaveBeenCalled();
    });

    it('does not publish when the quantity is invalid', async () => {
      const user = await renderExpanded();
      setRice('');

      await user.click(screen.getByRole('button', { name: 'Publicar plano' }));

      await new Promise((resolve) => { setTimeout(resolve, 200); });
      expect(api.post).not.toHaveBeenCalled();
    });

    it('Salvar rascunho flushes the quantity autosave', async () => {
      const user = await renderExpanded();
      setRice('150');

      await user.click(screen.getByRole('button', { name: 'Salvar rascunho' }));

      await waitFor(() => expect(api.patch).toHaveBeenCalledWith(ITEM_URL, { quantity: 150 }));
      expect(api.post).not.toHaveBeenCalled();
    });
  });
});
