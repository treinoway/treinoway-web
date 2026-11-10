import userEvent from '@testing-library/user-event';
import { renderWithRoute, screen, waitFor, within } from '../../test/test-utils';
import PlanSummary from './PlanSummary';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import {
  PATIENT_ID,
  buildFoodGroups,
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
const SAVE_TIMEOUT = { timeout: 3000 };

// Test helper: a promise settled from outside.
const deferred = () => {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
};

// Lunch with one chicken item that has the "Patinho grelhado" substitute.
const buildSummaryPlan = ({ substitutes = [buildSubstitute()], swapBasis = 'protein' } = {}) => buildPlan({
  status: 'published',
  publishedAt: '2026-10-20T12:00:00.000Z',
  meals: [
    buildMeal({
      id: 'meal-2',
      name: 'Almoço',
      time: '12:30',
      options: [buildOption({
        id: 'opt-2',
        items: [buildItem({ id: 'item-frango', name: 'Peito de frango grelhado', quantity: 120, swapBasis, substitutes })],
        totals: nutrients(190.8, 38.4, 0, 3, 0),
      })],
    }),
  ],
});

// Test helper: mock api.
const mockApi = ({ plan = buildSummaryPlan(), overview = buildOverview() } = {}) => {
  api.get.mockImplementation((url) => {
    if (url === `/nutritionist/patients/${PATIENT_ID}/plan`) return Promise.resolve({ data: plan });
    if (url === `/nutritionist/patients/${PATIENT_ID}/overview`) return Promise.resolve({ data: overview });
    if (url === '/food-groups') return Promise.resolve({ data: buildFoodGroups() });
    return Promise.resolve({ data: { items: [] } });
  });
};

// Test helper: render page.
const renderPage = () =>
  renderWithRoute(<PlanSummary />, { route: ROUTE, path: '/nutritionist/patients/:patientId/plan' });

// Test helper: render loaded (waits for the heading with the patient name).
const renderLoaded = async (name = 'Luiza Andrade') => {
  const view = renderPage();
  await screen.findByRole('heading', { name });
  return view;
};

// Test helper: opens the swap editor of the chicken.
const openSwaps = async (user) => {
  await user.click(screen.getByRole('button', { name: /Almoço/ }));
  await user.click(screen.getByRole('button', { name: '1 troca' }));
  return screen.getByRole('region', { name: 'Trocas liberadas' });
};

describe('PlanSummary — fix round', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast });
    mockApi();
  });

  describe('out-of-order responses', () => {
    it('does not let a slow, older autosave response bring back a substitute removed afterwards', async () => {
      const user = userEvent.setup();
      const slowGuidance = deferred();
      api.patch.mockImplementation(() => slowGuidance.promise);
      api.delete.mockResolvedValue({ data: buildSummaryPlan({ substitutes: [] }) });
      await renderLoaded();
      const panel = await openSwaps(user);

      await user.type(screen.getByRole('textbox', { name: 'Recado pra paciente' }), 'Bora!');
      await waitFor(() => expect(api.patch).toHaveBeenCalledWith(expect.stringMatching(/\/guidance$/), expect.anything()), SAVE_TIMEOUT);
      await user.click(within(panel).getByRole('button', { name: 'Remover troca Patinho grelhado' }));
      expect(await screen.findByText(/Sem trocas liberadas/)).toBeInTheDocument();

      slowGuidance.resolve({ data: buildSummaryPlan() });
      await waitFor(() => expect(screen.getByText(/^Salvo automaticamente às/)).toBeInTheDocument());

      expect(screen.getByText(/Sem trocas liberadas/)).toBeInTheDocument();
      expect(screen.queryByText('Patinho grelhado')).not.toBeInTheDocument();
    });
  });

  describe('swap basis toggle (422 nutrition.substitute.cannotEquate)', () => {
    it('shows the translated message and keeps the previous basis selected', async () => {
      const user = userEvent.setup();
      api.patch.mockRejectedValue(Object.assign(new Error('x'), {
        response: { status: 422, data: { messageCode: 'nutrition.substitute.cannotEquate' } },
      }));
      await renderLoaded();
      const panel = await openSwaps(user);

      await user.click(within(panel).getByRole('tab', { name: 'Calorias' }));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith(
        'Este alimento não tem o nutriente usado na equivalência e não pode ser uma troca.',
        'error',
      ));
      const refreshed = screen.getByRole('region', { name: 'Trocas liberadas' });
      expect(within(refreshed).getByRole('tab', { name: 'Proteína' })).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('header and preview copy', () => {
    it('formats the patient weight with a decimal comma', async () => {
      mockApi({ overview: buildOverview({ patient: buildPatientRow({ weightKg: 66.5 }) }) });
      await renderLoaded();
      expect(screen.getByText(/66,5 kg/)).toBeInTheDocument();
      expect(screen.queryByText(/66\.5 kg/)).not.toBeInTheDocument();
    });

    it('uses neutral copy for the app preview when the patient has no first name', async () => {
      mockApi({ overview: buildOverview({ patient: buildPatientRow({ firstName: null, lastName: null }) }) });
      await renderLoaded('luiza@example.com');

      expect(screen.getByRole('region', { name: 'Como o paciente vê' })).toBeInTheDocument();
      expect(screen.queryByText(/null/)).not.toBeInTheDocument();
    });
  });
});
