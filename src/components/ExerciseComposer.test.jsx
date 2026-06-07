import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import ExerciseComposer from './ExerciseComposer';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-uid' }, loading: false }),
}));

// VideoLibraryPicker makes real API calls — stub it out entirely.
vi.mock('./VideoLibraryPicker', () => ({
  default: ({ isOpen, onClose, onSelect }) => {
    if (!isOpen) return null;
    return (
      <div role="dialog" aria-label="Selecionar vídeo da biblioteca">
        <button type="button" onClick={() => onSelect({ url: 'https://www.youtube.com/watch?v=stub123' })}>
          Selecionar vídeo stub
        </button>
        <button type="button" onClick={onClose}>Fechar</button>
      </div>
    );
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const EXERCISE_TEMPLATES = [
  {
    id: 'tmpl-1',
    name: 'Agachamento',
    type: 'strength',
    sets: 4,
    repetitions: { min: 8, max: 12 },
    restInterval: 90,
    hasLoad: true,
  },
  {
    id: 'tmpl-2',
    name: 'Corrida',
    type: 'cardio',
    duration: 1800,
    hasLoad: false,
  },
];

const EXERCISE_SNAPSHOT = {
  id: 'junc-1',
  name: 'Supino reto',
  type: 'strength',
  prescriptionMode: 'reps',
  sets: 3,
  repetitions: { min: 10, max: 12 },
  restInterval: 60,
  hasLoad: true,
  suggestedLoad: 80,
};

const EXERCISE_SNAPSHOT_DURATION = {
  id: 'junc-2',
  name: 'Corrida leve',
  type: 'cardio',
  prescriptionMode: 'duration',
  sets: 1,
  duration: 600,
  restInterval: 0,
  hasLoad: false,
};

const defaultProps = {
  snapshot: null,
  exerciseTemplates: EXERCISE_TEMPLATES,
  saving: false,
  onSubmitCreate: vi.fn(),
  onSubmitEdit: vi.fn(),
  onSubmitFromLibrary: vi.fn(),
  onCancel: vi.fn(),
};

const renderComposer = (props = {}) =>
  render(<ExerciseComposer {...defaultProps} {...props} />);

// ─── Tests — create mode ──────────────────────────────────────────────────────

describe('ExerciseComposer — create mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty form in create mode', () => {
    renderComposer();
    expect(screen.getByLabelText(/Nome/i)).toHaveValue('');
    expect(screen.getByRole('combobox', { name: /Tipo/i })).toBeInTheDocument();
  });

  it('shows the segmented toggle with "Criar novo" and "Da biblioteca"', () => {
    renderComposer();
    expect(screen.getByRole('tab', { name: /Criar novo/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Da biblioteca/i })).toBeInTheDocument();
  });

  it('carga switch, vídeo library CTA and observações are visible immediately without any toggle', () => {
    renderComposer();
    expect(screen.getByRole('switch', { name: /Exercício com carga/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Escolher da biblioteca/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Observações/i)).toBeInTheDocument();
  });

  it('does NOT have a "Mostrar mais campos" toggle', () => {
    renderComposer();
    expect(
      screen.queryByRole('button', { name: /Mostrar mais campos/i })
    ).not.toBeInTheDocument();
  });

  it('submit without name shows validation error', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Nome obrigatório/i);
    expect(defaultProps.onSubmitCreate).not.toHaveBeenCalled();
  });

  it('renders prescription mode picker (Repetições / Tempo tabs)', () => {
    renderComposer();
    expect(screen.getByRole('tab', { name: /Repetições/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Tempo/i })).toBeInTheDocument();
  });

  it('defaults to "reps" mode — reps inputs visible, duration input absent', () => {
    renderComposer();
    expect(screen.getByRole('tab', { name: /Repetições/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/Repetições mínimas/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Duração/i)).not.toBeInTheDocument();
  });

  it('switching to "Tempo" mode shows duration input and hides reps', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole('tab', { name: /Tempo/i }));

    expect(screen.getByRole('tab', { name: /Tempo/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('spinbutton', { name: /Duração/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Repetições mínimas/i)).not.toBeInTheDocument();
  });

  it('rest chips (60s, 90s, 120s, 180s) are visible immediately', () => {
    renderComposer();
    expect(screen.getByRole('button', { name: /60s/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /90s/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /120s/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /180s/i })).toBeInTheDocument();
  });

  it('clicking a rest chip sets the rest interval input value', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole('button', { name: /90s/i }));

    const restInput = screen.getByLabelText(/Intervalo de descanso em segundos/i);
    expect(restInput).toHaveValue(90);
  });

  it('submit with name calls onSubmitCreate with payload including prescriptionMode', async () => {
    const onSubmitCreate = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onSubmitCreate });

    await user.type(screen.getByLabelText(/Nome/i), 'Rosca direta');
    await user.type(screen.getByLabelText(/Repetições mínimas/i), '8');
    await user.type(screen.getByLabelText(/Repetições máximas/i), '12');
    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => {
      expect(onSubmitCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Rosca direta', type: 'strength', prescriptionMode: 'reps' })
      );
    });
  });

  it('buildPayload uses "duration" prescriptionMode when switched to Tempo', async () => {
    const onSubmitCreate = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onSubmitCreate });

    await user.type(screen.getByLabelText(/Nome/i), 'Prancha');
    await user.click(screen.getByRole('tab', { name: /Tempo/i }));
    await user.type(screen.getByRole('spinbutton', { name: /Duração/i }), '60');
    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => {
      expect(onSubmitCreate).toHaveBeenCalledWith(
        expect.objectContaining({ prescriptionMode: 'duration', duration: 60 })
      );
    });
  });

  it('cancel calls onCancel', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onCancel });

    await user.click(screen.getByRole('button', { name: /Cancelar/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables submit button and shows "Salvando…" when saving=true', () => {
    renderComposer({ saving: true });
    const submitBtn = screen.getByRole('button', { name: /Salvando/i });
    expect(submitBtn).toBeDisabled();
  });
});

// ─── Tests — carga default by type ───────────────────────────────────────────

describe('ExerciseComposer — carga default by type', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('strength type → carga switch ON by default', () => {
    renderComposer();
    // default type is strength
    expect(screen.getByRole('switch', { name: /Exercício com carga/i })).toBeChecked();
  });

  it('switching type to cardio → carga switch turns OFF', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.selectOptions(screen.getByRole('combobox', { name: /Tipo/i }), 'cardio');

    expect(screen.getByRole('switch', { name: /Exercício com carga/i })).not.toBeChecked();
  });

  it('switching type to mobility → carga switch turns OFF', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.selectOptions(screen.getByRole('combobox', { name: /Tipo/i }), 'mobility');

    expect(screen.getByRole('switch', { name: /Exercício com carga/i })).not.toBeChecked();
  });

  it('switching type to stretching → carga switch turns OFF', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.selectOptions(screen.getByRole('combobox', { name: /Tipo/i }), 'stretching');

    expect(screen.getByRole('switch', { name: /Exercício com carga/i })).not.toBeChecked();
  });

  it('after manual toggle, changing type no longer overrides the user choice', async () => {
    const user = userEvent.setup();
    renderComposer();

    // Start: strength → carga ON
    const loadSwitch = screen.getByRole('switch', { name: /Exercício com carga/i });
    expect(loadSwitch).toBeChecked();

    // User manually turns OFF carga
    await user.click(loadSwitch);
    expect(loadSwitch).not.toBeChecked();

    // Change type to strength again (would normally set ON) — must stay OFF
    await user.selectOptions(screen.getByRole('combobox', { name: /Tipo/i }), 'cardio');
    await user.selectOptions(screen.getByRole('combobox', { name: /Tipo/i }), 'strength');

    expect(loadSwitch).not.toBeChecked();
  });

  it('carga kg input is shown when switch is ON', () => {
    renderComposer();
    // strength defaults to ON
    expect(screen.getByLabelText(/Carga sugerida/i)).toBeInTheDocument();
  });

  it('carga kg input is hidden when switch is OFF', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.selectOptions(screen.getByRole('combobox', { name: /Tipo/i }), 'cardio');

    expect(screen.queryByLabelText(/Carga sugerida/i)).not.toBeInTheDocument();
  });
});

// ─── Tests — VideoField integration ──────────────────────────────────────────

describe('ExerciseComposer — VideoField integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Escolher da biblioteca" CTA and URL toggle when no video is set', () => {
    renderComposer();
    expect(screen.getByRole('button', { name: /Escolher da biblioteca/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ou cole uma URL do YouTube/i })).toBeInTheDocument();
  });

  it('URL input is hidden until the "ou cole uma URL" toggle is clicked', async () => {
    const user = userEvent.setup();
    renderComposer();

    expect(screen.queryByLabelText(/URL do YouTube/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ou cole uma URL do YouTube/i }));

    expect(screen.getByLabelText(/URL do YouTube/i)).toBeInTheDocument();
  });

  it('typing a valid YouTube URL into the revealed input is accepted without error', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole('button', { name: /ou cole uma URL do YouTube/i }));
    await user.type(
      screen.getByLabelText(/URL do YouTube/i),
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    );

    expect(screen.queryByText(/Use um link do YouTube/i)).not.toBeInTheDocument();
  });

  it('shows hint for a non-YouTube URL typed into the URL input', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole('button', { name: /ou cole uma URL do YouTube/i }));
    await user.type(screen.getByLabelText(/URL do YouTube/i), 'https://vimeo.com/123456');

    expect(await screen.findByText(/Use um link do YouTube/i)).toBeInTheDocument();
  });

  it('opening the library picker renders the stub dialog', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole('button', { name: /Escolher da biblioteca/i }));

    expect(
      screen.getByRole('dialog', { name: /Selecionar vídeo da biblioteca/i }),
    ).toBeInTheDocument();
  });

  it('selecting a video from the picker closes the dialog and wires videoUrl into the payload', async () => {
    const onSubmitCreate = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onSubmitCreate });

    // Fill in the required name + reps so submit passes validation
    await user.type(screen.getByLabelText(/Nome/i), 'Supino reto');
    await user.type(screen.getByLabelText(/Repetições mínimas/i), '8');
    await user.type(screen.getByLabelText(/Repetições máximas/i), '12');

    // Open picker and select the stub video
    await user.click(screen.getByRole('button', { name: /Escolher da biblioteca/i }));
    await user.click(screen.getByRole('button', { name: /Selecionar vídeo stub/i }));

    // Dialog closed
    expect(
      screen.queryByRole('dialog', { name: /Selecionar vídeo da biblioteca/i }),
    ).not.toBeInTheDocument();

    // Submit and verify videoUrl in payload
    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => {
      expect(onSubmitCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          videoUrl: 'https://www.youtube.com/watch?v=stub123',
        }),
      );
    });
  });
});

// ─── Tests — edit mode (snapshot) ────────────────────────────────────────────

describe('ExerciseComposer — edit mode (snapshot)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pre-populates fields from snapshot', () => {
    renderComposer({ snapshot: EXERCISE_SNAPSHOT });
    expect(screen.getByLabelText(/Nome/i)).toHaveValue('Supino reto');
  });

  it('hides the segmented toggle in edit mode', () => {
    renderComposer({ snapshot: EXERCISE_SNAPSHOT });
    expect(screen.queryByRole('tab', { name: /Criar novo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Da biblioteca/i })).not.toBeInTheDocument();
  });

  it('shows "Salvar alterações" submit label in edit mode', () => {
    renderComposer({ snapshot: EXERCISE_SNAPSHOT });
    expect(screen.getByRole('button', { name: /Salvar alterações/i })).toBeInTheDocument();
  });

  it('carga, vídeo library CTA and observações are visible immediately in edit mode', () => {
    renderComposer({ snapshot: EXERCISE_SNAPSHOT });
    expect(screen.getByRole('switch', { name: /Exercício com carga/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Escolher da biblioteca/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Observações/i)).toBeInTheDocument();
  });

  it('submit calls onSubmitEdit with snapshot id and payload', async () => {
    const onSubmitEdit = vi.fn();
    const user = userEvent.setup();
    renderComposer({ snapshot: EXERCISE_SNAPSHOT, onSubmitEdit });

    const nameInput = screen.getByLabelText(/Nome/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Supino inclinado');

    await user.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => {
      expect(onSubmitEdit).toHaveBeenCalledWith(
        'junc-1',
        expect.objectContaining({ name: 'Supino inclinado' })
      );
    });
  });

  it('submit without name shows error in edit mode too', async () => {
    const user = userEvent.setup();
    renderComposer({ snapshot: EXERCISE_SNAPSHOT });

    const nameInput = screen.getByLabelText(/Nome/i);
    await user.clear(nameInput);
    await user.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Nome obrigatório/i);
  });

  it('snapshotToForm restores prescriptionMode=reps from snapshot', () => {
    renderComposer({ snapshot: EXERCISE_SNAPSHOT });
    expect(screen.getByRole('tab', { name: /Repetições/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/Repetições mínimas/i)).toBeInTheDocument();
  });

  it('snapshotToForm restores prescriptionMode=duration from snapshot', () => {
    renderComposer({ snapshot: EXERCISE_SNAPSHOT_DURATION });
    expect(screen.getByRole('tab', { name: /Tempo/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('spinbutton', { name: /Duração/i })).toBeInTheDocument();
  });

  it('submit in edit mode includes prescriptionMode in payload', async () => {
    const onSubmitEdit = vi.fn();
    const user = userEvent.setup();
    renderComposer({ snapshot: EXERCISE_SNAPSHOT, onSubmitEdit });

    await user.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => {
      expect(onSubmitEdit).toHaveBeenCalledWith(
        'junc-1',
        expect.objectContaining({ prescriptionMode: 'reps' })
      );
    });
  });
});

// ─── Tests — library tab ──────────────────────────────────────────────────────

describe('ExerciseComposer — library tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('switching to "Da biblioteca" shows the library panel', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));

    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByText('Agachamento')).toBeInTheDocument();
    expect(screen.getByText('Corrida')).toBeInTheDocument();
  });

  it('search filters library items', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));
    await user.type(
      screen.getByRole('textbox', { name: /Buscar exercício/i }),
      'agach'
    );

    expect(screen.getByText('Agachamento')).toBeInTheDocument();
    expect(screen.queryByText('Corrida')).not.toBeInTheDocument();
  });

  it('selecting items and clicking import calls onSubmitFromLibrary', async () => {
    const onSubmitFromLibrary = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onSubmitFromLibrary });

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));
    await user.click(screen.getByText('Agachamento'));
    await user.click(screen.getByRole('button', { name: /Importar 1/i }));

    expect(onSubmitFromLibrary).toHaveBeenCalledWith(['tmpl-1']);
  });

  it('import button is disabled when no items selected', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));

    const importBtn = screen.getByRole('button', { name: /^Importar$/i });
    expect(importBtn).toBeDisabled();
  });

  it('cancel on library tab calls onCancel', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onCancel });

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));
    await user.click(screen.getByRole('button', { name: /Cancelar/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
