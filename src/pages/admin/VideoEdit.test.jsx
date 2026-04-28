import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRoute } from '../../test/test-utils';
import VideoEdit from './VideoEdit';
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

const mockVideo = {
  id: 'video-1',
  title: 'Agachamento livre',
  description: 'Agachamento básico',
  url: 'https://video.example.com/squat',
  thumbnailUrl: 'https://img.example.com/squat.jpg',
  duration: 90,
  category: 'strength',
  categoryLabel: 'Força',
  bodySegment: 'lower',
  bodySegmentLabel: 'Inferior',
  tags: ['forca', 'iniciante'],
  createdById: 'admin-1',
  createdAt: '2025-04-01T12:00:00.000Z',
};

const renderVideoEdit = () => renderWithRoute(<VideoEdit />, {
  route: '/admin/videos/video-1',
  path: '/admin/videos/:videoId',
});

describe('VideoEdit', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();
    api.get.mockResolvedValue({ data: mockVideo });
  });

  it('shows loading while fetching the video', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    renderVideoEdit();

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('loads the video and prefills the form', async () => {
    renderVideoEdit();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Agachamento livre')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('Agachamento básico')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://video.example.com/squat')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://img.example.com/squat.jpg')).toBeInTheDocument();
    expect(screen.getByDisplayValue('90')).toBeInTheDocument();
    expect(screen.getByText('forca')).toBeInTheDocument();
    expect(screen.getByText('iniciante')).toBeInTheDocument();
  });

  it('redirects to list with toast on 404', async () => {
    api.get.mockRejectedValue({ response: { status: 404 } });

    renderVideoEdit();

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Vídeo não encontrado.', 'error');
    });
    expect(screen.getByTestId('redirected')).toBeInTheDocument();
  });

  it('submits PATCH on save', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: mockVideo });

    renderVideoEdit();

    await waitFor(() => screen.getByDisplayValue('Agachamento livre'));

    const titleInput = screen.getByLabelText(/título/i);
    await user.clear(titleInput);
    await user.type(titleInput, 'Agachamento livre v2');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/admin/videos/video-1',
        expect.objectContaining({ title: 'Agachamento livre v2' })
      );
    });
    expect(mockShowToast).toHaveBeenCalledWith('Vídeo atualizado com sucesso!', 'success');
  });

  it('shows error message when PATCH fails', async () => {
    const user = userEvent.setup();
    api.patch.mockRejectedValue({ userMessage: 'Falha ao atualizar.' });

    renderVideoEdit();

    await waitFor(() => screen.getByDisplayValue('Agachamento livre'));

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Falha ao atualizar.', 'error');
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao atualizar.');
  });

  it('opens confirm dialog and calls DELETE on confirmation', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});

    renderVideoEdit();

    await waitFor(() => screen.getByDisplayValue('Agachamento livre'));

    await user.click(screen.getByRole('button', { name: /excluir vídeo/i }));
    await waitFor(() => screen.getByRole('button', { name: /confirmar/i }));
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/admin/videos/video-1');
      expect(mockShowToast).toHaveBeenCalledWith('Vídeo excluído com sucesso!', 'success');
    });
  });

  it('does not delete when confirmation is cancelled', async () => {
    const user = userEvent.setup();

    renderVideoEdit();

    await waitFor(() => screen.getByDisplayValue('Agachamento livre'));

    await user.click(screen.getByRole('button', { name: /excluir vídeo/i }));
    await waitFor(() => screen.getByRole('button', { name: /confirmar/i }));

    // After the dialog opens, two "Cancelar" buttons exist (form + dialog).
    // Pick the second one (the dialog's), since the dialog is rendered last.
    const cancelButtons = screen.getAllByRole('button', { name: /^cancelar$/i });
    await user.click(cancelButtons[cancelButtons.length - 1]);

    expect(api.delete).not.toHaveBeenCalled();
  });
});
