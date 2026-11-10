import userEvent from '@testing-library/user-event';
import { renderWithRoute, screen, waitFor } from '../../test/test-utils';
import PrescriptionGuidance from './PrescriptionGuidance';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import { PATIENT_ID, buildOverview, buildPlan, buildSheet } from '../../test/nutritionFixtures';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const BASE = `/nutritionist/patients/${PATIENT_ID}`;

describe('PrescriptionGuidance publish ordering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
  });

  it('does not let a slow publish response overwrite a newer autosave response', async () => {
    const user = userEvent.setup();
    const published = buildPlan({ status: 'published', publishedAt: '2026-10-20T12:00:00.000Z', hasUnpublishedChanges: false });
    api.get.mockImplementation((url) => {
      if (url === `${BASE}/plan`) return Promise.resolve({ data: buildPlan() });
      if (url === `${BASE}/sheet`) return Promise.resolve({ data: buildSheet() });
      if (url === `${BASE}/overview`) return Promise.resolve({ data: buildOverview() });
      return Promise.resolve({ data: {} });
    });
    api.patch.mockImplementation(() => Promise.resolve({ data: { ...published, hasUnpublishedChanges: true } }));
    let resolvePublish;
    api.post.mockImplementation(() => new Promise((resolve) => { resolvePublish = resolve; }));
    renderWithRoute(<PrescriptionGuidance />, { route: `${BASE}/plan/guidance`, path: '/nutritionist/patients/:patientId/plan/guidance' });
    await screen.findByRole('heading', { name: 'Orientações do plano' });

    await user.click(screen.getByRole('button', { name: 'Publicar plano' }));
    await waitFor(() => expect(api.post).toHaveBeenCalled());
    await user.type(screen.getByRole('textbox', { name: 'Observações do plano' }), ' Nova regra.');
    await screen.findByText('Alterações não publicadas', {}, { timeout: 3000 });

    resolvePublish({ data: { ...published, hasUnpublishedChanges: false } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Publicar plano' })).toBeEnabled());

    expect(screen.getByText('Alterações não publicadas')).toBeInTheDocument();
  });
});
