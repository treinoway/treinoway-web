import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import InvitesList from './InvitesList';
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
const mockWriteText = vi.fn();

const mockInvites = [
  {
    id: 'invite-1',
    email: 'ana@example.com',
    status: 'pending',
    statusLabel: 'Pendente',
    invitedByUserId: 'admin-1',
    userId: null,
    expiresAt: '2025-05-01T12:00:00.000Z',
    acceptedAt: null,
    revokedAt: null,
    createdAt: '2025-04-01T12:00:00.000Z',
  },
  {
    id: 'invite-2',
    email: 'bruno@example.com',
    status: 'accepted',
    statusLabel: 'Aceito',
    invitedByUserId: 'admin-1',
    userId: 'user-9',
    expiresAt: '2025-05-02T12:00:00.000Z',
    acceptedAt: '2025-04-05T12:00:00.000Z',
    revokedAt: null,
    createdAt: '2025-04-02T12:00:00.000Z',
  },
];

const buildResponse = (items = mockInvites, overrides = {}) => ({
  data: {
    items,
    total: items.length,
    page: 1,
    pageSize: 20,
    ...overrides,
  },
});

describe('InvitesList', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    mockWriteText.mockReset().mockResolvedValue(undefined);
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    api.post.mockReset();
    api.get.mockResolvedValue(buildResponse());
  });

  it('renders the page title', () => {
    renderWithRouter(<InvitesList />);

    expect(screen.getByRole('heading', { name: 'Convites de treinadores' })).toBeInTheDocument();
  });

  it('fetches and displays invites on mount', async () => {
    renderWithRouter(<InvitesList />);

    await waitFor(() => {
      expect(screen.getByText('ana@example.com')).toBeInTheDocument();
      expect(screen.getByText('bruno@example.com')).toBeInTheDocument();
    });

    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/admin/trainer-invites?'));
  });

  it('shows backend-translated status labels as badges', async () => {
    renderWithRouter(<InvitesList />);

    await waitFor(() => {
      expect(screen.getByText('Pendente')).toBeInTheDocument();
      expect(screen.getByText('Aceito')).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<InvitesList />);

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('shows full empty state when there are no invites and no filters', async () => {
    api.get.mockResolvedValue(buildResponse([], { total: 0 }));

    renderWithRouter(<InvitesList />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum convite enviado')).toBeInTheDocument();
    });
  });

  it('creates an invite and reveals the code and magic link', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({
      data: {
        invite: { id: 'invite-3', email: 'novo@example.com', status: 'pending', statusLabel: 'Pendente' },
        code: 'TF-8F3K-2Q7M-04',
      },
    });

    renderWithRouter(<InvitesList />);

    await waitFor(() => screen.getByText('ana@example.com'));

    await user.type(screen.getByLabelText(/e-mail do treinador/i), 'novo@example.com');
    await user.click(screen.getByRole('button', { name: /enviar convite/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/admin/trainer-invites', { email: 'novo@example.com' });
    });

    expect(screen.getByText('TF-8F3K-2Q7M-04')).toBeInTheDocument();
    expect(screen.getByText('https://teufit.com.br/invite?code=TF-8F3K-2Q7M-04')).toBeInTheDocument();
    expect(mockShowToast).toHaveBeenCalledWith('Convite enviado com sucesso!', 'success');
  });

  it('copies the generated code to the clipboard', async () => {
    const user = userEvent.setup();
    // Install after userEvent.setup() so it wins over userEvent's own stub.
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      configurable: true,
    });
    api.post.mockResolvedValue({
      data: {
        invite: { id: 'invite-3', email: 'novo@example.com', status: 'pending', statusLabel: 'Pendente' },
        code: 'TF-8F3K-2Q7M-04',
      },
    });

    renderWithRouter(<InvitesList />);

    await waitFor(() => screen.getByText('ana@example.com'));

    await user.type(screen.getByLabelText(/e-mail do treinador/i), 'novo@example.com');
    await user.click(screen.getByRole('button', { name: /enviar convite/i }));

    await waitFor(() => screen.getByText('TF-8F3K-2Q7M-04'));

    await user.click(screen.getByRole('button', { name: /copiar código/i }));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('TF-8F3K-2Q7M-04');
      expect(mockShowToast).toHaveBeenCalledWith('Copiado!', 'success');
    });
  });

  it('shows the backend message when the email already has an active invite (409)', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({
      userMessage: 'Este e-mail já possui um convite ativo.',
      response: { status: 409, data: { messageCode: 'invite.alreadyActiveForEmail' } },
    });

    renderWithRouter(<InvitesList />);

    await waitFor(() => screen.getByText('ana@example.com'));

    await user.type(screen.getByLabelText(/e-mail do treinador/i), 'ana@example.com');
    await user.click(screen.getByRole('button', { name: /enviar convite/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Este e-mail já possui um convite ativo.', 'error');
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Este e-mail já possui um convite ativo.');
  });

  it('revokes a pending invite after confirmation', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({});

    renderWithRouter(<InvitesList />);

    await waitFor(() => screen.getByText('ana@example.com'));

    await user.click(screen.getByRole('button', { name: /ações do convite ana@example.com/i }));
    await user.click(screen.getByText('Revogar'));

    await waitFor(() => screen.getByRole('button', { name: /confirmar/i }));
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/admin/trainer-invites/invite-1/revoke');
      expect(mockShowToast).toHaveBeenCalledWith('Convite revogado.', 'success');
    });
  });

  it('does not revoke when confirmation is cancelled', async () => {
    const user = userEvent.setup();

    renderWithRouter(<InvitesList />);

    await waitFor(() => screen.getByText('ana@example.com'));

    await user.click(screen.getByRole('button', { name: /ações do convite ana@example.com/i }));
    await user.click(screen.getByText('Revogar'));

    await waitFor(() => screen.getByRole('button', { name: /cancelar/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(api.post).not.toHaveBeenCalled();
  });

  it('does not offer a revoke action for non-pending invites', async () => {
    renderWithRouter(<InvitesList />);

    await waitFor(() => screen.getByText('bruno@example.com'));

    expect(
      screen.queryByRole('button', { name: /ações do convite bruno@example.com/i })
    ).not.toBeInTheDocument();
  });

  it('shows toast on list fetch error', async () => {
    api.get.mockRejectedValue({ userMessage: 'Falha de rede' });

    renderWithRouter(<InvitesList />);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Falha de rede', 'error');
    });
  });
});
