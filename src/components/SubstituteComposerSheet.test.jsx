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

const principal = {
  id: 'ex-1',
  type: 'strength',
  sets: 4,
  repetitions: { min: 8, max: 10 },
  hasLoad: true,
  suggestedLoad: 60,
  restInterval: 90,
};

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

  it('renders nothing when open is false', () => {
    const { container } = render(
      <SubstituteComposerSheet
        open={false}
        principal={principal}
        onClose={onClose}
        onCreated={onCreated}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

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
    expect(showToast).toHaveBeenCalledWith('Substituto adicionado.', 'success');
  });

  it('reports an error toast and stays open when the API rejects', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValueOnce({
      userMessage: 'Substituto não permitido.',
    });
    renderSheet();

    await user.type(screen.getByLabelText(/Nome/i), 'Algo');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Substituto não permitido.', 'error');
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('closes when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderSheet();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
