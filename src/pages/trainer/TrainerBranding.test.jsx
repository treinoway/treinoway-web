import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import TrainerBranding from './TrainerBranding';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

const mockBranding = {
  id: 'branding-1',
  trainerId: 'trainer-1',
  primaryColor: '#FF5733',
  secondaryColor: '#33A1FF',
  logoUrl: 'https://example.com/logo.png',
  coverImageUrl: 'https://example.com/cover.png',
  welcomeMessage: 'Bem-vindo!',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('TrainerBranding', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    api.put.mockReset();
    api.post.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:http://localhost/fake');
    URL.revokeObjectURL = vi.fn();
    localStorage.clear();
  });

  it('shows loading state while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderWithRouter(<TrainerBranding />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('fetches branding from /trainer/branding on mount', async () => {
    api.get.mockResolvedValue({ data: null });
    renderWithRouter(<TrainerBranding />);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/trainer/branding');
    });
  });

  it('renders page title after loading', async () => {
    api.get.mockResolvedValue({ data: null });
    renderWithRouter(<TrainerBranding />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sua Marca', level: 1 })).toBeInTheDocument();
    });
  });

  it('renders welcome message textarea with default empty value when branding is null', async () => {
    api.get.mockResolvedValue({ data: null });
    renderWithRouter(<TrainerBranding />);
    await waitFor(() => {
      expect(screen.getByLabelText('Mensagem de boas-vindas')).toHaveValue('');
    });
  });

  it('populates welcome message with existing branding data', async () => {
    api.get.mockResolvedValue({ data: mockBranding });
    renderWithRouter(<TrainerBranding />);
    await waitFor(() => {
      expect(screen.getByLabelText('Mensagem de boas-vindas')).toHaveValue('Bem-vindo!');
    });
  });

  it('shows existing logo when branding has logoUrl', async () => {
    api.get.mockResolvedValue({ data: mockBranding });
    renderWithRouter(<TrainerBranding />);
    await waitFor(() => {
      const logoImgs = screen.getAllByAltText('Logo');
      expect(logoImgs[0]).toHaveAttribute('src', 'https://example.com/logo.png');
    });
  });

  it('shows existing cover when branding has coverImageUrl', async () => {
    api.get.mockResolvedValue({ data: mockBranding });
    renderWithRouter(<TrainerBranding />);
    await waitFor(() => {
      const coverImgs = screen.getAllByAltText('Imagem de capa');
      expect(coverImgs[0]).toHaveAttribute('src', 'https://example.com/cover.png');
    });
  });

  it('saves branding with PUT /trainer/branding', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockBranding });
    api.put.mockResolvedValue({ data: mockBranding });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Mensagem de boas-vindas')).toBeInTheDocument();
    });

    // Make it dirty first by changing welcome message
    await user.clear(screen.getByLabelText('Mensagem de boas-vindas'));
    await user.type(screen.getByLabelText('Mensagem de boas-vindas'), 'Nova mensagem');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/trainer/branding', {
        primaryColor: '#FF5733',
        secondaryColor: '#33A1FF',
        welcomeMessage: 'Nova mensagem',
      });
    });
    expect(mockShowToast).toHaveBeenCalledWith('Marca salva com sucesso!', 'success');
  });

  it('save button is disabled when form is not dirty', async () => {
    api.get.mockResolvedValue({ data: mockBranding });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Mensagem de boas-vindas')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
  });

  it('shows error toast when fetch fails', async () => {
    const error = new Error('network');
    error.userMessage = 'Sem conexão';
    api.get.mockRejectedValue(error);
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Sem conexão', 'error');
    });
  });

  it('shows error toast when all saves fail', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: null });
    const error = new Error('fail');
    error.userMessage = 'Erro ao salvar';
    api.put.mockRejectedValue(error);
    api.post.mockRejectedValue(new Error('upload fail'));
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Mensagem de boas-vindas')).toBeInTheDocument();
      expect(screen.getByLabelText('Selecionar Logo')).toBeInTheDocument();
    });

    // Select both logo and cover files to trigger all 3 promises
    const logoFile = new File(['img'], 'logo.png', { type: 'image/png' });
    const coverFile = new File(['img'], 'cover.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByLabelText('Selecionar Logo'), { target: { files: [logoFile] } });
    fireEvent.change(screen.getByLabelText('Selecionar Imagem de capa'), { target: { files: [coverFile] } });

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao salvar', 'error');
    });
  });

  it('shows character count for welcome message', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: null });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getAllByText('0/200')[0]).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Mensagem de boas-vindas'), 'Hello');

    expect(screen.getAllByText('5/200')[0]).toBeInTheDocument();
  });

  it('disables save button while saving', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: null });
    api.put.mockImplementation(() => new Promise(() => {}));
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Mensagem de boas-vindas')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Mensagem de boas-vindas'), 'Olá!');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled();
  });

  it('shows onboarding banner when branding is zeroed', async () => {
    api.get.mockResolvedValue({ data: null });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByText('Personalize o app dos seus alunos')).toBeInTheDocument();
    });
  });

  it('does not show banner when already dismissed', async () => {
    localStorage.setItem('branding_banner_dismissed', 'true');
    api.get.mockResolvedValue({ data: null });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sua Marca', level: 1 })).toBeInTheDocument();
    });

    expect(screen.queryByText('Personalize o app dos seus alunos')).not.toBeInTheDocument();
  });

  it('dismisses the banner and persists to localStorage', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: null });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByText('Personalize o app dos seus alunos')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(screen.queryByText('Personalize o app dos seus alunos')).not.toBeInTheDocument();
    expect(localStorage.getItem('branding_banner_dismissed')).toBe('true');
  });

  it('opens info bottom sheet when info button is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: null });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Informações sobre personalização' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Informações sobre personalização' }));

    expect(screen.getByText('O que você pode personalizar')).toBeInTheDocument();
  });

  it('closes bottom sheet when close button is clicked', async () => {
    const user = userEvent.setup();
    // Use branding with data so banner is not shown (no extra "Fechar" button)
    api.get.mockResolvedValue({ data: mockBranding });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Informações sobre personalização' })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Informações sobre personalização' }));
    expect(screen.getByText('O que você pode personalizar')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Fechar' }));

    expect(screen.queryByText('O que você pode personalizar')).not.toBeInTheDocument();
  });

  it('toggles preview on mobile via the toggle button', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: null });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ver prévia/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /ver prévia/i }));

    expect(screen.getByRole('button', { name: /ocultar prévia/i })).toBeInTheDocument();
  });

  it('resets form values when discard is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: null });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Mensagem de boas-vindas')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Mensagem de boas-vindas'), 'Teste');
    expect(screen.getByLabelText('Mensagem de boas-vindas')).toHaveValue('Teste');

    await user.click(screen.getByRole('button', { name: 'Descartar' }));

    expect(screen.getByLabelText('Mensagem de boas-vindas')).toHaveValue('');
  });

  it('rejects file with invalid type via BrandingAssetUpload', async () => {
    api.get.mockResolvedValue({ data: null });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Selecionar Logo')).toBeInTheDocument();
    });

    const file = new File(['content'], 'test.gif', { type: 'image/gif' });
    const logoInput = screen.getByLabelText('Selecionar Logo');
    fireEvent.change(logoInput, { target: { files: [file] } });

    expect(mockShowToast).toHaveBeenCalledWith(
      'Tipo de arquivo inválido. Apenas JPEG, PNG e WebP são permitidos.',
      'error'
    );
  });

  it('rejects file that is too large via BrandingAssetUpload', async () => {
    api.get.mockResolvedValue({ data: null });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Selecionar Logo')).toBeInTheDocument();
    });

    const largeContent = new ArrayBuffer(6 * 1024 * 1024);
    const file = new File([largeContent], 'big.png', { type: 'image/png' });
    const logoInput = screen.getByLabelText('Selecionar Logo');
    fireEvent.change(logoInput, { target: { files: [file] } });

    expect(mockShowToast).toHaveBeenCalledWith(
      'Arquivo muito grande. O tamanho máximo é 5MB.',
      'error'
    );
  });

  it('shows preview of selected logo file before saving', async () => {
    api.get.mockResolvedValue({ data: null });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Selecionar Logo')).toBeInTheDocument();
    });

    const file = new File(['img'], 'logo.png', { type: 'image/png' });
    const logoInput = screen.getByLabelText('Selecionar Logo');
    fireEvent.change(logoInput, { target: { files: [file] } });

    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
  });

  it('uploads logo and cover via POST when saving with files', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: null });
    api.put.mockResolvedValue({ data: { primaryColor: '#1565C0', secondaryColor: null, welcomeMessage: null } });
    api.post.mockResolvedValue({ data: { logoUrl: 'https://example.com/new-logo.png', coverImageUrl: null } });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Selecionar Logo')).toBeInTheDocument();
    });

    const file = new File(['img'], 'logo.png', { type: 'image/png' });
    const logoInput = screen.getByLabelText('Selecionar Logo');
    fireEvent.change(logoInput, { target: { files: [file] } });

    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/branding/logo',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
    });
    expect(mockShowToast).toHaveBeenCalledWith('Marca salva com sucesso!', 'success');
  });

  it('shows partial error toast when some saves fail', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: null });
    api.put.mockResolvedValue({ data: { primaryColor: '#1565C0' } });
    api.post.mockRejectedValue(new Error('upload fail'));
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Selecionar Logo')).toBeInTheDocument();
    });

    const file = new File(['img'], 'logo.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Selecionar Logo'), { target: { files: [file] } });
    await user.type(screen.getByLabelText('Mensagem de boas-vindas'), 'Olá!');
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Algumas alterações falharam ao salvar. Tente novamente.',
        'warning'
      );
    });
  });

  it('opens bottom sheet from "Como funciona" link in banner', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: null });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /como funciona/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /como funciona/i }));

    expect(screen.getByText('O que você pode personalizar')).toBeInTheDocument();
  });
});
