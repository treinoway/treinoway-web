import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import ExerciseTemplateEditor from './ExerciseTemplateEditor';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

const authState = vi.hoisted(() => ({ isAdmin: true }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

const exercise = {
  id: 7,
  name: 'Agachamento',
  type: 'strength',
  isPublic: false,
  videoUrl: 'https://www.youtube.com/watch?v=abc123XYZ',
};

const LocationProbe = () => {
  const { pathname } = useLocation();
  return <div data-testid="location">{pathname}</div>;
};

const renderEditor = (route) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/trainer/exercise-templates/new" element={<ExerciseTemplateEditor />} />
        <Route path="/trainer/exercise-templates/:id" element={<ExerciseTemplateEditor />} />
        <Route path="/trainer/exercise-templates" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );

describe('ExerciseTemplateEditor', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    authState.isAdmin = true;
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    api.post.mockReset();
    api.patch.mockReset();
    api.get.mockImplementation((url) => {
      if (url === '/trainer/exercise-templates/7') return Promise.resolve({ data: exercise });
      return Promise.resolve({ data: [] });
    });
  });

  describe('create mode', () => {
    it('renders the new-exercise title with a back button and no request', () => {
      renderEditor('/trainer/exercise-templates/new');

      expect(screen.getByRole('heading', { level: 1, name: 'Novo exercício' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Voltar' })).toBeInTheDocument();
      expect(api.get).not.toHaveBeenCalled();
    });

    it('reflects the typed name in the title', async () => {
      const user = userEvent.setup();
      renderEditor('/trainer/exercise-templates/new');

      await user.type(screen.getByLabelText(/nome/i), 'Remada');

      expect(screen.getByRole('heading', { level: 1, name: 'Remada' })).toBeInTheDocument();
    });

    it('creates the exercise and returns to the list', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: { id: 8, name: 'Remada' } });
      renderEditor('/trainer/exercise-templates/new');

      await user.type(screen.getByLabelText(/nome/i), 'Remada');
      await user.click(screen.getByRole('radio', { name: /força/i }));
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/trainer/exercise-templates',
          expect.objectContaining({ name: 'Remada', type: 'strength' }),
        );
      });
      expect(mockShowToast).toHaveBeenCalledWith('Exercício criado com sucesso!', 'success');
      expect(await screen.findByTestId('location')).toHaveTextContent('/trainer/exercise-templates');
    });

    it('validates the name before calling the API', async () => {
      const user = userEvent.setup();
      renderEditor('/trainer/exercise-templates/new');

      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      expect(screen.getByText('Informe o nome do exercício.')).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('stays on the page and shows an error toast when the API fails', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValue({ userMessage: 'Falha ao criar' });
      renderEditor('/trainer/exercise-templates/new');

      await user.type(screen.getByLabelText(/nome/i), 'Remada');
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Falha ao criar', 'error'));
      expect(screen.getByLabelText(/nome/i)).toHaveValue('Remada');
      expect(screen.queryByTestId('location')).not.toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    it('shows skeletons and no "not found" while the GET is pending', async () => {
      let resolveExercise;
      api.get.mockImplementation(() => new Promise((resolve) => { resolveExercise = resolve; }));
      renderEditor('/trainer/exercise-templates/7');

      expect(screen.getByRole('status', { name: 'Carregando exercício' })).toBeInTheDocument();
      expect(screen.queryByText('Exercício não encontrado')).not.toBeInTheDocument();

      resolveExercise({ data: exercise });

      expect(await screen.findByDisplayValue('Agachamento')).toBeInTheDocument();
      // The title follows the form's name via onNameChange (set in an effect), so it lands one render later.
      expect(await screen.findByRole('heading', { level: 1, name: 'Agachamento' })).toBeInTheDocument();
    });

    it('loads the exercise, saves with PATCH and returns to the list', async () => {
      const user = userEvent.setup();
      api.patch.mockResolvedValue({ data: exercise });
      renderEditor('/trainer/exercise-templates/7');

      await user.clear(await screen.findByDisplayValue('Agachamento'));
      await user.type(screen.getByLabelText(/nome/i), 'Agachamento livre');
      await user.click(screen.getByRole('button', { name: /^salvar$/i }));

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith(
          '/trainer/exercise-templates/7',
          expect.objectContaining({ name: 'Agachamento livre' }),
        );
      });
      expect(mockShowToast).toHaveBeenCalledWith('Exercício atualizado com sucesso!', 'success');
      expect(await screen.findByTestId('location')).toHaveTextContent('/trainer/exercise-templates');
    });

    it('shows a not-found block with a way back on 404', async () => {
      const user = userEvent.setup();
      api.get.mockRejectedValue({ response: { status: 404 } });
      renderEditor('/trainer/exercise-templates/7');

      expect(await screen.findByRole('heading', { name: 'Exercício não encontrado' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Voltar para exercícios' }));

      expect(await screen.findByTestId('location')).toHaveTextContent('/trainer/exercise-templates');
    });

    it('shows an alert with retry when the GET fails', async () => {
      const user = userEvent.setup();
      api.get.mockRejectedValueOnce({ userMessage: 'Falha ao carregar' });
      renderEditor('/trainer/exercise-templates/7');

      expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao carregar');
      await user.click(screen.getByRole('button', { name: /tentar novamente/i }));

      expect(await screen.findByDisplayValue('Agachamento')).toBeInTheDocument();
    });
  });

  describe('leaving the page', () => {
    it('leaves immediately on Cancelar when nothing changed', async () => {
      const user = userEvent.setup();
      renderEditor('/trainer/exercise-templates/new');

      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      expect(await screen.findByTestId('location')).toHaveTextContent('/trainer/exercise-templates');
    });

    it('asks before discarding and keeps the form when the user cancels', async () => {
      const user = userEvent.setup();
      renderEditor('/trainer/exercise-templates/new');
      await user.type(screen.getByLabelText(/nome/i), 'Remada');

      await user.click(screen.getByRole('button', { name: 'Voltar' }));
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAccessibleName(/descartar alterações\?/i);
      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(screen.getByLabelText(/nome/i)).toHaveValue('Remada');
    });

    it('discards the changes and leaves when the user confirms', async () => {
      const user = userEvent.setup();
      renderEditor('/trainer/exercise-templates/7');
      await user.type(await screen.findByDisplayValue('Agachamento'), ' x');

      await user.click(screen.getByRole('button', { name: 'Cancelar' }));
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar' }));

      expect(await screen.findByTestId('location')).toHaveTextContent('/trainer/exercise-templates');
      expect(api.patch).not.toHaveBeenCalled();
    });
  });

  describe('admin-only controls', () => {
    it('shows visibility to admins', async () => {
      renderEditor('/trainer/exercise-templates/new');

      expect(await screen.findByRole('switch', { name: /tornar este modelo público/i })).toBeInTheDocument();
    });

    it('hides visibility from non-admins and omits isPublic on create', async () => {
      const user = userEvent.setup();
      authState.isAdmin = false;
      api.post.mockResolvedValue({ data: { id: 1 } });
      renderEditor('/trainer/exercise-templates/new');

      await user.type(await screen.findByLabelText(/nome/i), 'Remada');
      expect(screen.queryByRole('switch', { name: /tornar este modelo público/i })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /^salvar$/i }));
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/trainer/exercise-templates',
          expect.not.objectContaining({ isPublic: expect.anything() }),
        );
      });
    });
  });
});
