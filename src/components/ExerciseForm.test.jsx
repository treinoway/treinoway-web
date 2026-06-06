import { render, screen, waitFor } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import { selectOption } from '../test-utils/selectOption';
import ExerciseForm from './ExerciseForm';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

vi.mock('../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-uid' }, loading: false }),
}));

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { items: [], total: 0 } }),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../constants/exerciseTypes', () => ({
  EXERCISE_TYPE_OPTIONS: [
    { value: 'strength', label: 'Força' },
    { value: 'cardio', label: 'Cardio' },
    { value: 'mobility', label: 'Mobilidade' },
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

const fillRepsValues = async (user, { sets = '3', min = '8', max = '12' } = {}) => {
  await user.type(screen.getByLabelText(/séries/i), sets);
  await user.type(screen.getByLabelText(/repetições mínimas/i), min);
  await user.type(screen.getByLabelText(/repetições máximas/i), max);
};

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
    expect(screen.getByRole('combobox', { name: /tipo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /escolher da biblioteca/i })).toBeInTheDocument();
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
    await selectOption(user, screen.getByRole('combobox', { name: /tipo/i }), 'strength');
    await fillRepsValues(user);
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
    await selectOption(user, screen.getByRole('combobox', { name: /tipo/i }), 'strength');
    await fillRepsValues(user);
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
    await selectOption(user, screen.getByRole('combobox', { name: /tipo/i }), 'strength');
    await fillRepsValues(user);
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
    await selectOption(user, screen.getByRole('combobox', { name: /tipo/i }), 'strength');
    await fillRepsValues(user);
    await user.click(screen.getByRole('button', { name: /adicionar exercício/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao criar exercício', 'error');
    });
  });

  it('shows YouTube embed preview when a valid YouTube URL is entered via VideoField', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole('button', { name: /cole uma url do youtube/i }));
    await user.type(
      screen.getByRole('textbox', { name: /url do youtube/i }),
      'https://www.youtube.com/watch?v=abc123XYZ'
    );

    expect(await screen.findByTitle('Vídeo de demonstração do exercício')).toBeInTheDocument();
  });

  it('"exercício com carga" is checked by default on a new exercise', () => {
    renderForm();
    expect(screen.getByLabelText(/exercício com carga/i)).toBeChecked();
  });

  it('"carga sugerida" field is visible by default on a new exercise', () => {
    renderForm();
    expect(screen.getByLabelText(/carga sugerida/i)).toBeInTheDocument();
  });

  it('"exercício com carga" can be unchecked and hides the load field', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByLabelText(/exercício com carga/i));

    expect(screen.getByLabelText(/exercício com carga/i)).not.toBeChecked();
    expect(screen.queryByLabelText(/carga sugerida/i)).not.toBeInTheDocument();
  });

  it('includes optional fields in payload when filled (reps mode)', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: {} });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Supino Reto');
    await selectOption(user, screen.getByRole('combobox', { name: /tipo/i }), 'mobility');
    await user.type(screen.getByLabelText(/séries/i), '4');
    await user.type(screen.getByLabelText(/repetições mínimas/i), '8');
    await user.type(screen.getByLabelText(/repetições máximas/i), '10');
    await user.type(screen.getByLabelText(/intervalo de descanso/i), '90');
    // hasLoad is already checked by default — just fill in the load value
    await user.type(screen.getByLabelText(/carga sugerida/i), '80');
    await user.click(screen.getByRole('button', { name: /adicionar exercício/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/trainings/training-1/exercises',
        expect.objectContaining({
          name: 'Supino Reto',
          type: 'mobility',
          sets: 4,
          repetitions: { min: 8, max: 10 },
          restInterval: 90,
          hasLoad: true,
          suggestedLoad: 80,
        })
      );
    });
  });

  describe('prescription mode', () => {
    const switchToDuration = (user) => user.click(screen.getByRole('tab', { name: /tempo/i }));
    const switchToReps = (user) => user.click(screen.getByRole('tab', { name: /repetições/i }));

    it('shows reps fields by default', () => {
      renderForm();
      expect(screen.getByLabelText(/repetições mínimas/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/^duração$/i)).not.toBeInTheDocument();
    });

    it('switches to duration via the segmented toggle and shows duration field', async () => {
      const user = userEvent.setup();
      renderForm();
      await switchToDuration(user);
      expect(screen.getByLabelText(/^duração$/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/repetições mínimas/i)).not.toBeInTheDocument();
    });

    it('clears the previous value when switching modes', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.type(screen.getByLabelText(/repetições mínimas/i), '8');
      await switchToDuration(user);
      await switchToReps(user);
      expect(screen.getByLabelText(/repetições mínimas/i)).toHaveValue(null);
    });

    it('does not open a dialog when switching modes', async () => {
      const user = userEvent.setup();
      renderForm();
      await switchToDuration(user);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows inline error when submitting duration mode with no duration', async () => {
      const user = userEvent.setup();
      renderForm();
      await switchToDuration(user);
      await user.type(screen.getByLabelText(/nome/i), 'Prancha');
      await selectOption(user, screen.getByRole('combobox', { name: /tipo/i }), 'strength');
      await user.click(screen.getByRole('button', { name: /adicionar exercício/i }));
      expect(screen.getByRole('alert')).toHaveTextContent(/defina o valor/i);
      expect(api.post).not.toHaveBeenCalled();
    });

    it('shows inline error when submitting reps mode without repetitions', async () => {
      const user = userEvent.setup();
      renderForm();
      await user.type(screen.getByLabelText(/nome/i), 'Agachamento');
      await selectOption(user, screen.getByRole('combobox', { name: /tipo/i }), 'strength');
      await user.click(screen.getByRole('button', { name: /adicionar exercício/i }));
      expect(screen.getByRole('alert')).toHaveTextContent(/defina o valor/i);
      expect(api.post).not.toHaveBeenCalled();
    });

    it('includes prescriptionMode in payload when submitting in reps mode', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValueOnce({ data: {} });
      renderForm();
      await user.type(screen.getByLabelText(/nome/i), 'Agachamento');
      await selectOption(user, screen.getByRole('combobox', { name: /tipo/i }), 'strength');
      await fillRepsValues(user);
      await user.click(screen.getByRole('button', { name: /adicionar exercício/i }));
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/trainer/trainings/training-1/exercises',
          expect.objectContaining({ prescriptionMode: 'reps' })
        );
      });
    });

    it('renders the intensity ramp only when type is cardio', async () => {
      const user = userEvent.setup();
      renderForm();
      expect(
        screen.queryByRole('radiogroup', { name: 'Intensidade' })
      ).not.toBeInTheDocument();
      await selectOption(user, screen.getByRole('combobox', { name: /tipo/i }), 'cardio');
      expect(
        screen.getByRole('radiogroup', { name: 'Intensidade' })
      ).toBeInTheDocument();
    });

    it('sends the selected intensity key for a cardio exercise', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValueOnce({ data: {} });
      renderForm();
      await switchToDuration(user);
      await user.type(screen.getByLabelText(/nome/i), 'Esteira');
      await selectOption(user, screen.getByRole('combobox', { name: /tipo/i }), 'cardio');
      await user.type(screen.getByLabelText(/^duração$/i), '20');
      await user.click(screen.getByRole('radio', { name: 'Moderada' }));
      await user.click(screen.getByRole('button', { name: /adicionar exercício/i }));
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/trainer/trainings/training-1/exercises',
          expect.objectContaining({ intensity: 'moderate' })
        );
      });
    });

    it('strips intensity from the payload when type is not cardio', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValueOnce({ data: {} });
      renderForm();
      await user.type(screen.getByLabelText(/nome/i), 'Supino');
      await selectOption(user, screen.getByRole('combobox', { name: /tipo/i }), 'strength');
      await fillRepsValues(user);
      await user.click(screen.getByRole('button', { name: /adicionar exercício/i }));
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/trainer/trainings/training-1/exercises',
          expect.objectContaining({ intensity: null })
        );
      });
    });

    it('sends duration and prescriptionMode "duration" in payload when duration mode active', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValueOnce({ data: {} });
      renderForm();
      await switchToDuration(user);
      await user.type(screen.getByLabelText(/nome/i), 'Prancha');
      await selectOption(user, screen.getByRole('combobox', { name: /tipo/i }), 'strength');
      await user.type(screen.getByLabelText(/^duração$/i), '45');
      await user.click(screen.getByRole('button', { name: /adicionar exercício/i }));
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/trainer/trainings/training-1/exercises',
          expect.objectContaining({ prescriptionMode: 'duration', duration: 45 })
        );
      });
    });

    it('clicking a duration chip fills the duration input', async () => {
      const user = userEvent.setup();
      renderForm();
      await switchToDuration(user);
      await user.click(screen.getByRole('button', { name: '45s' }));
      expect(screen.getByLabelText(/^duração$/i)).toHaveValue(45);
    });

    it('shows the long duration hint when value is 600 or more', async () => {
      const user = userEvent.setup();
      renderForm();
      await switchToDuration(user);
      await user.type(screen.getByLabelText(/^duração$/i), '600');
      expect(screen.getByText(/mais de 10 minutos/i)).toBeInTheDocument();
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
      await selectOption(user, screen.getByRole('combobox', { name: /tipo/i }), 'strength');
      await fillRepsValues(user);
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
      await selectOption(user, screen.getByRole('combobox', { name: /tipo/i }), 'strength');
      await fillRepsValues(user, { sets: '3', min: '8', max: '12' });
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
      await selectOption(user, screen.getByRole('combobox', { name: /tipo/i }), 'strength');
      await fillRepsValues(user);
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
      prescriptionMode: 'reps',
      sets: 4,
      repetitions: { min: 8, max: 10 },
      duration: null,
      restInterval: 90,
      hasLoad: true,
      suggestedLoad: 60,
      notes: 'Executar devagar',
    };

    it('pre-populates form fields from exercise', () => {
      renderForm({ exercise, trainingId: undefined });
      expect(screen.getByLabelText(/nome/i)).toHaveValue('Supino Reto');
      expect(screen.getByRole('combobox', { name: /tipo/i })).toHaveValue('strength');
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

    it('reads stored prescriptionMode and renders duration field for duration-mode exercise', () => {
      const durationExercise = {
        ...exercise,
        prescriptionMode: 'duration',
        repetitions: null,
        duration: 45,
      };
      renderForm({ exercise: durationExercise, trainingId: undefined });
      expect(screen.getByLabelText(/^duração$/i)).toHaveValue(45);
      expect(screen.queryByLabelText(/repetições mínimas/i)).not.toBeInTheDocument();
    });
  });
});
