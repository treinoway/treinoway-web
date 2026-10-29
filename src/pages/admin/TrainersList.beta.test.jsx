import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import { selectOption } from '../../test-utils/selectOption';
import TrainersList from './TrainersList';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

const trainerBeta = {
  trainerId: 'trainer-9',
  userId: 'user-9',
  firstName: 'Beto',
  lastName: 'Beta',
  email: 'beto@example.com',
  tier: 'BETA',
  subscriptionStatus: null,
  hasAsaasSubscription: false,
  activeStudents: 40,
  studentCap: null,
};

const downgradeWarning = 'Alunos acima do limite do novo plano serão bloqueados.';

// Opens the change-plan dialog for the BETA trainer and returns the dialog element.
const openBetaDialog = async (user) => {
  await user.click(await screen.findByRole('button', { name: 'Ações de Beto Beta' }));
  await user.click(screen.getByRole('button', { name: 'Alterar plano' }));
  return screen.findByRole('dialog');
};

describe('TrainersList - BETA trainer change plan', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    api.patch.mockReset();
    api.get.mockResolvedValue({ data: { items: [trainerBeta], total: 1, page: 1, pageSize: 20 } });
  });

  it('shows "Beta" as the current value of the select, not the placeholder', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainersList />);

    const dialog = await openBetaDialog(user);
    const select = within(dialog).getByRole('combobox', { name: 'Novo plano' });

    expect(within(select).getByText('Beta')).toBeInTheDocument();
    expect(within(select).queryByText('Grátis')).not.toBeInTheDocument();
  });

  it('offers "Beta" as an option', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainersList />);

    const dialog = await openBetaDialog(user);
    await user.click(within(dialog).getByRole('combobox', { name: 'Novo plano' }));

    expect(document.querySelector('[data-value="BETA"]')).not.toBeNull();
  });

  it('does not warn when moving BETA to DIAMOND, but warns when moving to PRO', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainersList />);

    const dialog = await openBetaDialog(user);
    const select = within(dialog).getByRole('combobox', { name: 'Novo plano' });

    await selectOption(user, select, 'DIAMOND');
    expect(within(dialog).queryByText(downgradeWarning)).not.toBeInTheDocument();

    await selectOption(user, select, 'PRO');
    expect(within(dialog).getByText(downgradeWarning)).toBeInTheDocument();
  });

  it('shows the backend message as an error toast when the PATCH is rejected with 409', async () => {
    const user = userEvent.setup();
    api.patch.mockRejectedValue({
      response: { status: 409 },
      userMessage: 'Plano Beta não pode ser alterado manualmente.',
    });
    renderWithRouter(<TrainersList />);

    const dialog = await openBetaDialog(user);
    await selectOption(user, within(dialog).getByRole('combobox', { name: 'Novo plano' }), 'DIAMOND');
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar alteração' }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Plano Beta não pode ser alterado manualmente.', 'error');
    });
  });
});
