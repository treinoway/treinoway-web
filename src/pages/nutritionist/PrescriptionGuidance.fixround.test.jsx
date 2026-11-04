import userEvent from '@testing-library/user-event';
import { renderWithRoute, screen, waitFor } from '../../test/test-utils';
import PrescriptionGuidance from './PrescriptionGuidance';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import { PATIENT_ID, buildOverview, buildPatientRow, buildPlan, buildSheet } from '../../test/nutritionFixtures';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const BASE = `/nutritionist/patients/${PATIENT_ID}`;
const SAVE_TIMEOUT = { timeout: 3000 };

// Test helper: mock api; every guidance PATCH answers with `hasUnpublishedChanges: true` like the service does on a published plan.
const mockApi = ({ plan, overview = buildOverview() }) => {
  api.get.mockImplementation((url) => {
    if (url === `${BASE}/plan`) return Promise.resolve({ data: plan });
    if (url === `${BASE}/sheet`) return Promise.resolve({ data: buildSheet() });
    if (url === `${BASE}/overview`) return Promise.resolve({ data: overview });
    return Promise.resolve({ data: {} });
  });
  api.patch.mockImplementation((url, body) => Promise.resolve({
    data: { ...plan, hasUnpublishedChanges: true, guidance: { ...plan.guidance, ...body } },
  }));
};

// Test helper: render page.
const renderLoaded = async () => {
  renderWithRoute(<PrescriptionGuidance />, { route: `${BASE}/plan/guidance`, path: '/nutritionist/patients/:patientId/plan/guidance' });
  await screen.findByRole('heading', { name: 'Orientações do plano' });
};

describe('PrescriptionGuidance — fix round', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
  });

  it('shows "Alterações não publicadas" after an autosave on a published plan', async () => {
    const user = userEvent.setup();
    mockApi({ plan: buildPlan({ status: 'published', publishedAt: '2026-10-20T12:00:00.000Z', hasUnpublishedChanges: false }) });
    await renderLoaded();
    expect(screen.queryByText('Alterações não publicadas')).not.toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Observações do plano' }), ' Nova regra.');

    await waitFor(() => expect(api.patch).toHaveBeenCalled(), SAVE_TIMEOUT);
    expect(await screen.findByText('Alterações não publicadas')).toBeInTheDocument();
  });

  it('swaps the Publicado state for "Publicar plano" after the autosave response', async () => {
    const user = userEvent.setup();
    mockApi({ plan: buildPlan({ status: 'published', publishedAt: '2026-10-20T12:00:00.000Z' }) });
    await renderLoaded();
    expect(screen.getByText('Publicado')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Observações do plano' }), ' Nova regra.');

    await screen.findByText('Alterações não publicadas');
    expect(screen.getByRole('button', { name: 'Publicar plano' })).toBeEnabled();
    expect(screen.queryByText('Publicado')).not.toBeInTheDocument();
  });

  it('uses neutral copy for the preview when the patient has no first name', async () => {
    mockApi({
      plan: buildPlan(),
      overview: buildOverview({ patient: buildPatientRow({ firstName: null, lastName: null }) }),
    });
    await renderLoaded();

    expect(screen.getByRole('region', { name: 'Como o paciente vê' })).toBeInTheDocument();
    expect(screen.queryByText(/null/)).not.toBeInTheDocument();
  });
});
