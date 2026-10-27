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
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import api from '../api/axios';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const SUPINO = {
  id: 'tmpl-supino',
  name: 'Supino reto',
  type: 'strength',
  prescriptionMode: 'reps',
  sets: 4,
  repetitions: { min: 8, max: 12 },
  restInterval: 90,
  hasLoad: true,
  suggestedLoad: 40,
  notes: 'Controle a descida',
};

const REMADA = {
  id: 'tmpl-remada',
  name: 'Remada curvada',
  type: 'strength',
  prescriptionMode: 'reps',
  sets: 3,
  repetitions: { min: 10, max: 12 },
  restInterval: 60,
  hasLoad: true,
};

const ELEVACAO = {
  id: 'tmpl-elevacao',
  name: 'Elevação lateral',
  type: 'strength',
  prescriptionMode: 'reps',
  sets: 3,
  repetitions: { min: 12, max: 15 },
  restInterval: 45,
  hasLoad: true,
};

const PRANCHA = {
  id: 'tmpl-prancha',
  name: 'Prancha',
  type: 'mobility',
  prescriptionMode: 'duration',
  sets: 3,
  duration: 45,
  restInterval: 30,
  hasLoad: false,
};

const TEMPLATES = [SUPINO, REMADA, ELEVACAO, PRANCHA];

const baseProps = {
  snapshot: null,
  exerciseTemplates: TEMPLATES,
  saving: false,
  onSubmitCreate: vi.fn(),
  onSubmitEdit: vi.fn(),
  onSubmitFromLibrary: vi.fn(),
  onSubmitFromTemplate: vi.fn(),
  onCancel: vi.fn(),
};

// Renders the composer in create mode with the library fixtures.
const renderComposer = (props = {}) =>
  render(<ExerciseComposer {...baseProps} {...props} />);

// Returns the library search combobox.
const getSearch = () => screen.getByRole('combobox', { name: /Buscar na biblioteca/i });

// Types a query and picks the option whose accessible name matches.
const searchAndPick = async (user, query, optionName) => {
  await user.type(getSearch(), query);
  await user.click(await screen.findByRole('option', { name: optionName }));
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ExerciseComposer — library search as the default add (criteria 16-17)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });
  });

  it('opens on "Adicionar exercício" with the search combobox and an "Adicionar em lote" button', () => {
    renderComposer();

    expect(screen.getByRole('tab', { name: /Adicionar exercício/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Criar novo/i })).toHaveAttribute('aria-selected', 'false');
    expect(getSearch()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Adicionar em lote/i })).toBeInTheDocument();
  });

  it('does not show the multi-select list or an "Importar" button on the single add', () => {
    renderComposer();

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Importar/i })).not.toBeInTheDocument();
  });

  it('keeps "Salvar exercício" disabled until an exercise is picked', async () => {
    const user = userEvent.setup();
    renderComposer();
    expect(screen.getByRole('button', { name: /Salvar exercício/i })).toBeDisabled();

    await searchAndPick(user, 'supino', /Supino reto/i);

    expect(screen.getByRole('button', { name: /Salvar exercício/i })).toBeEnabled();
  });

  it('filters the templates by name as the user types', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.type(getSearch(), 'remada');

    const listbox = await screen.findByRole('listbox');
    expect(listbox).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Remada curvada/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Supino reto/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Prancha/i })).not.toBeInTheDocument();
  });

  it('matches case-insensitively ("SUPINO" finds "Supino reto")', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.type(getSearch(), 'SUPINO');

    expect(await screen.findByRole('option', { name: /Supino reto/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Remada curvada/i })).not.toBeInTheDocument();
  });

  it('matches accent-insensitively ("elevacao" finds "Elevação lateral")', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.type(getSearch(), 'elevacao');

    expect(await screen.findByRole('option', { name: /Elevação lateral/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Supino reto/i })).not.toBeInTheDocument();
  });

  it('matches accented queries against the same names ("elevação")', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.type(getSearch(), 'elevação');

    expect(await screen.findByRole('option', { name: /Elevação lateral/i })).toBeInTheDocument();
  });

  it('shows an empty message and no options when nothing matches', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.type(getSearch(), 'zzzz');

    expect(await screen.findByText(/Nenhum exercício encontrado/i)).toBeInTheDocument();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('picking an option shows the chosen exercise (name and type) with a "Trocar" button', async () => {
    const user = userEvent.setup();
    renderComposer();

    await searchAndPick(user, 'supino', /Supino reto/i);

    expect(screen.queryByRole('combobox', { name: /Buscar na biblioteca/i })).not.toBeInTheDocument();
    expect(screen.getByText('Supino reto')).toBeInTheDocument();
    expect(screen.getByText('Força')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Trocar$/i })).toBeInTheDocument();
  });

  it('pre-fills the reps prescription from the template', async () => {
    const user = userEvent.setup();
    renderComposer();

    await searchAndPick(user, 'supino', /Supino reto/i);

    expect(screen.getByLabelText(/Séries/i)).toHaveValue(4);
    expect(screen.getByLabelText(/Repetições mínimas/i)).toHaveValue(8);
    expect(screen.getByLabelText(/Repetições máximas/i)).toHaveValue(12);
    expect(screen.getByLabelText(/Intervalo de descanso/i)).toHaveValue(90);
    expect(screen.getByRole('switch', { name: /Exercício com carga/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText(/Carga sugerida/i)).toHaveValue(40);
    expect(screen.getByLabelText(/Observações/i)).toHaveValue('Controle a descida');
  });

  it('pre-fills a duration template in time mode without a load', async () => {
    const user = userEvent.setup();
    renderComposer();

    await searchAndPick(user, 'prancha', /Prancha/i);

    expect(screen.getByRole('tab', { name: /Tempo/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText(/^Duração$/)).toHaveValue(45);
    expect(screen.getByLabelText(/Séries/i)).toHaveValue(3);
    expect(screen.getByLabelText(/Intervalo de descanso/i)).toHaveValue(30);
    expect(screen.getByRole('switch', { name: /Exercício com carga/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByLabelText(/Carga sugerida/i)).not.toBeInTheDocument();
  });

  it('keeps every prescription field editable', async () => {
    const user = userEvent.setup();
    renderComposer();
    await searchAndPick(user, 'supino', /Supino reto/i);

    await user.clear(screen.getByLabelText(/Séries/i));
    await user.type(screen.getByLabelText(/Séries/i), '5');
    await user.clear(screen.getByLabelText(/Repetições mínimas/i));
    await user.type(screen.getByLabelText(/Repetições mínimas/i), '6');
    await user.clear(screen.getByLabelText(/Intervalo de descanso/i));
    await user.type(screen.getByLabelText(/Intervalo de descanso/i), '120');
    await user.clear(screen.getByLabelText(/Carga sugerida/i));
    await user.type(screen.getByLabelText(/Carga sugerida/i), '50');
    await user.clear(screen.getByLabelText(/Observações/i));
    await user.type(screen.getByLabelText(/Observações/i), 'Pausa no peito');

    expect(screen.getByLabelText(/Séries/i)).toHaveValue(5);
    expect(screen.getByLabelText(/Repetições mínimas/i)).toHaveValue(6);
    expect(screen.getByLabelText(/Intervalo de descanso/i)).toHaveValue(120);
    expect(screen.getByLabelText(/Carga sugerida/i)).toHaveValue(50);
    expect(screen.getByLabelText(/Observações/i)).toHaveValue('Pausa no peito');
  });

  it('"Trocar" returns to the search and disables saving again', async () => {
    const user = userEvent.setup();
    renderComposer();
    await searchAndPick(user, 'supino', /Supino reto/i);

    await user.click(screen.getByRole('button', { name: /^Trocar$/i }));

    expect(getSearch()).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Trocar$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salvar exercício/i })).toBeDisabled();
  });

  it('picking a different exercise after "Trocar" re-fills the prescription from the new template', async () => {
    const user = userEvent.setup();
    renderComposer();
    await searchAndPick(user, 'supino', /Supino reto/i);
    await user.click(screen.getByRole('button', { name: /^Trocar$/i }));

    await searchAndPick(user, 'remada', /Remada curvada/i);

    expect(screen.getByLabelText(/Séries/i)).toHaveValue(3);
    expect(screen.getByLabelText(/Repetições mínimas/i)).toHaveValue(10);
    expect(screen.getByLabelText(/Intervalo de descanso/i)).toHaveValue(60);
  });
});

describe('ExerciseComposer — saving a picked exercise (criterion 18)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });
  });

  it('calls onSubmitFromTemplate with the templateId and the template prescription when untouched', async () => {
    const onSubmitFromTemplate = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onSubmitFromTemplate });
    await searchAndPick(user, 'supino', /Supino reto/i);

    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => expect(onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    expect(onSubmitFromTemplate).toHaveBeenCalledWith(
      'tmpl-supino',
      expect.objectContaining({
        template: SUPINO,
        prescriptionMode: 'reps',
        sets: 4,
        repetitions: { min: 8, max: 12 },
        restInterval: 90,
        hasLoad: true,
        suggestedLoad: 40,
        notes: 'Controle a descida',
      })
    );
  });

  it('sends the edited prescription as overrides', async () => {
    const onSubmitFromTemplate = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onSubmitFromTemplate });
    await searchAndPick(user, 'supino', /Supino reto/i);
    await user.clear(screen.getByLabelText(/Séries/i));
    await user.type(screen.getByLabelText(/Séries/i), '5');
    await user.clear(screen.getByLabelText(/Repetições máximas/i));
    await user.type(screen.getByLabelText(/Repetições máximas/i), '10');
    await user.clear(screen.getByLabelText(/Intervalo de descanso/i));
    await user.type(screen.getByLabelText(/Intervalo de descanso/i), '120');

    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => expect(onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    expect(onSubmitFromTemplate).toHaveBeenCalledWith(
      'tmpl-supino',
      expect.objectContaining({
        sets: 5,
        repetitions: { min: 8, max: 10 },
        restInterval: 120,
      })
    );
  });

  it('sends a duration prescription for a time-mode template', async () => {
    const onSubmitFromTemplate = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onSubmitFromTemplate });
    await searchAndPick(user, 'prancha', /Prancha/i);

    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => expect(onSubmitFromTemplate).toHaveBeenCalledTimes(1));
    expect(onSubmitFromTemplate).toHaveBeenCalledWith(
      'tmpl-prancha',
      expect.objectContaining({ prescriptionMode: 'duration', duration: 45, sets: 3, hasLoad: false })
    );
  });

  it('does not call the batch import or the create handler', async () => {
    const onSubmitFromLibrary = vi.fn();
    const onSubmitCreate = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onSubmitFromLibrary, onSubmitCreate });
    await searchAndPick(user, 'supino', /Supino reto/i);

    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    expect(onSubmitFromLibrary).not.toHaveBeenCalled();
    expect(onSubmitCreate).not.toHaveBeenCalled();
  });

  it('disables saving while a save is in flight', async () => {
    const user = userEvent.setup();
    const { rerender } = renderComposer();
    await searchAndPick(user, 'supino', /Supino reto/i);

    rerender(<ExerciseComposer {...baseProps} saving />);

    expect(screen.getByRole('button', { name: /Salvando/i })).toBeDisabled();
  });

  it('Cancelar calls onCancel', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onCancel });

    await user.click(screen.getByRole('button', { name: /^Cancelar$/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('ExerciseComposer — batch add (criterion 19)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });
  });

  it('"Adicionar em lote" swaps the search for the multi-select list', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole('button', { name: /Adicionar em lote/i }));

    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByText('Supino reto')).toBeInTheDocument();
    expect(screen.getByText('Remada curvada')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /Buscar na biblioteca/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Importar$/i })).toBeDisabled();
  });

  it('selecting items and "Importar N" calls onSubmitFromLibrary in click order', async () => {
    const onSubmitFromLibrary = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onSubmitFromLibrary });
    await user.click(screen.getByRole('button', { name: /Adicionar em lote/i }));

    await user.click(screen.getByText('Remada curvada'));
    await user.click(screen.getByText('Supino reto'));
    await user.click(screen.getByRole('button', { name: /Importar 2/i }));

    expect(onSubmitFromLibrary).toHaveBeenCalledWith(
      ['tmpl-remada', 'tmpl-supino'],
      { 'tmpl-remada': REMADA, 'tmpl-supino': SUPINO }
    );
  });

  it('"Voltar" returns to the single add', async () => {
    const user = userEvent.setup();
    renderComposer();
    await user.click(screen.getByRole('button', { name: /Adicionar em lote/i }));

    await user.click(screen.getByRole('button', { name: /^Voltar$/i }));

    expect(getSearch()).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Adicionar exercício/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('the batch button is not offered in the "Criar novo" tab', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole('tab', { name: /Criar novo/i }));

    expect(screen.queryByRole('button', { name: /Adicionar em lote/i })).not.toBeInTheDocument();
  });
});

describe('ExerciseComposer — "Criar novo" unchanged (criterion 20)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });
  });

  it('shows the empty create form without the search and submits through onSubmitCreate', async () => {
    const onSubmitCreate = vi.fn();
    const onSubmitFromTemplate = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onSubmitCreate, onSubmitFromTemplate });

    await user.click(screen.getByRole('tab', { name: /Criar novo/i }));

    expect(screen.getByLabelText(/Nome/i)).toHaveValue('');
    expect(screen.queryByRole('combobox', { name: /Buscar na biblioteca/i })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(/Nome/i), 'Leg press');
    await user.type(screen.getByLabelText(/Repetições mínimas/i), '10');
    await user.type(screen.getByLabelText(/Repetições máximas/i), '15');
    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => expect(onSubmitCreate).toHaveBeenCalledTimes(1));
    expect(onSubmitCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Leg press' }));
    expect(onSubmitFromTemplate).not.toHaveBeenCalled();
  });
});

describe('ExerciseComposer — dirty tracking (criterion 21)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });
  });

  it('is pristine when opened and while only searching', async () => {
    const onDirtyChange = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onDirtyChange });

    await user.type(getSearch(), 'sup');

    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    expect(onDirtyChange).not.toHaveBeenCalledWith(true);
  });

  it('becomes dirty once an exercise is picked', async () => {
    const onDirtyChange = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onDirtyChange });

    await searchAndPick(user, 'supino', /Supino reto/i);

    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });

  it('stays dirty after editing a prescription field', async () => {
    const onDirtyChange = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onDirtyChange });
    await searchAndPick(user, 'supino', /Supino reto/i);

    await user.type(screen.getByLabelText(/Séries/i), '1');

    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });
});

describe('ExerciseComposer — edit mode unchanged (criterion 22)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });
  });

  it('has no tabs, no search and no "Adicionar em lote"', () => {
    renderComposer({
      snapshot: { id: 'junc-1', name: 'Supino reto', type: 'strength', sets: 3, repetitions: { min: 8, max: 12 } },
    });

    expect(screen.queryByRole('tab', { name: /Adicionar exercício/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Criar novo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Adicionar em lote/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /Buscar na biblioteca/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Nome/i)).toHaveValue('Supino reto');
  });
});
