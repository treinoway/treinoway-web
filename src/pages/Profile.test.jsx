import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import Profile from './Profile';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockRefreshUser = vi.fn();
const mockUpdateUser = vi.fn();
const mockShowToast = vi.fn();

const mockUser = {
  id: 1,
  email: 'user@example.com',
  firstName: 'João',
  lastName: 'Silva',
  gender: 'male',
  birthDate: '1990-05-15T00:00:00.000Z',
};

describe('Profile', () => {
  beforeEach(() => {
    mockRefreshUser.mockClear();
    mockRefreshUser.mockResolvedValue(null);
    mockUpdateUser.mockReset();
    mockShowToast.mockReset();

    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      updateUser: mockUpdateUser,
      refreshUser: mockRefreshUser,
    });
  });

  it('renders the profile page title', () => {
    renderWithRouter(<Profile />);

    expect(screen.getByText('Meu Perfil')).toBeInTheDocument();
  });

  it('displays user email in view mode', () => {
    renderWithRouter(<Profile />);

    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });

  it('shows the Edit button in view mode', () => {
    renderWithRouter(<Profile />);

    expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument();
  });

  it('switches to edit mode when Edit button is clicked', async () => {
    const user = userEvent.setup();

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));

    expect(screen.getByRole('button', { name: /^salvar$/i })).toBeInTheDocument();
  });

  it('pre-fills form inputs with user data in edit mode', async () => {
    const user = userEvent.setup();

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));

    expect(screen.getByDisplayValue('João')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Silva')).toBeInTheDocument();
  });

  it('calls profile update API on form submission', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: mockUser });

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/me/profile', expect.any(Object));
    });
  });

  it('shows success toast and exits edit mode on successful update', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: mockUser });

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Perfil atualizado com sucesso!', 'success');
      expect(screen.queryByRole('button', { name: /^salvar$/i })).not.toBeInTheDocument();
    });
  });

  it('shows error toast when profile update fails', async () => {
    const user = userEvent.setup();
    api.patch.mockRejectedValue({
      response: { status: 500, data: { message: 'Internal server error' } },
      userMessage: 'Erro interno do servidor.',
    });

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Erro'),
        'error'
      );
    });
  });

  it('triggers CEP lookup when 8-digit postal code is entered', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({
      data: {
        logradouro: 'Rua das Flores',
        bairro: 'Centro',
        localidade: 'São Paulo',
        estado: 'São Paulo',
        uf: 'SP',
      },
    });

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));
    await user.type(screen.getByPlaceholderText('00000-000'), '01310100');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/postal-code?code=01310100');
    });
  });

  it('calls refreshUser on mount', async () => {
    renderWithRouter(<Profile />);

    await waitFor(() => {
      expect(mockRefreshUser).toHaveBeenCalledTimes(1);
    });
  });

  it('renders address section when user has address data', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        ...mockUser,
        address: {
          postalCode: '01310100',
          line1: 'Rua das Flores',
          neighborhood: 'Centro',
          city: 'São Paulo',
          stateCode: 'SP',
        },
      },
      updateUser: mockUpdateUser,
      refreshUser: mockRefreshUser,
    });

    renderWithRouter(<Profile />);

    expect(screen.getByText(/endereço/i)).toBeInTheDocument();
    expect(screen.getByText('01310100')).toBeInTheDocument();
  });
});
