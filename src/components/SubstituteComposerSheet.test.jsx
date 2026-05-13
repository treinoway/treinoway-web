import { render, screen, waitFor } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import SubstituteComposerSheet from './SubstituteComposerSheet';
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

vi.mock('../utils/exerciseMeta', () => ({
  formatExerciseMeta: vi.fn(() => null),
}));

const principal = {
  id: 'ex-1',
  type: 'strength',
  sets: 4,
  repetitions: { min: 8, max: 10 },
  hasLoad: true,
  suggestedLoad: 60,
  restInterval: 90,
};

const exerciseTemplates = [
  {
    id: 'tmpl-1',
    name: 'Supino reto',
    type: 'strength',
    sets: 3,
    repetitions: { min: 10, max: 12 },
    hasLoad: true,
    suggestedLoad: 80,
    restInterval: 60,
    prescriptionMode: 'reps',
  },
  {
    id: 'tmpl-2',
    name: 'Agachamento livre',
    type: 'strength',
    sets: 4,
    repetitions: { min: 8, max: 10 },
    hasLoad: true,
    suggestedLoad: 100,
    restInterval: 90,
    prescriptionMode: 'reps',
  },
];

const showToast = vi.fn();
const onClose = vi.fn();
const onCreated = vi.fn();

const renderSheet = (props = {}) =>
  render(
    <SubstituteComposerSheet
      open
      principal={principal}
      onClose={onClose}
      onCreated={onCreated}
      exerciseTemplates={exerciseTemplates}
      {...props}
    />
  );

describe('SubstituteComposerSheet', () => {
  beforeEach(() => {
    showToast.mockReset();
    onClose.mockReset();
    onCreated.mockReset();
    api.post.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast });
  });

  // ── Visibility ──────────────────────────────────────────────────────────────

  it('renders nothing when open is false', () => {
    const { container } = render(
      <SubstituteComposerSheet
        open={false}
        principal={principal}
        onClose={onClose}
        onCreated={onCreated}
        exerciseTemplates={exerciseTemplates}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  // ── Tabs ────────────────────────────────────────────────────────────────────

  it('renders both tabs', () => {
    renderSheet();
    expect(screen.getByRole('tab', { name: /criar substituto/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /da biblioteca/i })).toBeInTheDocument();
  });

  it('shows the create form by default', () => {
    renderSheet();
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Buscar exercício na biblioteca')).not.toBeInTheDocument();
  });

  it('switches to library tab and shows the search input', async () => {
    const user = userEvent.setup();
    renderSheet();
    await user.click(screen.getByRole('tab', { name: /da biblioteca/i }));
    expect(screen.getByLabelText('Buscar exercício na biblioteca')).toBeInTheDocument();
    expect(screen.queryByLabelText(/nome/i)).not.toBeInTheDocument();
  });

  it('switches back to create tab from library tab', async () => {
    const user = userEvent.setup();
    renderSheet();
    await user.click(screen.getByRole('tab', { name: /da biblioteca/i }));
    await user.click(screen.getByRole('tab', { name: /criar substituto/i }));
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
  });

  // ── Create tab ──────────────────────────────────────────────────────────────

  it('prefills prescription fields from the principal exercise', () => {
    renderSheet();
    expect(screen.getByLabelText('Séries')).toHaveValue(4);
    expect(screen.getByLabelText('Reps (mín)')).toHaveValue(8);
    expect(screen.getByLabelText('Reps (máx)')).toHaveValue(10);
    expect(screen.getByLabelText('Carga sugerida (kg)')).toHaveValue(60);
    expect(screen.getByLabelText('Descanso (s)')).toHaveValue(90);
  });

  it('shows a validation error when name is empty on submit', async () => {
    const user = userEvent.setup();
    renderSheet();
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome do exercício.');
    expect(api.post).not.toHaveBeenCalled();
  });

  it('posts to the substitutes endpoint and reports success', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({
      data: { id: 'sub-1', name: 'Cadeira extensora' },
    });
    renderSheet();

    await user.type(screen.getByLabelText(/Nome/i), 'Cadeira extensora');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/exercises/ex-1/substitutes',
        expect.objectContaining({
          name: 'Cadeira extensora',
          type: 'strength',
          sets: 4,
          repetitions: { min: 8, max: 10 },
          hasLoad: true,
          suggestedLoad: 60,
          restInterval: 90,
        })
      );
    });
    expect(onCreated).toHaveBeenCalledWith({ id: 'sub-1', name: 'Cadeira extensora' });
    expect(onClose).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Substituto'), 'success');
  });

  it('reports an error toast and stays open when the API rejects on create', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValueOnce({ userMessage: 'Substituto não permitido.' });
    renderSheet();

    await user.type(screen.getByLabelText(/Nome/i), 'Algo');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Substituto não permitido.', 'error');
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('closes when the cancel button is clicked on create tab', async () => {
    const user = userEvent.setup();
    renderSheet();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  // ── Library tab ─────────────────────────────────────────────────────────────

  it('shows library templates as selectable items', async () => {
    const user = userEvent.setup();
    renderSheet();
    await user.click(screen.getByRole('tab', { name: /da biblioteca/i }));
    expect(screen.getByText('Supino reto')).toBeInTheDocument();
    expect(screen.getByText('Agachamento livre')).toBeInTheDocument();
  });

  it('shows empty state when library is empty', async () => {
    const user = userEvent.setup();
    renderSheet({ exerciseTemplates: [] });
    await user.click(screen.getByRole('tab', { name: /da biblioteca/i }));
    expect(screen.getByText('Biblioteca vazia.')).toBeInTheDocument();
  });

  it('shows no-results message when search yields nothing', async () => {
    const user = userEvent.setup();
    renderSheet();
    await user.click(screen.getByRole('tab', { name: /da biblioteca/i }));
    await user.type(screen.getByLabelText('Buscar exercício na biblioteca'), 'zzznomatch');
    expect(screen.getByText('Nenhum exercício encontrado.')).toBeInTheDocument();
  });

  it('selects a template and enables the import button', async () => {
    const user = userEvent.setup();
    renderSheet();
    await user.click(screen.getByRole('tab', { name: /da biblioteca/i }));

    const importBtn = screen.getByRole('button', { name: /^importar$/i });
    expect(importBtn).toBeDisabled();

    // Click the library item button — identified by the template name text inside it
    await user.click(screen.getByText('Supino reto').closest('button'));
    expect(screen.getByRole('button', { name: /importar 1/i })).not.toBeDisabled();
  });

  it('imports a single template and calls onCreated + onClose', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValueOnce({ data: { id: 'sub-2', name: 'Supino reto' } });
    renderSheet();

    await user.click(screen.getByRole('tab', { name: /da biblioteca/i }));
    await user.click(screen.getByText('Supino reto').closest('button'));
    await user.click(screen.getByRole('button', { name: /importar 1/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledTimes(1);
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/exercises/ex-1/substitutes',
        expect.objectContaining({
          name: 'Supino reto',
          type: 'strength',
          sets: 3,
          repetitions: { min: 10, max: 12 },
          hasLoad: true,
          suggestedLoad: 80,
          restInterval: 60,
        })
      );
    });
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(onCreated).toHaveBeenCalledWith({ id: 'sub-2', name: 'Supino reto' });
    expect(onClose).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('1'), 'success');
  });

  it('imports multiple templates sequentially — N POSTs, N onCreated calls', async () => {
    const user = userEvent.setup();
    api.post
      .mockResolvedValueOnce({ data: { id: 'sub-2', name: 'Supino reto' } })
      .mockResolvedValueOnce({ data: { id: 'sub-3', name: 'Agachamento livre' } });
    renderSheet();

    await user.click(screen.getByRole('tab', { name: /da biblioteca/i }));
    await user.click(screen.getByText('Supino reto').closest('button'));
    await user.click(screen.getByText('Agachamento livre').closest('button'));
    await user.click(screen.getByRole('button', { name: /importar 2/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledTimes(2);
    });
    expect(onCreated).toHaveBeenCalledTimes(2);
    expect(onClose).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('2'), 'success');
  });

  it('shows error toast and keeps sheet open when import POST fails', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValueOnce({ userMessage: 'Erro ao importar.' });
    renderSheet();

    await user.click(screen.getByRole('tab', { name: /da biblioteca/i }));
    await user.click(screen.getByText('Supino reto').closest('button'));
    await user.click(screen.getByRole('button', { name: /importar 1/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Erro ao importar.', 'error');
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('closes when cancel is clicked on library tab', async () => {
    const user = userEvent.setup();
    renderSheet();
    await user.click(screen.getByRole('tab', { name: /da biblioteca/i }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
