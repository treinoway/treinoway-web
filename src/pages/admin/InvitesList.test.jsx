import { screen, waitFor, within } from '@testing-library/react';
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

const ORIGINAL_URL = window.location.href;

const buildResponse = (items = mockInvites, overrides = {}) => ({
  data: {
    items,
    total: items.length,
    page: 1,
    pageSize: 20,
    ...overrides,
  },
});

// Fills the send form, submits it and waits until the created code is shown.
const createInviteThroughForm = async (user) => {
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
};

// Replaces navigator.clipboard with the writeText mock; call after userEvent.setup().
const installClipboardMock = () => {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: mockWriteText },
    configurable: true,
  });
};

describe('InvitesList', () => {
  afterEach(() => {
    globalThis.jsdom.reconfigure({ url: ORIGINAL_URL });
  });

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
    expect(
      screen.getByText(`${window.location.origin}/invite?code=TF-8F3K-2Q7M-04`)
    ).toBeInTheDocument();
    expect(screen.queryByText('https://teufit.com.br/invite?code=TF-8F3K-2Q7M-04')).not.toBeInTheDocument();
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

  it('copies the magic link built from the current origin, not the code', async () => {
    const user = userEvent.setup();
    installClipboardMock();

    await createInviteThroughForm(user);

    await user.click(screen.getByRole('button', { name: /copiar link/i }));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(`${window.location.origin}/invite?code=TF-8F3K-2Q7M-04`);
      expect(mockShowToast).toHaveBeenCalledWith('Copiado!', 'success');
    });
    expect(mockWriteText).not.toHaveBeenCalledWith('TF-8F3K-2Q7M-04');
  });

  it('builds the magic link on the app subdomain when served from app.teufit.com.br', async () => {
    globalThis.jsdom.reconfigure({ url: 'https://app.teufit.com.br/admin/invites' });
    const user = userEvent.setup();
    installClipboardMock();

    await createInviteThroughForm(user);

    expect(screen.getByText('https://app.teufit.com.br/invite?code=TF-8F3K-2Q7M-04')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /copiar link/i }));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith('https://app.teufit.com.br/invite?code=TF-8F3K-2Q7M-04');
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

  it('revokes a pending invite after confirmation in the design-system dialog', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({});

    renderWithRouter(<InvitesList />);

    await waitFor(() => screen.getByText('ana@example.com'));

    await user.click(screen.getByRole('button', { name: /ações do convite ana@example.com/i }));
    await user.click(screen.getByText('Revogar'));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveAccessibleName('Revogar o convite de ana@example.com? O código deixará de funcionar.');
    expect(api.post).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Revogar' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/admin/trainer-invites/invite-1/revoke');
      expect(mockShowToast).toHaveBeenCalledWith('Convite revogado.', 'success');
    });
  });

  it('shows an error toast when revoking fails', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({ userMessage: 'Convite não pode ser revogado.' });

    renderWithRouter(<InvitesList />);

    await waitFor(() => screen.getByText('ana@example.com'));

    await user.click(screen.getByRole('button', { name: /ações do convite ana@example.com/i }));
    await user.click(screen.getByText('Revogar'));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Revogar' }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Convite não pode ser revogado.', 'error');
    });
  });

  it('does not revoke when confirmation is cancelled', async () => {
    const user = userEvent.setup();

    renderWithRouter(<InvitesList />);

    await waitFor(() => screen.getByText('ana@example.com'));

    await user.click(screen.getByRole('button', { name: /ações do convite ana@example.com/i }));
    await user.click(screen.getByText('Revogar'));

    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(api.post).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
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
