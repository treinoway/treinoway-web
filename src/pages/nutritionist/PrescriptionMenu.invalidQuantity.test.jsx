import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '../../test/test-utils';
import PrescriptionMenu from './PrescriptionMenu';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import { PATIENT_ID, buildPlan } from '../../test/nutritionFixtures';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../components/nutrition/PrescriptionLayout', async () => import('../../test/prescriptionLayoutStub'));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const SAVE_TIMEOUT = { timeout: 4000 };

// Test helper: render the menu step.
const renderMenu = async () => {
  render(
    <MemoryRouter initialEntries={[`/nutritionist/patients/${PATIENT_ID}/plan/menu`]}>
      <Routes><Route path="/nutritionist/patients/:patientId/plan/menu" element={<PrescriptionMenu />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: 'Cardápio' });
};

// Test helper: retype a number.
const retype = async (user, input, value) => {
  await user.clear(input);
  await user.type(input, value);
};

describe('PrescriptionMenu — saved quantity edited to an invalid value', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    api.get.mockResolvedValue({ data: buildPlan() });
    api.patch.mockResolvedValue({ data: buildPlan() });
  });

  it('replaces "Salvo" with the quantity error and sends no second PATCH', async () => {
    const user = userEvent.setup();
    await renderMenu();
    const input = screen.getByLabelText('Quantidade de cuscuz de milho cozido');

    await retype(user, input, '150');
    expect(await screen.findByText(/^Salvo automaticamente às/, undefined, SAVE_TIMEOUT)).toBeInTheDocument();

    await retype(user, input, '0');
    await waitFor(() => expect(screen.queryByText(/^Salvo automaticamente às/)).not.toBeInTheDocument(), SAVE_TIMEOUT);
    expect(screen.getByText(/Corrija as quantidades destacadas/)).toBeInTheDocument();
    expect(api.patch).toHaveBeenCalledTimes(1);
  });
});
