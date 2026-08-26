import { render, screen, waitFor } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import ReplaceExerciseSheet from './ReplaceExerciseSheet';
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

const exercise = { id: 'ex-1', name: 'Supino reto' };

const exerciseTemplates = [
  { id: 'tmpl-1', name: 'Supino inclinado', type: 'strength' },
  { id: 'tmpl-2', name: 'Agachamento livre', type: 'strength' },
];

const showToast = vi.fn();
const onClose = vi.fn();
const onReplace = vi.fn();
const onReplaced = vi.fn();

const renderSheet = (props = {}) =>
  render(
    <ReplaceExerciseSheet
      open
      exercise={exercise}
      exerciseTemplates={exerciseTemplates}
      onClose={onClose}
      onReplace={onReplace}
      onReplaced={onReplaced}
      {...props}
    />
  );

describe('ReplaceExerciseSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue({ showToast });
    api.get.mockResolvedValue({ data: { data: [] } });
  });

  it('does not render when open is false', () => {
    renderSheet({ open: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the title and the exercise being replaced', () => {
    renderSheet();
    expect(screen.getByRole('dialog', { name: /Substituir exercício/i })).toBeInTheDocument();
    expect(screen.getByText(/Supino reto/)).toBeInTheDocument();
  });

  it('lists the library templates', () => {
    renderSheet();
    expect(screen.getByText('Supino inclinado')).toBeInTheDocument();
    expect(screen.getByText('Agachamento livre')).toBeInTheDocument();
  });

  it('disables the "Substituir" button until a template is selected', async () => {
    const user = userEvent.setup();
    renderSheet();

    const confirmBtn = screen.getByRole('button', { name: 'Substituir' });
    expect(confirmBtn).toBeDisabled();

    await user.click(screen.getByText('Supino inclinado'));
    expect(confirmBtn).not.toBeDisabled();
  });

  it('clicking the same template again clears the selection', async () => {
    const user = userEvent.setup();
    renderSheet();

    const item = screen.getByText('Supino inclinado').closest('button');
    await user.click(item);
    expect(screen.getByRole('button', { name: 'Substituir' })).not.toBeDisabled();

    await user.click(item);
    expect(screen.getByRole('button', { name: 'Substituir' })).toBeDisabled();
  });

  it('confirms by calling onReplace with the selected template id and object, then onReplaced', async () => {
    onReplace.mockResolvedValue({ id: 'new-ex' });
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByText('Agachamento livre'));
    await user.click(screen.getByRole('button', { name: 'Substituir' }));

    await waitFor(() => expect(onReplace).toHaveBeenCalledWith('tmpl-2', exerciseTemplates[1]));
    await waitFor(() => expect(onReplaced).toHaveBeenCalled());
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/substituíd/i), 'success');
  });

  it('shows an error toast (via userMessage) when onReplace fails, and keeps the sheet open', async () => {
    onReplace.mockRejectedValue({ userMessage: 'Não foi possível substituir.' });
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByText('Supino inclinado'));
    await user.click(screen.getByRole('button', { name: 'Substituir' }));

    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Não foi possível substituir.', 'error')
    );
    expect(onReplaced).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('disables interaction and shows "Carregando..." while saving', async () => {
    let resolvePromise;
    onReplace.mockReturnValue(new Promise((resolve) => { resolvePromise = resolve; }));
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByText('Supino inclinado'));
    await user.click(screen.getByRole('button', { name: 'Substituir' }));

    expect(screen.getByRole('button', { name: 'Carregando...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();

    resolvePromise({ id: 'new-ex' });
    await waitFor(() => expect(onReplaced).toHaveBeenCalled());
  });

  it('calls onClose when clicking Cancelar', async () => {
    const user = userEvent.setup();
    renderSheet();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking the close (X) button', async () => {
    const user = userEvent.setup();
    renderSheet();
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalled();
  });
});
