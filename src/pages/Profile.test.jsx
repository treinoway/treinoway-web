import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { selectOption } from '../test-utils/selectOption';
import { renderWithRouter } from '../test/test-utils';
import Profile from './Profile';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

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

vi.mock('../components/TrainerProfileSection', () => ({
  default: () => <div data-testid="trainer-profile-section">TrainerProfileSection</div>,
}));

const mockRefreshUser = vi.fn();
const mockUpdateUser = vi.fn();
const mockShowToast = vi.fn();
const mockHasRole = vi.fn(() => false);
const mockLogout = vi.fn();
const mockGrantAdmin = vi.fn();

const mockUser = {
  id: 1,
  email: 'user@example.com',
  firstName: 'João',
  lastName: 'Silva',
  gender: 'male',
  birthDate: '1990-05-15T00:00:00.000Z',
};

const mockEmptyUser = {
  id: 1,
  email: 'user@example.com',
};

const mockUserWithAddress = {
  ...mockUser,
  address: {
    postalCode: '01310100',
    line1: 'Rua das Flores',
    neighborhood: 'Centro',
    city: 'São Paulo',
    stateCode: 'SP',
  },
};

const mockUserWithSocials = {
  ...mockUser,
  socials: {
    instagram: '@joao',
    whatsapp: '+5511999999999',
    linkedin: 'linkedin.com/in/joao',
  },
};

describe('Profile', () => {
  beforeEach(() => {
    mockRefreshUser.mockClear();
    mockRefreshUser.mockResolvedValue(null);
    mockUpdateUser.mockReset();
    mockShowToast.mockReset();
    mockHasRole.mockReset();
    mockHasRole.mockReturnValue(false);
    mockLogout.mockReset();
    mockNavigate.mockReset();
    mockGrantAdmin.mockReset();
    vi.mocked(api.patch).mockClear();
    vi.mocked(api.get).mockClear();

    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      updateUser: mockUpdateUser,
      refreshUser: mockRefreshUser,
      hasRole: mockHasRole,
      logout: mockLogout,
      isAdmin: false,
      grantAdmin: mockGrantAdmin,
    });
  });

  it('renders the profile card title', () => {
    renderWithRouter(<Profile />);

    expect(screen.getByText('Informações do Perfil')).toBeInTheDocument();
  });

  it('displays user email in view mode', () => {
    renderWithRouter(<Profile />);

    expect(screen.getAllByText('user@example.com').length).toBeGreaterThanOrEqual(1);
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

  it('form inputs are pre-filled with user data in edit mode', async () => {
    const user = userEvent.setup();

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));

    const inputs = screen.getAllByRole('textbox');
    const firstNameInput = inputs[0];
    const lastNameInput = inputs[1];

    expect(firstNameInput).toHaveValue('João');
    expect(lastNameInput).toHaveValue('Silva');
  });

  it('calls profile update API with only changed fields', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: mockUser });
    vi.mocked(useAuth).mockReturnValue({
      user: mockEmptyUser,
      updateUser: mockUpdateUser,
      refreshUser: mockRefreshUser,
      hasRole: mockHasRole,
    });

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));

    const inputs = screen.getAllByRole('textbox');
    const firstNameInput = inputs[0];
    await user.type(firstNameInput, 'Maria');

    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/me/profile', {
        firstName: 'Maria',
      });
    });
  });

  it('shows success toast and exits edit mode on successful update', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: mockUser });
    vi.mocked(useAuth).mockReturnValue({
      user: mockEmptyUser,
      updateUser: mockUpdateUser,
      refreshUser: mockRefreshUser,
      hasRole: mockHasRole,
    });

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));

    const inputs = screen.getAllByRole('textbox');
    const firstNameInput = inputs[0];
    await user.type(firstNameInput, 'João');

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
    vi.mocked(useAuth).mockReturnValue({
      user: mockEmptyUser,
      updateUser: mockUpdateUser,
      refreshUser: mockRefreshUser,
      hasRole: mockHasRole,
    });

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));

    const inputs = screen.getAllByRole('textbox');
    const firstNameInput = inputs[0];
    await user.type(firstNameInput, 'João');

    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('Erro'),
        'error'
      );
    });
  });

  it('shows error toast when submitting empty form', async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue({
      user: mockEmptyUser,
      updateUser: mockUpdateUser,
      refreshUser: mockRefreshUser,
      hasRole: mockHasRole,
    });

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Preencha ao menos um campo para salvar.',
        'error'
      );
      expect(api.patch).not.toHaveBeenCalled();
    });
  });

  it('trims string values before submitting', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: mockUser });
    vi.mocked(useAuth).mockReturnValue({
      user: mockEmptyUser,
      updateUser: mockUpdateUser,
      refreshUser: mockRefreshUser,
      hasRole: mockHasRole,
    });

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));

    const inputs = screen.getAllByRole('textbox');
    const firstNameInput = inputs[0];
    await user.type(firstNameInput, '  João  ');

    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/me/profile', {
        firstName: 'João',
      });
    });
  });

  it('does not include empty fields in payload', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: mockUser });
    vi.mocked(useAuth).mockReturnValue({
      user: mockEmptyUser,
      updateUser: mockUpdateUser,
      refreshUser: mockRefreshUser,
      hasRole: mockHasRole,
    });

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));

    const inputs = screen.getAllByRole('textbox');
    const firstNameInput = inputs[0];
    const genderSelect = screen.getByRole('combobox');

    await user.type(firstNameInput, 'João');
    await selectOption(user,genderSelect, 'male');

    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledTimes(1);
      const payload = vi.mocked(api.patch).mock.calls[0][1];

      expect(payload).toEqual({
        firstName: 'João',
        gender: 'male',
      });
      expect(payload).not.toHaveProperty('lastName');
      expect(payload).not.toHaveProperty('birthDate');
      expect(payload).not.toHaveProperty('address');
      expect(payload).not.toHaveProperty('socials');
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

  it('renders avatar circle with correct initials in view mode', () => {
    renderWithRouter(<Profile />);

    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  it('renders avatar circle with email initial when user has no name', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockEmptyUser,
      updateUser: mockUpdateUser,
      refreshUser: mockRefreshUser,
      hasRole: mockHasRole,
    });

    renderWithRouter(<Profile />);

    expect(screen.getByText('U')).toBeInTheDocument();
  });

  it('does not render avatar row in edit mode', async () => {
    const user = userEvent.setup();

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));

    expect(screen.queryByText('JS')).not.toBeInTheDocument();
  });

  // Tweak 2: Empty fields are hidden, summary shown instead
  it('hides empty fields in view mode and shows empty field count', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockEmptyUser,
      updateUser: mockUpdateUser,
      refreshUser: mockRefreshUser,
      hasRole: mockHasRole,
    });

    renderWithRouter(<Profile />);

    // Should NOT show "Não informado" for individual fields
    expect(screen.queryByText('Não informado')).not.toBeInTheDocument();
    // Should show empty field summaries (multiple sections)
    const summaries = screen.getAllByText(/campos não preenchidos/);
    expect(summaries.length).toBeGreaterThan(0);
  });

  // Tweak 10: Address section shows compact format
  it('renders compact address when user has address data', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUserWithAddress,
      updateUser: mockUpdateUser,
      refreshUser: mockRefreshUser,
      hasRole: mockHasRole,
    });

    renderWithRouter(<Profile />);

    expect(screen.getByText(/endereço/i)).toBeInTheDocument();
    // Compact format: "Rua das Flores" on line 1
    expect(screen.getByText('Rua das Flores')).toBeInTheDocument();
    // Line 2: "Centro - São Paulo/SP - 01310100"
    expect(screen.getByText('Centro - São Paulo/SP - 01310100')).toBeInTheDocument();
  });

  // Tweak 10: Address section shows message when empty
  it('shows "Endereço não informado" when address is empty', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockEmptyUser,
      updateUser: mockUpdateUser,
      refreshUser: mockRefreshUser,
      hasRole: mockHasRole,
    });

    renderWithRouter(<Profile />);

    expect(screen.getByText('Endereço não informado')).toBeInTheDocument();
  });

  // Step 1: Always show socials section
  it('renders socials section even when user has no socials data', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockEmptyUser,
      updateUser: mockUpdateUser,
      refreshUser: mockRefreshUser,
      hasRole: mockHasRole,
    });

    renderWithRouter(<Profile />);

    expect(screen.getByText(/redes sociais/i)).toBeInTheDocument();
  });

  // Step 2: Cancel button
  it('shows Cancel button in edit mode', async () => {
    const user = userEvent.setup();

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));

    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('cancel restores original data and exits edit mode', async () => {
    const user = userEvent.setup();

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));

    const inputs = screen.getAllByRole('textbox');
    const firstNameInput = inputs[0];
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'NomeAlterado');

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    // Should be back in view mode with original data
    expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^salvar$/i })).not.toBeInTheDocument();
    // Original name should be displayed (not "NomeAlterado")
    expect(screen.queryByText('NomeAlterado')).not.toBeInTheDocument();
    expect(screen.getAllByText(/João/).length).toBeGreaterThan(0);
  });

  // Step 2: Disabled inputs during loading
  it('disables form inputs during loading', async () => {
    const user = userEvent.setup();
    let resolveUpdate;
    api.patch.mockReturnValue(new Promise((resolve) => { resolveUpdate = resolve; }));

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));

    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0], 'Test');

    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    // Save button should show loading state and be disabled
    expect(screen.getByRole('button', { name: /salvando/i })).toBeDisabled();
    // Cancel should also be disabled
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeDisabled();

    resolveUpdate({ data: mockUser });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /editar/i })).toBeInTheDocument();
    });
  });

  // Step 5: CEP inline error
  it('shows inline error when CEP lookup fails', async () => {
    const user = userEvent.setup();
    api.get.mockRejectedValue({
      userMessage: 'CEP não encontrado.',
      response: { status: 404 },
    });

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));
    await user.type(screen.getByPlaceholderText('00000-000'), '99999999');

    await waitFor(() => {
      expect(screen.getByText('CEP não encontrado.')).toBeInTheDocument();
    });
  });

  it('clears CEP error when user types new value', async () => {
    const user = userEvent.setup();
    api.get.mockRejectedValueOnce({
      userMessage: 'CEP não encontrado.',
      response: { status: 404 },
    });

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));
    const cepInput = screen.getByPlaceholderText('00000-000');
    await user.type(cepInput, '99999999');

    await waitFor(() => {
      expect(screen.getByText('CEP não encontrado.')).toBeInTheDocument();
    });

    await user.type(cepInput, '0');

    expect(screen.queryByText('CEP não encontrado.')).not.toBeInTheDocument();
  });

  // Step 4: No separate Estado field in edit mode
  it('does not show separate Estado field in edit mode', async () => {
    const user = userEvent.setup();

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));

    const labels = screen.getAllByText(/^UF$/);
    expect(labels.length).toBe(1);
    expect(screen.queryByLabelText('Estado')).not.toBeInTheDocument();
  });

  // Step 7: TrainerProfileSection integration
  it('renders TrainerProfileSection when user is a trainer', () => {
    mockHasRole.mockImplementation((role) => role === 'TRAINER');

    renderWithRouter(<Profile />);

    expect(screen.getByTestId('trainer-profile-section')).toBeInTheDocument();
  });

  it('does not render TrainerProfileSection when user is not a trainer', () => {
    mockHasRole.mockReturnValue(false);

    renderWithRouter(<Profile />);

    expect(screen.queryByTestId('trainer-profile-section')).not.toBeInTheDocument();
  });

  // Step 8: Socials section hidden for trainers
  it('hides socials section in view mode for trainers', () => {
    mockHasRole.mockImplementation((role) => role === 'TRAINER');
    vi.mocked(useAuth).mockReturnValue({
      user: mockUserWithSocials,
      updateUser: mockUpdateUser,
      refreshUser: mockRefreshUser,
      hasRole: mockHasRole,
    });

    renderWithRouter(<Profile />);

    // Should not show "Redes Sociais" section in the personal card
    expect(screen.queryByText('Redes Sociais')).not.toBeInTheDocument();
  });

  it('shows socials section in view mode for non-trainers', () => {
    mockHasRole.mockReturnValue(false);
    vi.mocked(useAuth).mockReturnValue({
      user: mockUserWithSocials,
      updateUser: mockUpdateUser,
      refreshUser: mockRefreshUser,
      hasRole: mockHasRole,
    });

    renderWithRouter(<Profile />);

    expect(screen.getByText('Redes Sociais')).toBeInTheDocument();
  });

  it('hides socials section in edit mode for trainers', async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role) => role === 'TRAINER');

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));

    expect(screen.queryByText('Redes Sociais')).not.toBeInTheDocument();
  });

  // Step 6: buildPatchPayload diff - only sends changed fields
  it('does not send unchanged fields in payload', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: mockUser });
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      updateUser: mockUpdateUser,
      refreshUser: mockRefreshUser,
      hasRole: mockHasRole,
    });

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));

    // Change only the lastName
    const inputs = screen.getAllByRole('textbox');
    const lastNameInput = inputs[1];
    await user.clear(lastNameInput);
    await user.type(lastNameInput, 'Santos');

    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledTimes(1);
      const payload = vi.mocked(api.patch).mock.calls[0][1];
      expect(payload).toEqual({ lastName: 'Santos' });
      // Should not include unchanged fields
      expect(payload).not.toHaveProperty('firstName');
      expect(payload).not.toHaveProperty('gender');
    });
  });

  // Tweak 1: Stacked info layout in view mode
  it('renders info items in stacked layout (label on top, value below)', () => {
    renderWithRouter(<Profile />);

    // Check that email label exists without inline suffix
    const emailLabels = screen.getAllByText('E-mail');
    expect(emailLabels.length).toBeGreaterThan(0);
    // Name should be displayed as stacked (value only, no "Nome:" inline)
    const nameElements = screen.getAllByText('João Silva');
    expect(nameElements.length).toBeGreaterThan(0);
  });

  // Tweak 3: Larger avatar
  it('renders avatar with larger size', () => {
    renderWithRouter(<Profile />);

    const avatar = screen.getByText('JS').closest('.profile-avatar');
    expect(avatar).toBeInTheDocument();
  });

  // Tweak 6: Section completeness indicator
  it('shows check icon when all personal fields are filled', () => {
    renderWithRouter(<Profile />);

    expect(screen.getByLabelText('Seção completa')).toBeInTheDocument();
  });

  it('shows "Incompleto" when section has empty fields', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockEmptyUser,
      updateUser: mockUpdateUser,
      refreshUser: mockRefreshUser,
      hasRole: mockHasRole,
    });

    renderWithRouter(<Profile />);

    const incompleteTexts = screen.getAllByText('Incompleto');
    expect(incompleteTexts.length).toBeGreaterThan(0);
  });

  // Tweak 2: Socials section shows filled fields only
  it('shows only filled social fields in view mode', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        ...mockUser,
        socials: {
          instagram: '@joao',
          whatsapp: '',
          linkedin: '',
        },
      },
      updateUser: mockUpdateUser,
      refreshUser: mockRefreshUser,
      hasRole: mockHasRole,
    });

    renderWithRouter(<Profile />);

    expect(screen.getByText('@joao')).toBeInTheDocument();
    // WhatsApp and LinkedIn should not be rendered since empty
    expect(screen.queryByText('WhatsApp')).not.toBeInTheDocument();
    expect(screen.queryByText('LinkedIn')).not.toBeInTheDocument();
  });

  // Tweak 5: City and UF on same grid row in edit mode
  it('renders city and UF fields in edit mode', async () => {
    const user = userEvent.setup();

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /editar/i }));

    expect(screen.getByPlaceholderText('SP')).toBeInTheDocument();
    expect(screen.getByText('Cidade')).toBeInTheDocument();
    expect(screen.getByText('UF')).toBeInTheDocument();
  });

  // Logout
  it('renders a "Sair da conta" button', () => {
    renderWithRouter(<Profile />);

    expect(screen.getByRole('button', { name: /sair da conta/i })).toBeInTheDocument();
  });

  it('calls logout and navigates to /login when "Sair da conta" is clicked', async () => {
    const user = userEvent.setup();

    renderWithRouter(<Profile />);

    await user.click(screen.getByRole('button', { name: /sair da conta/i }));

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  // Admin entry-point — three branches: admin / bootstrap email / other user
  describe('admin entry-point', () => {
    it('shows "Acessar modo admin" and navigates to /admin/videos when user is admin', async () => {
      const user = userEvent.setup();
      vi.mocked(useAuth).mockReturnValue({
        user: { ...mockUser, email: 'admin@example.com', roles: ['admin'] },
        updateUser: mockUpdateUser,
        refreshUser: mockRefreshUser,
        hasRole: mockHasRole,
        logout: mockLogout,
        isAdmin: true,
        grantAdmin: mockGrantAdmin,
      });

      renderWithRouter(<Profile />);

      const button = screen.getByRole('button', { name: /acessar modo admin/i });
      expect(button).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /tornar-me admin/i })).not.toBeInTheDocument();

      await user.click(button);

      expect(mockNavigate).toHaveBeenCalledWith('/admin/videos');
      expect(mockGrantAdmin).not.toHaveBeenCalled();
    });

    it('shows "Tornar-me admin" for bootstrap email; click triggers grantAdmin and navigates', async () => {
      const user = userEvent.setup();
      mockGrantAdmin.mockResolvedValue({ user: { roles: ['TRAINER', 'admin'] } });
      vi.mocked(useAuth).mockReturnValue({
        user: { ...mockUser, email: 'n.santos1897@gmail.com' },
        updateUser: mockUpdateUser,
        refreshUser: mockRefreshUser,
        hasRole: mockHasRole,
        logout: mockLogout,
        isAdmin: false,
        grantAdmin: mockGrantAdmin,
      });

      renderWithRouter(<Profile />);

      const button = screen.getByRole('button', { name: /tornar-me admin/i });
      expect(button).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /acessar modo admin/i })).not.toBeInTheDocument();

      await user.click(button);

      await waitFor(() => {
        expect(mockGrantAdmin).toHaveBeenCalledTimes(1);
        expect(mockShowToast).toHaveBeenCalledWith('Modo admin ativado!', 'success');
        expect(mockNavigate).toHaveBeenCalledWith('/admin/videos');
      });
    });

    it('matches the bootstrap email case-insensitively and with surrounding whitespace', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { ...mockUser, email: '  N.Santos1897@Gmail.COM  ' },
        updateUser: mockUpdateUser,
        refreshUser: mockRefreshUser,
        hasRole: mockHasRole,
        logout: mockLogout,
        isAdmin: false,
        grantAdmin: mockGrantAdmin,
      });

      renderWithRouter(<Profile />);

      expect(screen.getByRole('button', { name: /tornar-me admin/i })).toBeInTheDocument();
    });

    it('shows error toast when grantAdmin fails and does not navigate', async () => {
      const user = userEvent.setup();
      const grantError = new Error('Forbidden');
      grantError.userMessage = 'Você não tem permissão.';
      mockGrantAdmin.mockRejectedValue(grantError);
      vi.mocked(useAuth).mockReturnValue({
        user: { ...mockUser, email: 'n.santos1897@gmail.com' },
        updateUser: mockUpdateUser,
        refreshUser: mockRefreshUser,
        hasRole: mockHasRole,
        logout: mockLogout,
        isAdmin: false,
        grantAdmin: mockGrantAdmin,
      });

      renderWithRouter(<Profile />);

      await user.click(screen.getByRole('button', { name: /tornar-me admin/i }));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Você não tem permissão.', 'error');
      });
      expect(mockNavigate).not.toHaveBeenCalledWith('/admin/videos');
    });

    it('renders no admin entry-point button for a regular non-bootstrap user', () => {
      vi.mocked(useAuth).mockReturnValue({
        user: { ...mockUser, email: 'someone-else@example.com' },
        updateUser: mockUpdateUser,
        refreshUser: mockRefreshUser,
        hasRole: mockHasRole,
        logout: mockLogout,
        isAdmin: false,
        grantAdmin: mockGrantAdmin,
      });

      renderWithRouter(<Profile />);

      expect(screen.queryByRole('button', { name: /acessar modo admin/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /tornar-me admin/i })).not.toBeInTheDocument();
    });
  });
});
