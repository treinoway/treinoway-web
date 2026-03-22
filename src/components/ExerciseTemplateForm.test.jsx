import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExerciseTemplateForm from './ExerciseTemplateForm';
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
const mockOnCancel = vi.fn();
const mockOnSuccess = vi.fn();

const renderForm = (props = {}) =>
  render(
    <ExerciseTemplateForm
      onCancel={mockOnCancel}
      onSuccess={mockOnSuccess}
      {...props}
    />
  );

describe('ExerciseTemplateForm', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    mockOnCancel.mockReset();
    mockOnSuccess.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.post.mockReset();
    api.patch.mockReset();
  });

  it('renders the form fields', () => {
    renderForm();
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tipo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tornar este modelo público/i)).toBeInTheDocument();
  });

  it('calls onCancel when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('submits to the correct endpoint for creation', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: { id: 1, name: 'Supino Reto' } });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Supino Reto');
    await user.selectOptions(screen.getByLabelText(/tipo/i), 'strength');
    await user.click(screen.getByRole('button', { name: /criar exercício/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/exercise-templates',
        expect.objectContaining({ name: 'Supino Reto', type: 'strength' })
      );
    });
  });

  it('shows success toast on creation', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: { id: 1, name: 'Supino Reto' } });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Supino Reto');
    await user.selectOptions(screen.getByLabelText(/tipo/i), 'strength');
    await user.click(screen.getByRole('button', { name: /criar exercício/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Exercício criado com sucesso!', 'success');
    });
  });

  it('calls onSuccess with created data on successful creation', async () => {
    const user = userEvent.setup();
    const created = { id: 42, name: 'Supino Reto', type: 'strength' };
    api.post.mockResolvedValueOnce({ data: created });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Supino Reto');
    await user.selectOptions(screen.getByLabelText(/tipo/i), 'strength');
    await user.click(screen.getByRole('button', { name: /criar exercício/i }));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(created);
    });
  });

  it('shows error toast on API failure', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValueOnce({ userMessage: 'Erro ao criar' });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Supino Reto');
    await user.selectOptions(screen.getByLabelText(/tipo/i), 'strength');
    await user.click(screen.getByRole('button', { name: /criar exercício/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao criar', 'error');
    });
  });

  it('includes isPublic in payload', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: {} });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Supino Reto');
    await user.selectOptions(screen.getByLabelText(/tipo/i), 'strength');
    await user.click(screen.getByLabelText(/tornar este modelo público/i));
    await user.click(screen.getByRole('button', { name: /criar exercício/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/exercise-templates',
        expect.objectContaining({ isPublic: true })
      );
    });
  });

  it('shows YouTube embed preview when a valid YouTube URL is entered', async () => {
    const user = userEvent.setup();
    renderForm();

    const videoInput = screen.getByLabelText(/url do vídeo/i);
    await user.type(videoInput, 'https://www.youtube.com/watch?v=abc123XYZ');

    const iframes = document.querySelectorAll('iframe');
    const youtubeIframe = Array.from(iframes).find((el) =>
      el.src.includes('youtube.com/embed/abc123XYZ')
    );
    expect(youtubeIframe).toBeTruthy();
  });

  describe('edit mode', () => {
    const exerciseTemplate = {
      id: 10,
      name: 'Supino Reto',
      type: 'strength',
      videoUrl: '',
      isPublic: false,
      sets: 4,
      repetitions: { min: 8, max: 10 },
      duration: '',
      restInterval: 60,
      hasLoad: true,
      suggestedLoad: 60,
      notes: 'Executar com cuidado',
    };

    it('pre-populates form fields from exerciseTemplate', () => {
      renderForm({ exerciseTemplate });
      expect(screen.getByLabelText(/nome/i)).toHaveValue('Supino Reto');
      expect(screen.getByLabelText(/tipo/i)).toHaveValue('strength');
      expect(screen.getByLabelText(/séries/i)).toHaveValue(4);
      expect(screen.getByLabelText(/repetições mínimas/i)).toHaveValue(8);
      expect(screen.getByLabelText(/repetições máximas/i)).toHaveValue(10);
      expect(screen.getByLabelText(/intervalo de descanso/i)).toHaveValue(60);
      expect(screen.getByLabelText(/carga sugerida/i)).toHaveValue(60);
      expect(screen.getByLabelText(/observações/i)).toHaveValue('Executar com cuidado');
    });

    it('shows "Salvar" button instead of "Criar exercício"', () => {
      renderForm({ exerciseTemplate });
      expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /criar exercício/i })).not.toBeInTheDocument();
    });

    it('calls PATCH when submitting in edit mode', async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValueOnce({ data: { ...exerciseTemplate, name: 'Supino Inclinado' } });
      renderForm({ exerciseTemplate });

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
      renderForm({ exerciseTemplate });

      await user.click(screen.getByRole('button', { name: /salvar/i }));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Exercício atualizado com sucesso!', 'success');
      });
    });

    it('calls onSuccess with updated data on successful edit', async () => {
      const user = userEvent.setup();
      const updated = { ...exerciseTemplate, name: 'Supino Inclinado' };
      api.patch.mockResolvedValueOnce({ data: updated });
      renderForm({ exerciseTemplate });

      await user.click(screen.getByRole('button', { name: /salvar/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(updated);
      });
    });
  });
});
