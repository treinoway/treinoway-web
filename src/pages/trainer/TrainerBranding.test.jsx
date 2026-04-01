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
      expect(screen.getByRole('heading', { name: 'Personalização', level: 1 })).toBeInTheDocument();
    });
  });

  it('renders form with default values when branding is null', async () => {
    api.get.mockResolvedValue({ data: null });
    renderWithRouter(<TrainerBranding />);
    await waitFor(() => {
      expect(screen.getByLabelText('Cor primária')).toHaveValue('#6D28D9');
    });
    expect(screen.getByLabelText('Cor secundária')).toHaveValue('');
    expect(screen.getByLabelText('Mensagem de boas-vindas')).toHaveValue('');
  });

  it('populates form with existing branding data', async () => {
    api.get.mockResolvedValue({ data: mockBranding });
    renderWithRouter(<TrainerBranding />);
    await waitFor(() => {
      expect(screen.getByLabelText('Cor primária')).toHaveValue('#FF5733');
    });
    expect(screen.getByLabelText('Cor secundária')).toHaveValue('#33A1FF');
    expect(screen.getByLabelText('Mensagem de boas-vindas')).toHaveValue('Bem-vindo!');
  });

  it('shows existing logo when branding has logoUrl', async () => {
    api.get.mockResolvedValue({ data: mockBranding });
    renderWithRouter(<TrainerBranding />);
    await waitFor(() => {
      expect(screen.getByAltText('Logo atual')).toHaveAttribute('src', 'https://example.com/logo.png');
    });
  });

  it('shows existing cover when branding has coverImageUrl', async () => {
    api.get.mockResolvedValue({ data: mockBranding });
    renderWithRouter(<TrainerBranding />);
    await waitFor(() => {
      expect(screen.getByAltText('Capa atual')).toHaveAttribute('src', 'https://example.com/cover.png');
    });
  });

  it('shows validation error for invalid hex color', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: null });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Cor primária')).toBeInTheDocument();
    });

    const colorInput = screen.getByLabelText('Cor primária');
    await user.clear(colorInput);
    await user.type(colorInput, 'invalid');

    expect(screen.getByText(/formato inválido/i)).toBeInTheDocument();
  });

  it('saves branding with PUT /trainer/branding', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: null });
    api.put.mockResolvedValue({ data: { ...mockBranding, primaryColor: '#6D28D9', secondaryColor: null, welcomeMessage: null } });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Cor primária')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/trainer/branding', {
        primaryColor: '#6D28D9',
        secondaryColor: null,
        welcomeMessage: null,
      });
    });
    expect(mockShowToast).toHaveBeenCalledWith('Personalização salva com sucesso!', 'success');
  });

  it('saves branding with welcome message', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: null });
    api.put.mockResolvedValue({ data: mockBranding });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Mensagem de boas-vindas')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Mensagem de boas-vindas'), 'Olá!');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/trainer/branding', {
        primaryColor: '#6D28D9',
        secondaryColor: null,
        welcomeMessage: 'Olá!',
      });
    });
  });

  it('does not submit when color is invalid', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: null });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Cor primária')).toBeInTheDocument();
    });

    const colorInput = screen.getByLabelText('Cor primária');
    await user.clear(colorInput);
    await user.type(colorInput, 'bad');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(api.put).not.toHaveBeenCalled();
  });

  it('shows error toast when save fails', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: null });
    const error = new Error('fail');
    error.userMessage = 'Erro ao salvar';
    api.put.mockRejectedValue(error);
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Cor primária')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao salvar', 'error');
    });
  });

  it('shows character count for welcome message', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: null });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByText('0/200')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Mensagem de boas-vindas'), 'Hello');

    expect(screen.getByText('5/200')).toBeInTheDocument();
  });

  it('rejects file with invalid type', async () => {
    api.get.mockResolvedValue({ data: mockBranding });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Cor primária')).toBeInTheDocument();
    });

    const file = new File(['content'], 'test.gif', { type: 'image/gif' });
    const logoInput = document.querySelector('#logoInput');
    fireEvent.change(logoInput, { target: { files: [file] } });

    expect(mockShowToast).toHaveBeenCalledWith(
      'Tipo de arquivo inválido. Apenas JPEG, PNG e WebP são permitidos.',
      'error'
    );
  });

  it('rejects file that is too large', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockBranding });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Cor primária')).toBeInTheDocument();
    });

    const largeContent = new ArrayBuffer(6 * 1024 * 1024);
    const file = new File([largeContent], 'big.png', { type: 'image/png' });
    const logoInput = document.querySelector('#logoInput');
    await user.upload(logoInput, file);

    expect(mockShowToast).toHaveBeenCalledWith(
      'Arquivo muito grande. O tamanho máximo é 5MB.',
      'error'
    );
  });

  it('shows upload button after selecting a valid logo file', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockBranding });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Cor primária')).toBeInTheDocument();
    });

    const file = new File(['img'], 'logo.png', { type: 'image/png' });
    const logoInput = document.querySelector('#logoInput');
    await user.upload(logoInput, file);

    expect(screen.getByRole('button', { name: 'Enviar logo' })).toBeInTheDocument();
  });

  it('uploads logo via POST /trainer/branding/logo', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockBranding });
    api.post.mockResolvedValue({ data: { ...mockBranding, logoUrl: 'https://example.com/new-logo.png' } });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Cor primária')).toBeInTheDocument();
    });

    const file = new File(['img'], 'logo.png', { type: 'image/png' });
    const logoInput = document.querySelector('#logoInput');
    await user.upload(logoInput, file);
    await user.click(screen.getByRole('button', { name: 'Enviar logo' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/branding/logo',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
    });
    expect(mockShowToast).toHaveBeenCalledWith('Logo enviado com sucesso!', 'success');
  });

  it('uploads cover via POST /trainer/branding/cover', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockBranding });
    api.post.mockResolvedValue({ data: { ...mockBranding, coverImageUrl: 'https://example.com/new-cover.png' } });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Cor primária')).toBeInTheDocument();
    });

    const file = new File(['img'], 'cover.jpg', { type: 'image/jpeg' });
    const coverInput = document.querySelector('#coverInput');
    await user.upload(coverInput, file);
    await user.click(screen.getByRole('button', { name: 'Enviar capa' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/branding/cover',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
    });
    expect(mockShowToast).toHaveBeenCalledWith('Capa enviada com sucesso!', 'success');
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

  it('disables save button while saving', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: null });
    api.put.mockImplementation(() => new Promise(() => {}));
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Cor primária')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled();
  });

  it('shows color picker swatches synced with branding data', async () => {
    api.get.mockResolvedValue({ data: mockBranding });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      const primarySwatch = screen.getByLabelText('Pré-visualização da cor primária');
      expect(primarySwatch).toHaveValue('#ff5733');
    });
    const secondarySwatch = screen.getByLabelText('Pré-visualização da cor secundária');
    expect(secondarySwatch).toHaveValue('#33a1ff');
  });

  it('updating color picker updates the text input', async () => {
    api.get.mockResolvedValue({ data: null });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Pré-visualização da cor primária')).toBeInTheDocument();
    });

    const primarySwatch = screen.getByLabelText('Pré-visualização da cor primária');
    fireEvent.change(primarySwatch, { target: { value: '#112233' } });

    expect(screen.getByLabelText('Cor primária')).toHaveValue('#112233');
  });

  it('allows removing a selected logo file', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockBranding });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Cor primária')).toBeInTheDocument();
    });

    const file = new File(['img'], 'logo.png', { type: 'image/png' });
    const logoInput = document.querySelector('#logoInput');
    await user.upload(logoInput, file);

    expect(screen.getByRole('button', { name: 'Remover logo selecionado' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remover logo selecionado' }));

    expect(screen.queryByRole('button', { name: 'Enviar logo' })).not.toBeInTheDocument();
  });

  it('shows validation error for invalid secondary color', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: null });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Cor secundária')).toBeInTheDocument();
    });

    const secondaryInput = screen.getByLabelText('Cor secundária');
    await user.type(secondaryInput, 'bad');

    expect(screen.getByText(/formato inválido.*#RRGGBB.*#33A1FF/i)).toBeInTheDocument();
  });

  it('does not submit when secondary color is invalid', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: null });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Cor secundária')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Cor secundária'), 'bad');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(api.put).not.toHaveBeenCalled();
  });

  it('saves branding with secondary color', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: null });
    api.put.mockResolvedValue({ data: mockBranding });
    renderWithRouter(<TrainerBranding />);

    await waitFor(() => {
      expect(screen.getByLabelText('Cor secundária')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Cor secundária'), '#33A1FF');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/trainer/branding', {
        primaryColor: '#6D28D9',
        secondaryColor: '#33A1FF',
        welcomeMessage: null,
      });
    });
  });
});
