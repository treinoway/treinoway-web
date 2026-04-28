import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRoute } from '../../test/test-utils';
import { selectOption } from '../../test-utils/selectOption';
import VideoCreate from './VideoCreate';
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

describe('VideoCreate', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.post.mockReset();
  });

  it('renders the form with Criar submit label', () => {
    renderWithRoute(<VideoCreate />, { route: '/admin/videos/new', path: '/admin/videos/new' });

    expect(screen.getByRole('heading', { name: /novo vídeo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar' })).toBeInTheDocument();
  });

  it('submits payload to POST /admin/videos and navigates on success', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 'new-1', title: 'Treino A' } });

    renderWithRoute(<VideoCreate />, { route: '/admin/videos/new', path: '/admin/videos/new' });

    await user.type(screen.getByLabelText(/título/i), 'Treino A');
    await user.type(screen.getByLabelText(/url do vídeo/i), 'https://video.example.com/a');
    await selectOption(user, screen.getByLabelText(/categoria/i), 'strength');
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/admin/videos',
        expect.objectContaining({
          title: 'Treino A',
          url: 'https://video.example.com/a',
          category: 'strength',
          tags: [],
        })
      );
    });
    expect(mockShowToast).toHaveBeenCalledWith('Vídeo cadastrado com sucesso!', 'success');
    await waitFor(() => {
      expect(screen.getByTestId('redirected')).toBeInTheDocument();
    });
  });

  it('shows backend error message when POST fails', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({ userMessage: 'Falha ao salvar vídeo.' });

    renderWithRoute(<VideoCreate />, { route: '/admin/videos/new', path: '/admin/videos/new' });

    await user.type(screen.getByLabelText(/título/i), 'Treino A');
    await user.type(screen.getByLabelText(/url do vídeo/i), 'https://video.example.com/a');
    await selectOption(user, screen.getByLabelText(/categoria/i), 'cardio');
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Falha ao salvar vídeo.', 'error');
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao salvar vídeo.');
  });

  it('shows field-level errors when backend returns validation details', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({
      userMessage: 'Há erros no formulário.',
      response: {
        data: {
          details: [{ field: 'title', message: 'Título inválido' }],
        },
      },
    });

    renderWithRoute(<VideoCreate />, { route: '/admin/videos/new', path: '/admin/videos/new' });

    await user.type(screen.getByLabelText(/título/i), 'Treino A');
    await user.type(screen.getByLabelText(/url do vídeo/i), 'https://video.example.com/x');
    await selectOption(user, screen.getByLabelText(/categoria/i), 'cardio');
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() => {
      expect(screen.getByText('Título inválido')).toBeInTheDocument();
    });
  });

  it('navigates back to the list on cancel', async () => {
    const user = userEvent.setup();

    renderWithRoute(<VideoCreate />, { route: '/admin/videos/new', path: '/admin/videos/new' });

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    await waitFor(() => {
      expect(screen.getByTestId('redirected')).toBeInTheDocument();
    });
  });
});
