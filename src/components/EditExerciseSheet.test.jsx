import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../test/test-utils';
import EditExerciseSheet from './EditExerciseSheet';

const baseSnapshot = {
  id: 'junction-1',
  type: 'strength',
  sets: 4,
  repetitions: { min: 10, max: 10 },
  duration: null,
  restInterval: 60,
  hasLoad: true,
  suggestedLoad: 20,
  notes: '',
};

const cardioSnapshot = {
  id: 'junction-cardio',
  type: 'cardio',
  sets: 1,
  repetitions: null,
  duration: 600,
  restInterval: 60,
  hasLoad: false,
  suggestedLoad: null,
  notes: '',
  intensity: 'moderate',
};

describe('EditExerciseSheet', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the exercise name and pre-filled fields', () => {
    render(
      <EditExerciseSheet
        snapshot={baseSnapshot}
        exerciseName="Supino reto"
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toHaveAccessibleName(/editar supino reto/i);
    expect(screen.getByRole('heading', { name: /supino reto/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Séries')).toHaveValue(4);
    expect(screen.getByLabelText('Rep. mínimas')).toHaveValue(10);
    expect(screen.getByLabelText('Rep. máximas')).toHaveValue(10);
    expect(screen.getByLabelText('Descanso')).toHaveValue(60);
    expect(screen.getByLabelText('Carga')).toHaveValue(20);
  });

  it('displays the educational banner until dismissed', async () => {
    const user = userEvent.setup();
    render(
      <EditExerciseSheet
        snapshot={baseSnapshot}
        exerciseName="Supino reto"
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Mudanças aqui só valem para este template.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /fechar aviso/i }));

    expect(screen.queryByText('Mudanças aqui só valem para este template.')).not.toBeInTheDocument();
  });

  it('closes immediately when clean and close is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <EditExerciseSheet
        snapshot={baseSnapshot}
        exerciseName="Supino reto"
        onSubmit={vi.fn()}
        onClose={onClose}
      />
    );

    await user.click(screen.getByRole('button', { name: /fechar$/i }));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('fires onLightDiscard and closes when a single field is dirty', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onLightDiscard = vi.fn();
    render(
      <EditExerciseSheet
        snapshot={baseSnapshot}
        exerciseName="Supino reto"
        onSubmit={vi.fn()}
        onClose={onClose}
        onLightDiscard={onLightDiscard}
      />
    );

    await user.click(screen.getByRole('button', { name: /aumentar séries/i }));
    await user.click(screen.getByRole('button', { name: /fechar$/i }));

    expect(onLightDiscard).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows discard confirm dialog when 3+ fields are dirty', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onLightDiscard = vi.fn();
    render(
      <EditExerciseSheet
        snapshot={baseSnapshot}
        exerciseName="Supino reto"
        onSubmit={vi.fn()}
        onClose={onClose}
        onLightDiscard={onLightDiscard}
      />
    );

    await user.click(screen.getByRole('button', { name: /aumentar séries/i }));
    await user.click(screen.getByRole('button', { name: /aumentar descanso/i }));
    await user.click(screen.getByRole('button', { name: /aumentar carga/i }));

    await user.click(screen.getByRole('button', { name: /fechar$/i }));

    expect(screen.getByText(/descartar alterações\?/i)).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /descartar/i }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onLightDiscard).not.toHaveBeenCalled();
  });

  it('submits the payload with updated values', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue();
    const onClose = vi.fn();
    render(
      <EditExerciseSheet
        snapshot={baseSnapshot}
        exerciseName="Supino reto"
        onSubmit={onSubmit}
        onClose={onClose}
      />
    );

    await user.click(screen.getByRole('button', { name: /aumentar séries/i }));
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        sets: 5,
        repetitions: { min: 10, max: 10 },
        duration: null,
        restInterval: 60,
        hasLoad: true,
        suggestedLoad: 20,
        prescriptionMode: 'reps',
      }));
    });
  });

  it('switches to duration mode and sends duration payload', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue();
    render(
      <EditExerciseSheet
        snapshot={{ ...baseSnapshot, repetitions: null, duration: 45 }}
        exerciseName="Prancha"
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('tab', { name: /tempo/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Duração')).toHaveValue(45);

    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        duration: 45,
        repetitions: null,
        prescriptionMode: 'duration',
      }));
    });
  });

  it('does not change min when max is lowered below it', async () => {
    const user = userEvent.setup();
    render(
      <EditExerciseSheet
        snapshot={{ ...baseSnapshot, repetitions: { min: 8, max: 12 } }}
        exerciseName="Supino reto"
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const decreaseMax = screen.getByRole('button', { name: /diminuir rep\. máximas/i });
    // Lower max from 12 to 7 (below min of 8).
    for (let i = 0; i < 5; i += 1) {
      await user.click(decreaseMax);
    }

    expect(screen.getByLabelText('Rep. máximas')).toHaveValue(7);
    expect(screen.getByLabelText('Rep. mínimas')).toHaveValue(8);
  });

  it('does not change max when min is raised above it', async () => {
    const user = userEvent.setup();
    render(
      <EditExerciseSheet
        snapshot={{ ...baseSnapshot, repetitions: { min: 8, max: 12 } }}
        exerciseName="Supino reto"
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const increaseMin = screen.getByRole('button', { name: /aumentar rep\. mínimas/i });
    // Raise min from 8 to 13 (above max of 12).
    for (let i = 0; i < 5; i += 1) {
      await user.click(increaseMin);
    }

    expect(screen.getByLabelText('Rep. mínimas')).toHaveValue(13);
    expect(screen.getByLabelText('Rep. máximas')).toHaveValue(12);
  });

  it('blocks save and shows a validation error when min is greater than max', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue();
    render(
      <EditExerciseSheet
        snapshot={{ ...baseSnapshot, repetitions: { min: 8, max: 12 } }}
        exerciseName="Supino reto"
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    );

    const decreaseMax = screen.getByRole('button', { name: /diminuir rep\. máximas/i });
    // Lower max from 12 to 7, below the min of 8.
    for (let i = 0; i < 5; i += 1) {
      await user.click(decreaseMax);
    }

    await user.click(screen.getByRole('button', { name: /salvar/i }));

    expect(await screen.findByText('Rep. mínima não pode ser maior que a máxima.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('emits prescriptionMode duration after switching from reps to time', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue();
    render(
      <EditExerciseSheet
        snapshot={baseSnapshot}
        exerciseName="Supino reto"
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    );

    await user.click(screen.getByRole('tab', { name: /tempo/i }));
    await user.click(screen.getByRole('button', { name: /aumentar duração/i }));
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        prescriptionMode: 'duration',
        repetitions: null,
      }));
    });
    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.duration).not.toBeNull();
  });

  it('updates rest interval when a chip is clicked', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue();
    render(
      <EditExerciseSheet
        snapshot={baseSnapshot}
        exerciseName="Supino reto"
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /^2min$/i }));

    expect(screen.getByLabelText('Descanso')).toHaveValue(120);
  });

  it('hides the Carga stepper when hasLoad is toggled off', async () => {
    const user = userEvent.setup();
    render(
      <EditExerciseSheet
        snapshot={baseSnapshot}
        exerciseName="Supino reto"
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Carga')).toBeInTheDocument();

    await user.click(screen.getByLabelText(/exercício com carga/i));

    expect(screen.queryByLabelText('Carga')).not.toBeInTheDocument();
  });

  it('shows the warning when source exercise has been deleted', () => {
    render(
      <EditExerciseSheet
        snapshot={baseSnapshot}
        exerciseName="Supino reto"
        sourceDeleted
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(
      screen.getByText(/exercício original removido — as alterações ficam salvas/i)
    ).toBeInTheDocument();
  });

  it('renders summary tokens with number and unit parts', () => {
    render(
      <EditExerciseSheet
        snapshot={baseSnapshot}
        exerciseName="Supino reto"
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    // 4 sets, 10 reps (min===max), 60s rest, 20kg load
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('séries')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('reps')).toBeInTheDocument();
  });

  it('renders the intensity ramp for a cardio snapshot with the current value selected', () => {
    render(
      <EditExerciseSheet
        snapshot={cardioSnapshot}
        exerciseName="Corrida"
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('radiogroup', { name: /intensidade/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /moderada/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('does not render the intensity ramp for a non-cardio snapshot and sends intensity null', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue();
    render(
      <EditExerciseSheet
        snapshot={baseSnapshot}
        exerciseName="Supino reto"
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    );

    expect(screen.queryByRole('radiogroup', { name: /intensidade/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /aumentar séries/i }));
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ intensity: null }));
    });
  });

  it('emits the selected intensity in the payload for a cardio snapshot', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue();
    render(
      <EditExerciseSheet
        snapshot={cardioSnapshot}
        exerciseName="Corrida"
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    );

    await user.click(screen.getByRole('radio', { name: /vigorosa/i }));
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ intensity: 'vigorous' }));
    });
  });

  it('counts an intensity edit toward the dirty/discard guard', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onLightDiscard = vi.fn();
    render(
      <EditExerciseSheet
        snapshot={cardioSnapshot}
        exerciseName="Corrida"
        onSubmit={vi.fn()}
        onClose={onClose}
        onLightDiscard={onLightDiscard}
      />
    );

    await user.click(screen.getByRole('radio', { name: /vigorosa/i }));
    await user.click(screen.getByRole('button', { name: /fechar$/i }));

    expect(onLightDiscard).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps the sheet open and shows the saving state during submit', async () => {
    const user = userEvent.setup();
    let resolveSubmit;
    const onSubmit = vi.fn(() => new Promise((resolve) => { resolveSubmit = resolve; }));
    render(
      <EditExerciseSheet
        snapshot={baseSnapshot}
        exerciseName="Supino reto"
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /aumentar séries/i }));
    await user.click(screen.getByRole('button', { name: /salvar/i }));

    expect(screen.getByRole('button', { name: /salvando/i })).toBeDisabled();

    resolveSubmit();
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });
});
