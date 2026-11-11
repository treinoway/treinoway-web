import userEvent from '@testing-library/user-event';
import { renderWithRoute, screen, waitFor } from '../../test/test-utils';
import PlanSummary from './PlanSummary';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import { PATIENT_ID, buildFoodGroups, buildOverview, buildPlan } from '../../test/nutritionFixtures';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

describe('PlanSummary publish ordering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
  });

  it('does not let a slow publish response overwrite a newer autosave response', async () => {
    const user = userEvent.setup();
    const plan = buildPlan({ status: 'published', publishedAt: '2026-10-20T12:00:00.000Z', hasUnpublishedChanges: true });
    api.get.mockImplementation((url) => {
      if (url === `/nutritionist/patients/${PATIENT_ID}/plan`) return Promise.resolve({ data: plan });
      if (url === `/nutritionist/patients/${PATIENT_ID}/overview`) return Promise.resolve({ data: buildOverview() });
      if (url === '/food-groups') return Promise.resolve({ data: buildFoodGroups() });
      return Promise.resolve({ data: { items: [] } });
    });
    api.patch.mockImplementation(() => Promise.resolve({ data: { ...plan, hasUnpublishedChanges: true } }));
    let resolvePublish;
    api.post.mockImplementation(() => new Promise((resolve) => { resolvePublish = resolve; }));
    renderWithRoute(<PlanSummary />, { route: `/nutritionist/patients/${PATIENT_ID}/plan`, path: '/nutritionist/patients/:patientId/plan' });
    await screen.findByRole('heading', { name: 'Luiza Andrade' });

    await user.click(screen.getByRole('button', { name: 'Publicar plano' }));
    await waitFor(() => expect(api.post).toHaveBeenCalled());
    await user.type(screen.getByRole('textbox', { name: 'Recado pra paciente' }), 'Bora!');
    await waitFor(() => expect(api.patch).toHaveBeenCalled(), { timeout: 3000 });

    resolvePublish({ data: { ...plan, hasUnpublishedChanges: false } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publicar plano' })).toBeEnabled());

    expect(screen.getByText('Alterações não publicadas')).toBeInTheDocument();
  });
});
