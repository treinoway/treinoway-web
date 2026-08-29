import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import ExerciseComposer from './ExerciseComposer';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-uid' }, loading: false }),
}));

// API mock — used by useExerciseTemplateSearch inside LibraryPanel
vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from '../api/axios';

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
  notes: 'Observação de teste',
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

const switchToCreateTab = async (user) => {
  await user.click(screen.getByRole('tab', { name: /Criar novo/i }));
};

// ─── Tests — create mode ──────────────────────────────────────────────────────

describe('ExerciseComposer — create mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty form in create mode', async () => {
    const user = userEvent.setup();
    renderComposer();
    await switchToCreateTab(user);

    expect(screen.getByLabelText(/Nome/i)).toHaveValue('');
    expect(screen.getByRole('combobox', { name: /Tipo/i })).toBeInTheDocument();
  });

  it('shows the segmented toggle with "Criar novo" and "Da biblioteca"', () => {
    renderComposer();
    expect(screen.getByRole('tab', { name: /Criar novo/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Da biblioteca/i })).toBeInTheDocument();
  });

  it('renders the tabs in physical order "Da biblioteca" then "Criar novo"', () => {
    renderComposer();
    const tabs = screen.getAllByRole('tab').filter((el) =>
      /Da biblioteca|Criar novo/i.test(el.textContent)
    );
    expect(tabs[0]).toHaveTextContent(/Da biblioteca/i);
    expect(tabs[1]).toHaveTextContent(/Criar novo/i);
  });

  it('defaults to the "Da biblioteca" tab when opened (not in edit mode)', () => {
    renderComposer();
    expect(screen.getByRole('tab', { name: /Da biblioteca/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Criar novo/i })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('carga switch, vídeo library CTA and observações are visible immediately without any toggle', async () => {
    const user = userEvent.setup();
    renderComposer();
    await switchToCreateTab(user);

    expect(screen.getByRole('switch', { name: /Exercício com carga/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Escolher da biblioteca/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Observações/i)).toBeInTheDocument();
  });

  it('does NOT have a "Mostrar mais campos" toggle', async () => {
    const user = userEvent.setup();
    renderComposer();
    await switchToCreateTab(user);

    expect(
      screen.queryByRole('button', { name: /Mostrar mais campos/i })
    ).not.toBeInTheDocument();
  });

  it('submit without name shows validation error', async () => {
    const user = userEvent.setup();
    renderComposer();
    await switchToCreateTab(user);

    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Nome obrigatório/i);
    expect(defaultProps.onSubmitCreate).not.toHaveBeenCalled();
  });

  it('renders prescription mode picker (Repetições / Tempo tabs)', async () => {
    const user = userEvent.setup();
    renderComposer();
    await switchToCreateTab(user);

    expect(screen.getByRole('tab', { name: /Repetições/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Tempo/i })).toBeInTheDocument();
  });

  it('defaults to "reps" mode — reps inputs visible, duration input absent', async () => {
    const user = userEvent.setup();
    renderComposer();
    await switchToCreateTab(user);

    expect(screen.getByRole('tab', { name: /Repetições/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/Repetições mínimas/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Duração/i)).not.toBeInTheDocument();
  });

  it('switching to "Tempo" mode shows duration input and hides reps', async () => {
    const user = userEvent.setup();
    renderComposer();
    await switchToCreateTab(user);

    await user.click(screen.getByRole('tab', { name: /Tempo/i }));

    expect(screen.getByRole('tab', { name: /Tempo/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('spinbutton', { name: /Duração/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Repetições mínimas/i)).not.toBeInTheDocument();
  });

  it('rest chips (60s, 90s, 120s, 180s) are visible immediately', async () => {
    const user = userEvent.setup();
    renderComposer();
    await switchToCreateTab(user);

    expect(screen.getByRole('button', { name: /60s/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /90s/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /120s/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /180s/i })).toBeInTheDocument();
  });

  it('clicking a rest chip sets the rest interval input value', async () => {
    const user = userEvent.setup();
    renderComposer();
    await switchToCreateTab(user);

    await user.click(screen.getByRole('button', { name: /90s/i }));

    const restInput = screen.getByLabelText(/Intervalo de descanso em segundos/i);
    expect(restInput).toHaveValue(90);
  });

  it('submit with name calls onSubmitCreate with payload including prescriptionMode', async () => {
    const onSubmitCreate = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onSubmitCreate });
    await switchToCreateTab(user);

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
    await switchToCreateTab(user);

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

  it('disables submit button and shows "Salvando…" when saving=true', async () => {
    const user = userEvent.setup();
    renderComposer({ saving: true });
    await switchToCreateTab(user);

    const submitBtn = screen.getByRole('button', { name: /Salvando/i });
    expect(submitBtn).toBeDisabled();
  });
});

// ─── Tests — carga default by type ───────────────────────────────────────────

describe('ExerciseComposer — carga default by type', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('strength type → carga switch ON by default', async () => {
    const user = userEvent.setup();
    renderComposer();
    await switchToCreateTab(user);

    // default type is strength
    expect(screen.getByRole('switch', { name: /Exercício com carga/i })).toBeChecked();
  });

  it('switching type to cardio → carga switch turns OFF', async () => {
    const user = userEvent.setup();
    renderComposer();
    await switchToCreateTab(user);

    await user.selectOptions(screen.getByRole('combobox', { name: /Tipo/i }), 'cardio');

    expect(screen.getByRole('switch', { name: /Exercício com carga/i })).not.toBeChecked();
  });

  it('switching type to mobility → carga switch turns OFF', async () => {
    const user = userEvent.setup();
    renderComposer();
    await switchToCreateTab(user);

    await user.selectOptions(screen.getByRole('combobox', { name: /Tipo/i }), 'mobility');

    expect(screen.getByRole('switch', { name: /Exercício com carga/i })).not.toBeChecked();
  });

  it('switching type to stretching → carga switch turns OFF', async () => {
    const user = userEvent.setup();
    renderComposer();
    await switchToCreateTab(user);

    await user.selectOptions(screen.getByRole('combobox', { name: /Tipo/i }), 'stretching');

    expect(screen.getByRole('switch', { name: /Exercício com carga/i })).not.toBeChecked();
  });

  it('after manual toggle, changing type no longer overrides the user choice', async () => {
    const user = userEvent.setup();
    renderComposer();
    await switchToCreateTab(user);

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

  it('carga kg input is shown when switch is ON', async () => {
    const user = userEvent.setup();
    renderComposer();
    await switchToCreateTab(user);

    // strength defaults to ON
    expect(screen.getByLabelText(/Carga sugerida/i)).toBeInTheDocument();
  });

  it('carga kg input is hidden when switch is OFF', async () => {
    const user = userEvent.setup();
    renderComposer();
    await switchToCreateTab(user);

    await user.selectOptions(screen.getByRole('combobox', { name: /Tipo/i }), 'cardio');

    expect(screen.queryByLabelText(/Carga sugerida/i)).not.toBeInTheDocument();
  });
});

// ─── Tests — VideoField integration ──────────────────────────────────────────

describe('ExerciseComposer — VideoField integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Escolher da biblioteca" CTA and URL toggle when no video is set', async () => {
    const user = userEvent.setup();
    renderComposer();
    await switchToCreateTab(user);

    expect(screen.getByRole('button', { name: /Escolher da biblioteca/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ou cole uma URL do YouTube/i })).toBeInTheDocument();
  });

  it('URL input is hidden until the "ou cole uma URL" toggle is clicked', async () => {
    const user = userEvent.setup();
    renderComposer();
    await switchToCreateTab(user);

    expect(screen.queryByLabelText(/URL do YouTube/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ou cole uma URL do YouTube/i }));

    expect(screen.getByLabelText(/URL do YouTube/i)).toBeInTheDocument();
  });

  it('typing a valid YouTube URL into the revealed input is accepted without error', async () => {
    const user = userEvent.setup();
    renderComposer();
    await switchToCreateTab(user);

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
    await switchToCreateTab(user);

    await user.click(screen.getByRole('button', { name: /ou cole uma URL do YouTube/i }));
    await user.type(screen.getByLabelText(/URL do YouTube/i), 'https://vimeo.com/123456');

    expect(await screen.findByText(/Use um link do YouTube/i)).toBeInTheDocument();
  });

  it('opening the library picker renders the stub dialog', async () => {
    const user = userEvent.setup();
    renderComposer();
    await switchToCreateTab(user);

    await user.click(screen.getByRole('button', { name: /Escolher da biblioteca/i }));

    expect(
      screen.getByRole('dialog', { name: /Selecionar vídeo da biblioteca/i }),
    ).toBeInTheDocument();
  });

  it('selecting a video from the picker closes the dialog and wires videoUrl into the payload', async () => {
    const onSubmitCreate = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onSubmitCreate });
    await switchToCreateTab(user);

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

// ─── Tests — delete action (edit mode footer) ────────────────────────────────

describe('ExerciseComposer — delete action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the "Excluir" button in edit mode when onRequestDelete is provided', () => {
    renderComposer({ snapshot: EXERCISE_SNAPSHOT, onRequestDelete: vi.fn() });
    expect(screen.getByRole('button', { name: /Excluir/i })).toBeInTheDocument();
  });

  it('does NOT show the "Excluir" button in edit mode when onRequestDelete is not provided', () => {
    renderComposer({ snapshot: EXERCISE_SNAPSHOT });
    expect(screen.queryByRole('button', { name: /Excluir/i })).not.toBeInTheDocument();
  });

  it('does NOT show the "Excluir" button in create mode even when onRequestDelete is provided', () => {
    renderComposer({ snapshot: null, onRequestDelete: vi.fn() });
    expect(screen.queryByRole('button', { name: /Excluir/i })).not.toBeInTheDocument();
  });

  it('clicking "Excluir" calls onRequestDelete', async () => {
    const onRequestDelete = vi.fn();
    const user = userEvent.setup();
    renderComposer({ snapshot: EXERCISE_SNAPSHOT, onRequestDelete });

    await user.click(screen.getByRole('button', { name: /Excluir/i }));

    expect(onRequestDelete).toHaveBeenCalledTimes(1);
  });

  it('disables the "Excluir" button when saving=true', () => {
    renderComposer({ snapshot: EXERCISE_SNAPSHOT, onRequestDelete: vi.fn(), saving: true });
    expect(screen.getByRole('button', { name: /Excluir/i })).toBeDisabled();
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
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // Default: server search returns empty (won't be called when query is blank)
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('switching to "Da biblioteca" shows the library panel', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    renderComposer();

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));

    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByText('Agachamento')).toBeInTheDocument();
    expect(screen.getByText('Corrida')).toBeInTheDocument();
  });

  it('search sends request to server and shows results', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    api.get.mockResolvedValue({
      data: { data: [EXERCISE_TEMPLATES[0]], total: 1 },
    });
    renderComposer();

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));
    await user.type(
      screen.getByRole('textbox', { name: /Buscar exercício/i }),
      'agach'
    );

    // Advance past debounce (300 ms) + spinner delay (250 ms)
    act(() => { vi.advanceTimersByTime(600); });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/trainer/exercise-templates',
        expect.objectContaining({ params: expect.objectContaining({ q: 'agach' }) })
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Agachamento')).toBeInTheDocument();
    });
  });

  it('server search surfaces a template NOT in the initial cached list', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    const serverOnlyTemplate = { id: 'tmpl-server', name: 'Leg Press', type: 'strength' };
    api.get.mockResolvedValue({
      data: { data: [serverOnlyTemplate], total: 1 },
    });
    renderComposer();

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));
    expect(screen.queryByText('Leg Press')).not.toBeInTheDocument();

    await user.type(
      screen.getByRole('textbox', { name: /Buscar exercício/i }),
      'leg'
    );

    act(() => { vi.advanceTimersByTime(600); });

    await waitFor(() => {
      expect(screen.getByText('Leg Press')).toBeInTheDocument();
    });
  });

  it('selecting items and clicking import calls onSubmitFromLibrary with ids and resolved templates', async () => {
    const onSubmitFromLibrary = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    renderComposer({ onSubmitFromLibrary });

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));
    await user.click(screen.getByText('Agachamento'));
    await user.click(screen.getByRole('button', { name: /Importar 1/i }));

    expect(onSubmitFromLibrary).toHaveBeenCalledWith(
      ['tmpl-1'],
      { 'tmpl-1': EXERCISE_TEMPLATES[0] }
    );
  });

  it('selecting a template that only exists in search results (not in the initial list) resolves its full object on import', async () => {
    const onSubmitFromLibrary = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    const serverOnlyTemplate = { id: 'tmpl-server', name: 'Leg Press', type: 'strength' };
    api.get.mockResolvedValue({
      data: { data: [serverOnlyTemplate], total: 1 },
    });
    renderComposer({ onSubmitFromLibrary });

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));
    await user.type(
      screen.getByRole('textbox', { name: /Buscar exercício/i }),
      'leg'
    );
    act(() => { vi.advanceTimersByTime(600); });
    await waitFor(() => {
      expect(screen.getByText('Leg Press')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Leg Press'));
    await user.click(screen.getByRole('button', { name: /Importar 1/i }));

    expect(onSubmitFromLibrary).toHaveBeenCalledWith(
      ['tmpl-server'],
      { 'tmpl-server': serverOnlyTemplate }
    );
  });

  it('import button is disabled when no items selected', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    renderComposer();

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));

    const importBtn = screen.getByRole('button', { name: /^Importar$/i });
    expect(importBtn).toBeDisabled();
  });

  it('cancel on library tab calls onCancel', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    renderComposer({ onCancel });

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));
    await user.click(screen.getByRole('button', { name: /Cancelar/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('search input stays in the document while server fetch is in flight', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    let resolveSearch;
    const searchPromise = new Promise((resolve) => { resolveSearch = resolve; });
    api.get.mockReturnValueOnce(searchPromise);
    renderComposer();

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));
    await user.type(
      screen.getByRole('textbox', { name: /Buscar exercício/i }),
      'flex'
    );

    act(() => { vi.advanceTimersByTime(350); });

    // Input must still be present while fetch is pending
    expect(screen.getByRole('textbox', { name: /Buscar exercício/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Buscar exercício/i })).toHaveValue('flex');

    resolveSearch({ data: { data: [], total: 0 } });
    await waitFor(() => {
      expect(screen.queryByText('Buscando…')).not.toBeInTheDocument();
    });
  });

  it('spinner does not appear when fetch resolves before the 250 ms threshold', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    // Resolve immediately (synchronously via microtask) — well under 250 ms
    api.get.mockResolvedValue({ data: { data: [EXERCISE_TEMPLATES[0]], total: 1 } });
    renderComposer();

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));
    await user.type(
      screen.getByRole('textbox', { name: /Buscar exercício/i }),
      'ag'
    );

    // Advance past debounce so the fetch fires, but stay under the spinner delay
    act(() => { vi.advanceTimersByTime(310); });

    // Flush the resolved promise
    await waitFor(() => {
      expect(screen.getByText('Agachamento')).toBeInTheDocument();
    });

    // Spinner must never have appeared
    expect(screen.queryByRole('img', { hidden: true, name: /spinner/i })).not.toBeInTheDocument();
    // The .library-refetch-spinner element should not be in the DOM
    expect(document.querySelector('.library-refetch-spinner')).toBeNull();
  });

  it('spinner appears after 250 ms when fetch is still in flight', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });
    let resolveSearch;
    api.get.mockReturnValue(new Promise((resolve) => { resolveSearch = resolve; }));
    renderComposer();

    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));
    await user.type(
      screen.getByRole('textbox', { name: /Buscar exercício/i }),
      'slow'
    );

    // Advance past debounce (300 ms) so fetch starts, then past spinner delay (250 ms).
    await act(async () => { vi.advanceTimersByTime(600); });

    // waitFor lets React settle after the timer-triggered state updates
    await waitFor(() => {
      expect(document.querySelector('.library-refetch-spinner')).not.toBeNull();
    });

    // Resolve and confirm spinner goes away
    resolveSearch({ data: { data: [], total: 0 } });
    await waitFor(() => {
      expect(document.querySelector('.library-refetch-spinner')).toBeNull();
    });
  });

  it('prior results stay visible while a new search is in flight', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });

    // First search resolves immediately with Agachamento
    api.get.mockResolvedValueOnce({ data: { data: [EXERCISE_TEMPLATES[0]], total: 1 } });
    // Second search is slow — will not resolve until we call resolveSecond
    let resolveSecond;
    api.get.mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve; }));

    renderComposer();
    await user.click(screen.getByRole('tab', { name: /Da biblioteca/i }));

    // First search: type, flush debounce + spinner delay, wait for result
    await user.type(screen.getByRole('textbox', { name: /Buscar exercício/i }), 'ag');
    await act(async () => { vi.advanceTimersByTime(600); });
    await waitFor(() => expect(screen.getByText('Agachamento')).toBeInTheDocument());

    // Second search — clear and type new query
    await user.clear(screen.getByRole('textbox', { name: /Buscar exercício/i }));
    await user.type(screen.getByRole('textbox', { name: /Buscar exercício/i }), 'corr');
    // Advance past debounce only — fetch fires but has not resolved yet
    await act(async () => { vi.advanceTimersByTime(310); });

    // While second fetch is pending, stale result (Agachamento) must still show
    expect(screen.getByText('Agachamento')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum exercício encontrado.')).not.toBeInTheDocument();

    // Resolve second fetch and confirm new result appears
    resolveSecond({ data: { data: [EXERCISE_TEMPLATES[1]], total: 1 } });
    await waitFor(() => expect(screen.getByText('Corrida')).toBeInTheDocument());
  });
});

// ─── Tests — prescription warn dialog ────────────────────────────────────────

describe('ExerciseComposer — prescription warn dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reps mode with empty reps opens warn dialog and does not call onSubmitCreate', async () => {
    const onSubmitCreate = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onSubmitCreate });
    await switchToCreateTab(user);

    await user.type(screen.getByLabelText(/Nome/i), 'Rosca direta');
    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    expect(await screen.findByText(/Nenhuma repetição definida/i)).toBeInTheDocument();
    expect(onSubmitCreate).not.toHaveBeenCalled();
  });

  it('reps mode warn dialog: confirm saves the exercise', async () => {
    const onSubmitCreate = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onSubmitCreate });
    await switchToCreateTab(user);

    await user.type(screen.getByLabelText(/Nome/i), 'Rosca direta');
    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));
    await screen.findByText(/Nenhuma repetição definida/i);

    await user.click(screen.getByRole('button', { name: /Salvar mesmo assim/i }));

    await waitFor(() => {
      expect(onSubmitCreate).toHaveBeenCalledTimes(1);
    });
  });

  it('reps mode warn dialog: cancel closes dialog without saving', async () => {
    const onSubmitCreate = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onSubmitCreate });
    await switchToCreateTab(user);

    await user.type(screen.getByLabelText(/Nome/i), 'Rosca direta');
    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));
    await screen.findByText(/Nenhuma repetição definida/i);

    await user.click(screen.getByRole('button', { name: /Voltar e preencher/i }));

    expect(screen.queryByText(/Nenhuma repetição definida/i)).not.toBeInTheDocument();
    expect(onSubmitCreate).not.toHaveBeenCalled();
  });

  it('duration mode with empty duration opens warn dialog', async () => {
    const onSubmitCreate = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onSubmitCreate });
    await switchToCreateTab(user);

    await user.type(screen.getByLabelText(/Nome/i), 'Prancha');
    await user.click(screen.getByRole('tab', { name: /Tempo/i }));
    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    expect(await screen.findByText(/Nenhuma duração definida/i)).toBeInTheDocument();
    expect(onSubmitCreate).not.toHaveBeenCalled();
  });

  it('filled reps saves directly without showing warn dialog', async () => {
    const onSubmitCreate = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onSubmitCreate });
    await switchToCreateTab(user);

    await user.type(screen.getByLabelText(/Nome/i), 'Rosca direta');
    await user.type(screen.getByLabelText(/Repetições mínimas/i), '8');
    await user.type(screen.getByLabelText(/Repetições máximas/i), '12');
    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => {
      expect(onSubmitCreate).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText(/Nenhuma repetição definida/i)).not.toBeInTheDocument();
  });
});

// ─── Tests — clearing fields (edit vs create payload semantics) ─────────────

describe('ExerciseComposer — clearing fields', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('edit mode: clearing "Séries" sends sets=null', async () => {
    const onSubmitEdit = vi.fn();
    const user = userEvent.setup();
    renderComposer({ snapshot: EXERCISE_SNAPSHOT, onSubmitEdit });

    await user.clear(screen.getByLabelText(/Séries/i));
    await user.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => {
      expect(onSubmitEdit).toHaveBeenCalledWith(
        'junc-1',
        expect.objectContaining({ sets: null })
      );
    });
  });

  it('edit mode: clearing "Descanso" sends restInterval=null', async () => {
    const onSubmitEdit = vi.fn();
    const user = userEvent.setup();
    renderComposer({ snapshot: EXERCISE_SNAPSHOT, onSubmitEdit });

    await user.clear(screen.getByLabelText(/Intervalo de descanso em segundos/i));
    await user.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => {
      expect(onSubmitEdit).toHaveBeenCalledWith(
        'junc-1',
        expect.objectContaining({ restInterval: null })
      );
    });
  });

  it('edit mode: clearing "Carga sugerida" sends suggestedLoad=null', async () => {
    const onSubmitEdit = vi.fn();
    const user = userEvent.setup();
    renderComposer({ snapshot: EXERCISE_SNAPSHOT, onSubmitEdit });

    await user.clear(screen.getByLabelText(/Carga sugerida/i));
    await user.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => {
      expect(onSubmitEdit).toHaveBeenCalledWith(
        'junc-1',
        expect.objectContaining({ suggestedLoad: null })
      );
    });
  });

  it('edit mode: clearing "Observações" sends notes=""', async () => {
    const onSubmitEdit = vi.fn();
    const user = userEvent.setup();
    renderComposer({ snapshot: EXERCISE_SNAPSHOT, onSubmitEdit });

    await user.clear(screen.getByLabelText(/Observações/i));
    await user.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => {
      expect(onSubmitEdit).toHaveBeenCalledWith(
        'junc-1',
        expect.objectContaining({ notes: '' })
      );
    });
  });

  it('edit mode: turning "Exercício com carga" off sends suggestedLoad=null even without touching the load field', async () => {
    const onSubmitEdit = vi.fn();
    const user = userEvent.setup();
    renderComposer({ snapshot: EXERCISE_SNAPSHOT, onSubmitEdit });

    await user.click(screen.getByRole('switch', { name: /Exercício com carga/i }));
    await user.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => {
      expect(onSubmitEdit).toHaveBeenCalledWith(
        'junc-1',
        expect.objectContaining({ suggestedLoad: null })
      );
    });
  });

  it('create mode: leaving sets, restInterval, suggestedLoad and notes empty omits them from the payload', async () => {
    const onSubmitCreate = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onSubmitCreate });
    await switchToCreateTab(user);

    await user.type(screen.getByLabelText(/Nome/i), 'Rosca direta');
    await user.type(screen.getByLabelText(/Repetições mínimas/i), '8');
    await user.type(screen.getByLabelText(/Repetições máximas/i), '12');
    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => {
      expect(onSubmitCreate).toHaveBeenCalledTimes(1);
    });
    const payload = onSubmitCreate.mock.calls[0][0];
    expect(payload).not.toHaveProperty('sets');
    expect(payload).not.toHaveProperty('restInterval');
    expect(payload).not.toHaveProperty('suggestedLoad');
    expect(payload).not.toHaveProperty('notes');
  });
});
