import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateExerciseTemplateModal from './CreateExerciseTemplateModal';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

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
}));

vi.mock('../constants/exerciseTypes', () => ({
  EXERCISE_TYPE_OPTIONS: [
    { value: 'strength', label: 'Força' },
    { value: 'cardio', label: 'Cardio' },
  ],
}));

const mockShowToast = vi.fn();
const mockOnClose = vi.fn();
const mockOnSuccess = vi.fn();

const renderModal = (props = {}) =>
  render(
    <CreateExerciseTemplateModal
      open={true}
      onClose={mockOnClose}
      onSuccess={mockOnSuccess}
      {...props}
    />
  );

describe('CreateExerciseTemplateModal', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    mockOnClose.mockReset();
    mockOnSuccess.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.post.mockReset();
    api.patch.mockReset();
  });

  it('renders the modal when open is true', () => {
    renderModal();
    expect(screen.getByRole('heading', { name: 'Criar Modelo de Exercício' })).toBeInTheDocument();
  });

  it('does not render the modal when open is false', () => {
    render(
      <CreateExerciseTemplateModal open={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />
    );
    expect(screen.queryByText('Criar Modelo de Exercício')).not.toBeInTheDocument();
  });

  it('shows YouTube embed preview when a valid YouTube URL is entered', async () => {
    const user = userEvent.setup();
    renderModal();

    const videoInput = screen.getByLabelText(/url do vídeo/i);
    await user.type(videoInput, 'https://www.youtube.com/watch?v=abc123XYZ');

    const iframes = document.querySelectorAll('iframe');
    const youtubeIframe = Array.from(iframes).find((el) =>
      el.src.includes('youtube.com/embed/abc123XYZ')
    );
    expect(youtubeIframe).toBeTruthy();
  });

  it('shows YouTube embed preview for youtu.be short URLs', async () => {
    const user = userEvent.setup();
    renderModal();

    const videoInput = screen.getByLabelText(/url do vídeo/i);
    await user.type(videoInput, 'https://youtu.be/shortId99');

    const iframes = document.querySelectorAll('iframe');
    const youtubeIframe = Array.from(iframes).find((el) =>
      el.src.includes('youtube.com/embed/shortId99')
    );
    expect(youtubeIframe).toBeTruthy();
  });

  it('does not show YouTube embed for a non-YouTube URL', async () => {
    const user = userEvent.setup();
    renderModal();

    const videoInput = screen.getByLabelText(/url do vídeo/i);
    await user.type(videoInput, 'https://vimeo.com/123456789');

    const iframes = document.querySelectorAll('iframe');
    const youtubeIframe = Array.from(iframes).find((el) =>
      el.src.includes('youtube.com/embed')
    );
    expect(youtubeIframe).toBeFalsy();
  });

  it('removes the preview when the videoUrl field is cleared', async () => {
    const user = userEvent.setup();
    renderModal();

    const videoInput = screen.getByLabelText(/url do vídeo/i);
    await user.type(videoInput, 'https://www.youtube.com/watch?v=abc123XYZ');

    const iframesBefore = Array.from(document.querySelectorAll('iframe'));
    expect(iframesBefore.some((el) => el.src.includes('youtube.com/embed'))).toBe(true);

    await user.clear(videoInput);

    const iframesAfter = Array.from(document.querySelectorAll('iframe'));
    expect(iframesAfter.some((el) => el.src.includes('youtube.com/embed'))).toBe(false);
  });

  it('submits the form with videoUrl when filled', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: {} });
    renderModal();

    await user.type(screen.getByLabelText(/nome/i), 'Supino Reto');
    await user.selectOptions(screen.getByLabelText(/tipo/i), 'strength');
    await user.type(
      screen.getByLabelText(/url do vídeo/i),
      'https://www.youtube.com/watch?v=abc123XYZ'
    );

    await user.click(screen.getByRole('button', { name: /criar modelo de exercício/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/exercise-templates',
        expect.objectContaining({ videoUrl: 'https://www.youtube.com/watch?v=abc123XYZ' })
      );
    });
  });

  it('calls onSuccess with created exercise data on successful create', async () => {
    const user = userEvent.setup();
    const created = { id: 42, name: 'Supino Reto', type: 'strength' };
    api.post.mockResolvedValueOnce({ data: created });
    renderModal();

    await user.type(screen.getByLabelText(/nome/i), 'Supino Reto');
    await user.selectOptions(screen.getByLabelText(/tipo/i), 'strength');
    await user.click(screen.getByRole('button', { name: /criar modelo de exercício/i }));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(created);
    });
  });

  it('calls onClose when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('includes notes in payload when filled', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: {} });
    renderModal();

    await user.type(screen.getByLabelText(/nome/i), 'Supino Reto');
    await user.selectOptions(screen.getByLabelText(/tipo/i), 'strength');
    await user.type(screen.getByLabelText(/observações/i), 'Manter postura correta');
    await user.click(screen.getByRole('button', { name: /criar modelo de exercício/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/exercise-templates',
        expect.objectContaining({ notes: 'Manter postura correta' })
      );
    });
  });

  describe('edit mode', () => {
    const exerciseTemplate = {
      id: 10,
      name: 'Supino Reto',
      type: 'strength',
      videoUrl: '',
      isPublic: false,
      sets: 4,
      repetitions: 10,
      duration: '',
      hasLoad: true,
      suggestedLoad: 60,
      notes: 'Executar com cuidado',
    };

    it('renders edit title when exerciseTemplate is provided', () => {
      renderModal({ exerciseTemplate });
      expect(screen.getByRole('heading', { name: 'Editar Modelo de Exercício' })).toBeInTheDocument();
    });

    it('pre-populates form fields from exerciseTemplate', () => {
      renderModal({ exerciseTemplate });
      expect(screen.getByLabelText(/nome/i)).toHaveValue('Supino Reto');
      expect(screen.getByLabelText(/tipo/i)).toHaveValue('strength');
      expect(screen.getByLabelText(/séries/i)).toHaveValue(4);
      expect(screen.getByLabelText(/repetições/i)).toHaveValue(10);
      expect(screen.getByLabelText(/carga sugerida/i)).toHaveValue(60);
      expect(screen.getByLabelText(/observações/i)).toHaveValue('Executar com cuidado');
    });

    it('shows "Salvar" button instead of "Criar Modelo de Exercício"', () => {
      renderModal({ exerciseTemplate });
      expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /criar modelo de exercício/i })).not.toBeInTheDocument();
    });

    it('calls PATCH when submitting in edit mode', async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValueOnce({ data: { ...exerciseTemplate, name: 'Supino Inclinado' } });
      renderModal({ exerciseTemplate });

      await user.clear(screen.getByLabelText(/nome/i));
      await user.type(screen.getByLabelText(/nome/i), 'Supino Inclinado');
      await user.click(screen.getByRole('button', { name: /salvar/i }));

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          '/trainer/exercise-templates/10',
          expect.objectContaining({ name: 'Supino Inclinado' })
        );
      });
      expect(api.post).not.toHaveBeenCalled();
    });

    it('shows update success toast on edit', async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValueOnce({ data: exerciseTemplate });
      renderModal({ exerciseTemplate });

      await user.click(screen.getByRole('button', { name: /salvar/i }));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Modelo de exercício atualizado com sucesso!', 'success');
      });
    });

    it('calls onSuccess with updated data on successful edit', async () => {
      const user = userEvent.setup();
      const updated = { ...exerciseTemplate, name: 'Supino Inclinado' };
      api.patch.mockResolvedValueOnce({ data: updated });
      renderModal({ exerciseTemplate });

      await user.click(screen.getByRole('button', { name: /salvar/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(updated);
      });
    });
  });
});
