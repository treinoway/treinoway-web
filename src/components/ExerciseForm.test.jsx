import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ExerciseForm from './ExerciseForm';
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
    <ExerciseForm
      onCancel={mockOnCancel}
      onSuccess={mockOnSuccess}
      trainingId="training-1"
      {...props}
    />
  );

describe('ExerciseForm', () => {
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
    expect(screen.getByLabelText(/url do vídeo/i)).toBeInTheDocument();
  });

  it('renders headerContent above the form when provided', () => {
    renderForm({ headerContent: <div>Toggle Header</div> });
    expect(screen.getByText('Toggle Header')).toBeInTheDocument();
  });

  it('calls onCancel when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('submits to the correct endpoint for creation', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: {} });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Agachamento');
    await user.selectOptions(screen.getByLabelText(/tipo/i), 'strength');
    await user.click(screen.getByRole('button', { name: /adicionar exercício/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/trainings/training-1/exercises',
        expect.objectContaining({ name: 'Agachamento', type: 'strength' })
      );
    });
  });

  it('shows success toast on creation', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: {} });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Agachamento');
    await user.selectOptions(screen.getByLabelText(/tipo/i), 'strength');
    await user.click(screen.getByRole('button', { name: /adicionar exercício/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Exercício adicionado com sucesso!', 'success');
    });
  });

  it('calls onSuccess after successful creation', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: {} });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Agachamento');
    await user.selectOptions(screen.getByLabelText(/tipo/i), 'strength');
    await user.click(screen.getByRole('button', { name: /adicionar exercício/i }));

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('shows error toast on API failure', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValueOnce({ userMessage: 'Erro ao criar exercício' });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Agachamento');
    await user.selectOptions(screen.getByLabelText(/tipo/i), 'strength');
    await user.click(screen.getByRole('button', { name: /adicionar exercício/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao criar exercício', 'error');
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

  it('includes optional fields in payload when filled', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: {} });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Supino Reto');
    await user.selectOptions(screen.getByLabelText(/tipo/i), 'strength');
    await user.type(screen.getByLabelText(/séries/i), '4');
    await user.type(screen.getByLabelText(/repetições mínimas/i), '8');
    await user.type(screen.getByLabelText(/repetições máximas/i), '10');
    await user.type(screen.getByLabelText(/duração/i), '60');
    await user.type(screen.getByLabelText(/intervalo de descanso/i), '90');
    await user.click(screen.getByLabelText(/exercício com carga/i));
    await user.type(screen.getByLabelText(/carga sugerida/i), '80');
    await user.click(screen.getByRole('button', { name: /adicionar exercício/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/trainings/training-1/exercises',
        expect.objectContaining({
          name: 'Supino Reto',
          type: 'strength',
          sets: 4,
          repetitions: { min: 8, max: 10 },
          duration: 60,
          restInterval: 90,
          hasLoad: true,
          suggestedLoad: 80,
        })
      );
    });
  });

  describe('draft mode (no trainingId)', () => {
    const renderDraftForm = (props = {}) =>
      render(
        <ExerciseForm
          onCancel={mockOnCancel}
          onSuccess={mockOnSuccess}
          {...props}
        />
      );

    it('does not call api.post in draft mode', async () => {
      const user = userEvent.setup();
      renderDraftForm();

      await user.type(screen.getByLabelText(/nome/i), 'Remada Curvada');
      await user.selectOptions(screen.getByLabelText(/tipo/i), 'strength');
      await user.click(screen.getByRole('button', { name: /adicionar exercício/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
      expect(api.post).not.toHaveBeenCalled();
    });

    it('calls onSuccess with the built payload in draft mode', async () => {
      const user = userEvent.setup();
      renderDraftForm();

      await user.type(screen.getByLabelText(/nome/i), 'Remada Curvada');
      await user.selectOptions(screen.getByLabelText(/tipo/i), 'strength');
      await user.type(screen.getByLabelText(/séries/i), '3');
      await user.click(screen.getByRole('button', { name: /adicionar exercício/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Remada Curvada',
            type: 'strength',
            sets: 3,
          })
        );
      });
    });

    it('does not show toast in draft mode', async () => {
      const user = userEvent.setup();
      renderDraftForm();

      await user.type(screen.getByLabelText(/nome/i), 'Remada Curvada');
      await user.selectOptions(screen.getByLabelText(/tipo/i), 'strength');
      await user.click(screen.getByRole('button', { name: /adicionar exercício/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
      expect(mockShowToast).not.toHaveBeenCalled();
    });
  });

  describe('edit mode', () => {
    const exercise = {
      id: 'ex-1',
      name: 'Supino Reto',
      type: 'strength',
      videoUrl: '',
      sets: 4,
      repetitions: { min: 8, max: 10 },
      duration: '',
      restInterval: 90,
      hasLoad: true,
      suggestedLoad: 60,
      notes: 'Executar devagar',
    };

    it('pre-populates form fields from exercise', () => {
      renderForm({ exercise, trainingId: undefined });
      expect(screen.getByLabelText(/nome/i)).toHaveValue('Supino Reto');
      expect(screen.getByLabelText(/tipo/i)).toHaveValue('strength');
      expect(screen.getByLabelText(/séries/i)).toHaveValue(4);
      expect(screen.getByLabelText(/repetições mínimas/i)).toHaveValue(8);
      expect(screen.getByLabelText(/repetições máximas/i)).toHaveValue(10);
      expect(screen.getByLabelText(/intervalo de descanso/i)).toHaveValue(90);
      expect(screen.getByLabelText(/carga sugerida/i)).toHaveValue(60);
      expect(screen.getByLabelText(/observações/i)).toHaveValue('Executar devagar');
    });

    it('shows "Salvar" button instead of "Adicionar Exercício"', () => {
      renderForm({ exercise, trainingId: undefined });
      expect(screen.getByRole('button', { name: /salvar/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /adicionar exercício/i })).not.toBeInTheDocument();
    });

    it('calls PATCH when submitting in edit mode', async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValueOnce({ data: { ...exercise, name: 'Supino Inclinado' } });
      renderForm({ exercise, trainingId: undefined });

      await user.clear(screen.getByLabelText(/nome/i));
      await user.type(screen.getByLabelText(/nome/i), 'Supino Inclinado');
      await user.click(screen.getByRole('button', { name: /salvar/i }));

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          '/trainer/exercises/ex-1',
          expect.objectContaining({ name: 'Supino Inclinado' })
        );
      });
      expect(api.post).not.toHaveBeenCalled();
    });

    it('shows update success toast on edit', async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValueOnce({ data: exercise });
      renderForm({ exercise, trainingId: undefined });

      await user.click(screen.getByRole('button', { name: /salvar/i }));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Exercício atualizado com sucesso!', 'success');
      });
    });
  });
});
