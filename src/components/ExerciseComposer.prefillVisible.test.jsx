import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import ExerciseComposer from './ExerciseComposer';

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-uid' }, loading: false }),
}));

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

import api from '../api/axios';

// why: real ExerciseTemplate rows only carry id, name, type and videoUrl (no prescription).
const BARE = { id: 'tmpl-bare', name: 'Agachamento livre', type: 'strength' };
const FULL = {
  id: 'tmpl-full',
  name: 'Supino reto',
  type: 'strength',
  prescriptionMode: 'reps',
  sets: 4,
  repetitions: { min: 8, max: 12 },
  restInterval: 90,
};

const baseProps = {
  snapshot: null,
  exerciseTemplates: [BARE, FULL],
  saving: false,
  onSubmitCreate: vi.fn(),
  onSubmitEdit: vi.fn(),
  onSubmitFromLibrary: vi.fn(),
  onSubmitFromTemplate: vi.fn().mockResolvedValue({}),
  onCancel: vi.fn(),
};

// Renders the composer in create mode.
const renderComposer = (props = {}) => render(<ExerciseComposer {...baseProps} {...props} />);

// Searches and picks an exercise by query and option name.
const pick = async (user, query, name) => {
  await user.type(screen.getByRole('combobox', { name: /Buscar na biblioteca/i }), query);
  await user.click(await screen.findByRole('option', { name }));
};

describe('ExerciseComposer — prescription visible before a pick (criterion 23)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });
  });

  it('shows the search and empty, editable prescription fields right away', async () => {
    const user = userEvent.setup();
    renderComposer();

    expect(screen.getByRole('combobox', { name: /Buscar na biblioteca/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Séries/i)).toHaveValue(null);
    expect(screen.getByLabelText(/Repetições mínimas/i)).toHaveValue(null);
    expect(screen.getByLabelText(/Intervalo de descanso/i)).toHaveValue(null);
    expect(screen.getByLabelText(/Observações/i)).toHaveValue('');
    await user.type(screen.getByLabelText(/Séries/i), '5');
    expect(screen.getByLabelText(/Séries/i)).toHaveValue(5);
  });

  it('keeps save disabled until an exercise is picked', async () => {
    const user = userEvent.setup();
    renderComposer();
    await user.type(screen.getByLabelText(/Séries/i), '5');

    expect(screen.getByRole('button', { name: /Salvar exercício/i })).toBeDisabled();
  });

  it('keeps typed values after picking a bare template and sends them in the payload', async () => {
    const onSubmitFromTemplate = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    renderComposer({ onSubmitFromTemplate });
    await user.type(screen.getByLabelText(/Séries/i), '5');
    await user.type(screen.getByLabelText(/Repetições mínimas/i), '6');
    await user.type(screen.getByLabelText(/Repetições máximas/i), '10');
    await user.type(screen.getByLabelText(/Observações/i), 'Pausa no peito');

    await pick(user, 'agacha', /Agachamento livre/i);

    expect(screen.getByLabelText(/Séries/i)).toHaveValue(5);
    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));
    await waitFor(() => expect(onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    expect(onSubmitFromTemplate).toHaveBeenCalledWith(
      'tmpl-bare',
      expect.objectContaining({
        prescriptionMode: 'reps',
        sets: 5,
        repetitions: { min: 6, max: 10 },
        notes: 'Pausa no peito',
      })
    );
  });

  it('a template only fills the fields it defines', async () => {
    const user = userEvent.setup();
    renderComposer();
    await user.type(screen.getByLabelText(/Intervalo de descanso/i), '45');

    await pick(user, 'supino', /Supino reto/i);

    expect(screen.getByLabelText(/Séries/i)).toHaveValue(4);
    expect(screen.getByLabelText(/Repetições mínimas/i)).toHaveValue(8);
    expect(screen.getByLabelText(/Intervalo de descanso/i)).toHaveValue(90);
  });

  it('typing before a pick makes the form dirty, searching alone does not', async () => {
    const onDirtyChange = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onDirtyChange });

    await user.type(screen.getByRole('combobox', { name: /Buscar na biblioteca/i }), 'ag');
    expect(onDirtyChange).not.toHaveBeenCalledWith(true);

    await user.type(screen.getByLabelText(/Séries/i), '3');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });

  it('"Trocar" returns only the exercise slot to the search and keeps the typed prescription', async () => {
    const user = userEvent.setup();
    renderComposer();
    await user.type(screen.getByLabelText(/Séries/i), '5');
    await pick(user, 'agacha', /Agachamento livre/i);

    await user.click(screen.getByRole('button', { name: /^Trocar$/i }));

    expect(screen.getByRole('combobox', { name: /Buscar na biblioteca/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Séries/i)).toHaveValue(5);
    expect(screen.getByRole('button', { name: /Salvar exercício/i })).toBeDisabled();
  });
});
