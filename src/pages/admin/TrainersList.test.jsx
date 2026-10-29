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

const trainerAna = {
  trainerId: 'trainer-1',
  userId: 'user-1',
  firstName: 'Ana',
  lastName: 'Silva',
  email: 'ana@example.com',
  tier: 'FREE',
  subscriptionStatus: null,
  hasAsaasSubscription: false,
  activeStudents: 2,
  studentCap: 3,
};

const trainerBruno = {
  trainerId: 'trainer-2',
  userId: 'user-2',
  firstName: null,
  lastName: null,
  email: 'bruno@example.com',
  tier: 'PRO',
  subscriptionStatus: 'ACTIVE',
  hasAsaasSubscription: true,
  activeStudents: 12,
  studentCap: 20,
};

const trainerCarla = {
  trainerId: 'trainer-3',
  userId: 'user-3',
  firstName: 'Carla',
  lastName: 'Souza',
  email: 'carla@example.com',
  tier: 'DIAMOND',
  subscriptionStatus: 'ACTIVE',
  hasAsaasSubscription: false,
  activeStudents: 150,
  studentCap: null,
};

// Builds a paginated trainers list API response.
const buildResponse = (items = [trainerAna, trainerBruno, trainerCarla]) => ({
  data: { items, total: items.length, page: 1, pageSize: 20 },
});

// Finds a table row by the trainer name.
const getRow = (name) => screen.getByRole('row', { name: new RegExp(name, 'i') });

// Opens the change-plan dialog for a trainer and returns the dialog element.
const openChangeDialog = async (user, trainerName) => {
  await user.click(await screen.findByRole('button', { name: `Ações de ${trainerName}` }));
  await user.click(screen.getByRole('button', { name: 'Alterar plano' }));
  return screen.findByRole('dialog');
};

describe('TrainersList', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    api.patch.mockReset();
    api.get.mockResolvedValue(buildResponse());
  });

  it('renders the page title', async () => {
    renderWithRouter(<TrainersList />);

    expect(screen.getByRole('heading', { name: 'Trainers e planos' })).toBeInTheDocument();
    await waitFor(() => expect(api.get).toHaveBeenCalled());
  });

  it('shows loading state while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<TrainersList />);

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('fetches /admin/trainers on mount', async () => {
    renderWithRouter(<TrainersList />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/admin/trainers',
        expect.objectContaining({ params: expect.objectContaining({ page: 1 }) })
      );
    });
  });

  it('lists trainers with name, falling back to the email when there is no name', async () => {
    renderWithRouter(<TrainersList />);

    await waitFor(() => expect(screen.getByText('Ana Silva')).toBeInTheDocument());
    expect(screen.getByText('Carla Souza')).toBeInTheDocument();
    expect(within(getRow('bruno@example.com')).getAllByText('bruno@example.com').length).toBeGreaterThan(0);
  });

  it('shows the plan badge using the platformPlan.tier labels', async () => {
    renderWithRouter(<TrainersList />);

    await waitFor(() => screen.getByText('Ana Silva'));

    expect(within(getRow('Ana Silva')).getByText('Grátis')).toBeInTheDocument();
    expect(within(getRow('bruno@example.com')).getByText('Pro')).toBeInTheDocument();
    expect(within(getRow('Carla Souza')).getByText('Diamond')).toBeInTheDocument();
  });

  it('shows active students over the cap, and "Ilimitado" when the cap is null', async () => {
    renderWithRouter(<TrainersList />);

    await waitFor(() => screen.getByText('Ana Silva'));

    expect(within(getRow('Ana Silva')).getByText('2 / 3')).toBeInTheDocument();
    expect(within(getRow('bruno@example.com')).getByText('12 / 20')).toBeInTheDocument();
    expect(within(getRow('Carla Souza')).getByText('150 / Ilimitado')).toBeInTheDocument();
  });

  it('shows the empty state when no trainer matches', async () => {
    api.get.mockResolvedValue(buildResponse([]));

    renderWithRouter(<TrainersList />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum trainer encontrado')).toBeInTheDocument();
    });
  });

  it('shows an error state and an error toast when the list fails to load', async () => {
    api.get.mockRejectedValue({ userMessage: 'Falha de rede' });

    renderWithRouter(<TrainersList />);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Falha de rede', 'error');
    });
    expect(screen.getByText('Não foi possível carregar os trainers.')).toBeInTheDocument();
  });

  it('refetches with the search term when searching', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainersList />);
    await waitFor(() => screen.getByText('Ana Silva'));

    await user.type(screen.getByLabelText('Buscar trainer'), 'ana');

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        '/admin/trainers',
        expect.objectContaining({ params: expect.objectContaining({ search: 'ana', page: 1 }) })
      );
    });
  });

  describe('change plan dialog', () => {
    it('opens a dialog for the chosen trainer', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TrainersList />);

      const dialog = await openChangeDialog(user, 'Ana Silva');

      expect(within(dialog).getByRole('heading', { name: 'Alterar plano' })).toBeInTheDocument();
      expect(within(dialog).getByText(/Ana Silva/)).toBeInTheDocument();
    });

    it('changes the plan: PATCH, row update and success toast', async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValue({
        data: {
          trainerId: 'trainer-1',
          previousTier: 'FREE',
          tier: 'PLATINUM',
          changed: true,
          subscriptionStatus: 'ACTIVE',
          hasAsaasSubscription: false,
          activeStudents: 2,
          studentCap: 80,
        },
      });
      renderWithRouter(<TrainersList />);

      const dialog = await openChangeDialog(user, 'Ana Silva');
      await selectOption(user, within(dialog).getByRole('combobox', { name: 'Novo plano' }), 'PLATINUM');
      await user.click(within(dialog).getByRole('button', { name: 'Confirmar alteração' }));

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/admin/trainers/trainer-1/platform-plan', { tier: 'PLATINUM' });
      });
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(within(getRow('Ana Silva')).getByText('Platinum')).toBeInTheDocument();
      expect(within(getRow('Ana Silva')).getByText('2 / 80')).toBeInTheDocument();
      expect(mockShowToast).toHaveBeenCalledWith('Plano alterado com sucesso.', 'success');
    });

    it('shows the backend message as an error toast when the change fails', async () => {
      const user = userEvent.setup();
      api.patch.mockRejectedValue({ userMessage: 'Trainer não encontrado.' });
      renderWithRouter(<TrainersList />);

      const dialog = await openChangeDialog(user, 'Ana Silva');
      await selectOption(user, within(dialog).getByRole('combobox', { name: 'Novo plano' }), 'PRO');
      await user.click(within(dialog).getByRole('button', { name: 'Confirmar alteração' }));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Trainer não encontrado.', 'error');
      });
      expect(within(getRow('Ana Silva')).getByText('Grátis')).toBeInTheDocument();
    });

    it('does not send anything when cancelled', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TrainersList />);

      const dialog = await openChangeDialog(user, 'Ana Silva');
      await selectOption(user, within(dialog).getByRole('combobox', { name: 'Novo plano' }), 'PRO');
      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

      expect(api.patch).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('disables the confirm button while saving', async () => {
      const user = userEvent.setup();
      api.patch.mockImplementation(() => new Promise(() => {}));
      renderWithRouter(<TrainersList />);

      const dialog = await openChangeDialog(user, 'Ana Silva');
      await selectOption(user, within(dialog).getByRole('combobox', { name: 'Novo plano' }), 'PRO');
      await user.click(within(dialog).getByRole('button', { name: 'Confirmar alteração' }));

      await waitFor(() => {
        expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvando...' })).toBeDisabled();
      });
    });

    it('warns that the next billing webhook may overwrite the tier only for Asaas-billed trainers', async () => {
      const user = userEvent.setup();
      const asaasWarning =
        'Este trainer tem assinatura ativa no Asaas. O próximo webhook de cobrança pode sobrescrever o plano definido aqui.';
      renderWithRouter(<TrainersList />);

      let dialog = await openChangeDialog(user, 'Ana Silva');
      expect(within(dialog).queryByText(asaasWarning)).not.toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

      dialog = await openChangeDialog(user, 'bruno@example.com');
      expect(within(dialog).getByText(asaasWarning)).toBeInTheDocument();
    });

    it('warns about blocked students only when the new tier is lower', async () => {
      const user = userEvent.setup();
      const downgradeWarning = 'Alunos acima do limite do novo plano serão bloqueados.';
      renderWithRouter(<TrainersList />);

      const dialog = await openChangeDialog(user, 'bruno@example.com');
      const select = within(dialog).getByRole('combobox', { name: 'Novo plano' });

      expect(within(dialog).queryByText(downgradeWarning)).not.toBeInTheDocument();

      await selectOption(user, select, 'PLATINUM');
      expect(within(dialog).queryByText(downgradeWarning)).not.toBeInTheDocument();

      await selectOption(user, select, 'FREE');
      expect(within(dialog).getByText(downgradeWarning)).toBeInTheDocument();
    });
  });
});
