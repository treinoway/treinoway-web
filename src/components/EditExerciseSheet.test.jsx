import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../test/test-utils';
import EditExerciseSheet from './EditExerciseSheet';

const baseSnapshot = {
  id: 'junction-1',
  sets: 4,
  repetitions: { min: 10, max: 10 },
  duration: null,
  restInterval: 60,
  hasLoad: true,
  suggestedLoad: 20,
  notes: '',
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
      }));
    });
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
