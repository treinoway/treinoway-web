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

const baseTrainer = {
  trainerId: 'trainer-1',
  userId: 'user-1',
  firstName: 'Tania',
  lastName: 'Treino',
  email: 'tania@example.com',
  tier: 'FREE',
  subscriptionStatus: null,
  hasAsaasSubscription: false,
  activeStudents: 3,
  studentCap: 5,
  accountType: 'trainer',
  inviteStatus: 'none',
  inviteSentAt: null,
};

const trainerNone = baseTrainer;
const trainerPending = {
  ...baseTrainer,
  trainerId: 'trainer-2',
  userId: 'user-2',
  firstName: 'Paulo',
  lastName: 'Pendente',
  email: 'paulo@example.com',
  inviteStatus: 'pending',
  inviteSentAt: '2026-10-20T10:00:00.000Z',
};
const trainerAccepted = {
  ...baseTrainer,
  trainerId: 'trainer-3',
  userId: 'user-3',
  firstName: 'Aline',
  lastName: 'Aceita',
  email: 'aline@example.com',
  inviteStatus: 'accepted',
};
const trainerAsaas = {
  ...baseTrainer,
  trainerId: 'trainer-4',
  userId: 'user-4',
  firstName: 'Pedro',
  lastName: 'Pagante',
  email: 'pedro@example.com',
  tier: 'GOLD',
  hasAsaasSubscription: true,
};
const signupNone = {
  trainerId: null,
  userId: 'user-5',
  firstName: 'Sara',
  lastName: 'Sozinha',
  email: 'sara@example.com',
  tier: null,
  subscriptionStatus: null,
  hasAsaasSubscription: false,
  activeStudents: null,
  studentCap: null,
  accountType: 'signup',
  inviteStatus: 'none',
  inviteSentAt: null,
};

// Mocks the list endpoint with the given rows.
const respondWith = (items) =>
  api.get.mockResolvedValue({ data: { items, total: items.length, page: 1, pageSize: 20 } });

// Returns the table row that contains the given e-mail.
const rowOf = async (email) => (await screen.findByText(email)).closest('tr');

// Opens the row's three-dot menu.
const openMenu = async (user, email) => {
  const row = await rowOf(email);
  await user.click(within(row).getByRole('button', { name: /ações/i }));
  return row;
};

describe('TrainersList - signups and invite state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
  });

  it('requests the list with includeSignups=true', async () => {
    respondWith([trainerNone]);
    renderWithRouter(<TrainersList />);

    await screen.findByText('tania@example.com');

    expect(api.get).toHaveBeenCalledWith(
      '/admin/trainers',
      expect.objectContaining({ params: expect.objectContaining({ includeSignups: true }) })
    );
  });

  it('shows name, email and the "Cadastro sem convite" indicator for a signup, without plan or students', async () => {
    respondWith([signupNone]);
    renderWithRouter(<TrainersList />);

    const row = await rowOf('sara@example.com');

    expect(within(row).getByText('Sara Sozinha')).toBeInTheDocument();
    expect(within(row).getByText('Cadastro sem convite')).toBeInTheDocument();
    expect(within(row).queryByText(/ilimitado/i)).not.toBeInTheDocument();
    expect(within(row).queryByText(/null|undefined/)).not.toBeInTheDocument();
    expect(within(row).queryByText(/\/ /)).not.toBeInTheDocument();
  });

  it('does not show the signup indicator for trainer rows', async () => {
    respondWith([trainerNone]);
    renderWithRouter(<TrainersList />);

    const row = await rowOf('tania@example.com');

    expect(within(row).queryByText('Cadastro sem convite')).not.toBeInTheDocument();
  });

  it('shows the invite state of every row in pt-BR', async () => {
    respondWith([trainerNone, trainerPending, trainerAccepted, signupNone]);
    renderWithRouter(<TrainersList />);

    expect(within(await rowOf('tania@example.com')).getByText('Sem convite')).toBeInTheDocument();
    expect(within(await rowOf('paulo@example.com')).getByText('Pendente')).toBeInTheDocument();
    expect(within(await rowOf('aline@example.com')).getByText('Aceito')).toBeInTheDocument();
    expect(within(await rowOf('sara@example.com')).getByText('Sem convite')).toBeInTheDocument();
  });

  it('filters by invite state and omits inviteStatus for "Todos"', async () => {
    const user = userEvent.setup();
    respondWith([trainerNone]);
    renderWithRouter(<TrainersList />);
    await screen.findByText('tania@example.com');

    await selectOption(user, screen.getByRole('combobox', { name: 'Convite' }), 'pending');

    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith(
        '/admin/trainers',
        expect.objectContaining({ params: expect.objectContaining({ inviteStatus: 'pending' }) })
      );
    });

    await user.click(screen.getByRole('combobox', { name: 'Convite' }));
    await user.click(screen.getByRole('option', { name: 'Todos' }));

    await waitFor(() => {
      const { params } = api.get.mock.calls.at(-1)[1];
      expect(params.inviteStatus).toBeUndefined();
    });
  });

  it('offers the three invite filter options besides "Todos"', async () => {
    const user = userEvent.setup();
    respondWith([trainerNone]);
    renderWithRouter(<TrainersList />);
    await screen.findByText('tania@example.com');

    await user.click(screen.getByRole('combobox', { name: 'Convite' }));

    expect(screen.getByRole('option', { name: 'Todos' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Sem convite' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Pendente' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Aceito' })).toBeInTheDocument();
  });
});

describe('TrainersList - invite row actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
  });

  it('offers "Enviar convite" for a row without invite and "Alterar plano" for a trainer', async () => {
    const user = userEvent.setup();
    respondWith([trainerNone]);
    renderWithRouter(<TrainersList />);

    await openMenu(user, 'tania@example.com');

    expect(screen.getByRole('button', { name: 'Enviar convite' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alterar plano' })).toBeInTheDocument();
  });

  it('offers "Reenviar convite" for a pending row', async () => {
    const user = userEvent.setup();
    respondWith([trainerPending]);
    renderWithRouter(<TrainersList />);

    await openMenu(user, 'paulo@example.com');

    expect(screen.getByRole('button', { name: 'Reenviar convite' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar convite' })).not.toBeInTheDocument();
  });

  it('offers no invite action for an accepted row', async () => {
    const user = userEvent.setup();
    respondWith([trainerAccepted]);
    renderWithRouter(<TrainersList />);

    await openMenu(user, 'aline@example.com');

    expect(screen.queryByRole('button', { name: /enviar convite/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reenviar convite/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alterar plano' })).toBeInTheDocument();
  });

  it('offers invite but no plan change for a signup row', async () => {
    const user = userEvent.setup();
    respondWith([signupNone]);
    renderWithRouter(<TrainersList />);

    await openMenu(user, 'sara@example.com');

    expect(screen.getByRole('button', { name: 'Enviar convite' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Alterar plano' })).not.toBeInTheDocument();
  });

  it('shows the invite item disabled for a trainer with an Asaas subscription', async () => {
    const user = userEvent.setup();
    respondWith([trainerAsaas]);
    renderWithRouter(<TrainersList />);

    await openMenu(user, 'pedro@example.com');

    expect(screen.getByRole('button', { name: 'Enviar convite' })).toBeDisabled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('asks for confirmation, posts the invite, toasts and marks the row as Pendente', async () => {
    const user = userEvent.setup();
    respondWith([trainerNone]);
    api.post.mockResolvedValue({
      data: { invite: { id: 'inv-1', email: 'tania@example.com', status: 'pending' }, code: 'TF-AAAA-BBBB-CC' },
    });
    renderWithRouter(<TrainersList />);

    await openMenu(user, 'tania@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar convite' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(api.post).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: /enviar/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/admin/trainer-invites', { email: 'tania@example.com' });
    });
    expect(mockShowToast).toHaveBeenCalledWith(expect.any(String), 'success');
    expect(within(await rowOf('tania@example.com')).getByText('Pendente')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('warns on resend that the previous link stops working', async () => {
    const user = userEvent.setup();
    respondWith([trainerPending]);
    renderWithRouter(<TrainersList />);

    await openMenu(user, 'paulo@example.com');
    await user.click(screen.getByRole('button', { name: 'Reenviar convite' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText(/link anterior.*deixa de funcionar|deixará de funcionar/i)).toBeInTheDocument();
  });

  it('does not post when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    respondWith([trainerNone]);
    renderWithRouter(<TrainersList />);

    await openMenu(user, 'tania@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar convite' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));

    expect(api.post).not.toHaveBeenCalled();
    expect(within(await rowOf('tania@example.com')).getByText('Sem convite')).toBeInTheDocument();
  });

  it('shows error.userMessage in a toast when sending fails and keeps the row state', async () => {
    const user = userEvent.setup();
    respondWith([trainerNone]);
    api.post.mockRejectedValue(Object.assign(new Error('x'), { userMessage: 'Convite já aceito.' }));
    renderWithRouter(<TrainersList />);

    await openMenu(user, 'tania@example.com');
    await user.click(screen.getByRole('button', { name: 'Enviar convite' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /enviar/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Convite já aceito.', 'error');
    });
    expect(within(await rowOf('tania@example.com')).getByText('Sem convite')).toBeInTheDocument();
  });
});
