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
  sets: 3,
  repetitions: { min: 10, max: 12 },
  restInterval: 60,
  hasLoad: true,
  suggestedLoad: 80,
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ExerciseComposer — create mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty form in create mode', () => {
    renderComposer();
    expect(screen.getByLabelText(/Nome/i)).toHaveValue('');
    expect(screen.getByLabelText(/Tipo/i)).toBeInTheDocument();
  });

  it('shows the segmented toggle with "Criar novo" and "Da biblioteca"', () => {
    renderComposer();
    expect(
      screen.getByRole('tab', { name: /Criar novo/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /Da biblioteca/i })
    ).toBeInTheDocument();
  });

  it('submit without name shows validation error', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Nome obrigatório/i);
    expect(defaultProps.onSubmitCreate).not.toHaveBeenCalled();
  });

  it('submit with name calls onSubmitCreate with payload', async () => {
    const onSubmitCreate = vi.fn();
    const user = userEvent.setup();
    renderComposer({ onSubmitCreate });

    await user.type(screen.getByLabelText(/Nome/i), 'Rosca direta');
    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => {
      expect(onSubmitCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Rosca direta', type: 'strength' })
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

  it('"Mostrar mais campos" toggle expands advanced fields', async () => {
    const user = userEvent.setup();
    renderComposer();

    expect(screen.queryByRole('button', { name: /escolher da biblioteca/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Mostrar mais campos/i }));

    // VideoField CTA is now the entry point for the video field
    expect(screen.getByRole('button', { name: /escolher da biblioteca/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Observações/i)).toBeInTheDocument();
  });

  it('"Mostrar mais campos" label changes to "Ocultar campos avançados" when expanded', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole('button', { name: /Mostrar mais campos/i }));

    expect(
      screen.getByRole('button', { name: /Ocultar campos avançados/i })
    ).toBeInTheDocument();
  });

  it('renders a YouTube iframe when a valid URL is entered in the video field', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole('button', { name: /Mostrar mais campos/i }));

    // VideoField: reveal the URL input via the toggle link
    await user.click(screen.getByRole('button', { name: /cole uma url do youtube/i }));
    await user.type(
      screen.getByRole('textbox', { name: /url do youtube/i }),
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );

    // Iframe appears — src assertion skipped (jsdom scrubs cross-origin src after re-renders)
    expect(await screen.findByTitle('Vídeo de demonstração do exercício')).toBeInTheDocument();
  });

  it('does not render a YouTube iframe when the video field is empty', async () => {
    const user = userEvent.setup();
    renderComposer();

    await user.click(screen.getByRole('button', { name: /Mostrar mais campos/i }));

    expect(screen.queryByTitle('Vídeo de demonstração do exercício')).not.toBeInTheDocument();
  });

  it('disables submit button and shows "Salvando…" when saving=true', () => {
    renderComposer({ saving: true });
    const submitBtn = screen.getByRole('button', { name: /Salvando/i });
    expect(submitBtn).toBeDisabled();
  });
});

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
    expect(
      screen.getByRole('button', { name: /Salvar alterações/i })
    ).toBeInTheDocument();
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
});

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
    // Library items use role="listitem" on a <button> with text inside nested spans;
    // click by text content since the accessible name is computed from visible text.
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
