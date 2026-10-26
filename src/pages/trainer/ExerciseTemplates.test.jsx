import { render, screen, waitFor, act, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ExerciseTemplates from './ExerciseTemplates';
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

const LocationProbe = () => {
  const { pathname } = useLocation();
  return <div data-testid="location">{pathname}</div>;
};

const renderWithRouter = (ui) =>
  render(
    <MemoryRouter initialEntries={['/trainer/exercise-templates']}>
      <Routes>
        <Route path="/trainer/exercise-templates" element={ui} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );

// Library templates are identity-only: no prescription fields.
const mockTemplates = [
  { id: 1, name: 'Agachamento', type: 'strength', isPublic: false },
  { id: 2, name: 'Corrida', type: 'cardio', isPublic: true },
  { id: 3, name: 'Rosca Direta', type: 'strength', isPublic: false, videoUrl: 'https://www.youtube.com/watch?v=abc123XYZ' },
];

// Build a backend-style pagination envelope for the list endpoint.
const envelope = (data, total = data.length, page = 1, limit = 20) => ({
  data: { data, total, page, limit },
});

describe('ExerciseTemplates', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    authState.isAdmin = true;
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockResolvedValue(envelope(mockTemplates));
    api.post.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();
  });

  it('renders the page title', () => {
    renderWithRouter(<ExerciseTemplates />);

    expect(screen.getByText('Exercícios')).toBeInTheDocument();
  });

  it('fetches and displays templates on mount', async () => {
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Agachamento')).toBeInTheDocument();
      expect(screen.getByText('Corrida')).toBeInTheDocument();
    });
  });

  it('shows "Público" badge for public templates', async () => {
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Público')).toBeInTheDocument();
    });
  });

  it('shows the empty block with the explanation folded into the description', async () => {
    api.get.mockResolvedValue(envelope([]));

    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sem exercícios ainda' })).toBeInTheDocument();
      expect(screen.getByText(/um exercício é um movimento reutilizável/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /novo exercício/i })).not.toBeInTheDocument();
  });

  it('shows CTA button in empty state that navigates to the create page', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(envelope([]));

    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sem exercícios ainda' })).toBeInTheDocument();
    });

    const ctaButton = screen.getByRole('button', { name: /criar primeiro exercício/i });
    expect(ctaButton).toBeInTheDocument();

    await user.click(ctaButton);

    expect(screen.getByTestId('location')).toHaveTextContent('/trainer/exercise-templates/new');
  });

  it('shows loading before GET resolves', async () => {
    let resolveTemplates;
    const templatesPromise = new Promise((resolve) => {
      resolveTemplates = resolve;
    });

    api.get.mockImplementation((url) => {
      if (url === '/trainer/exercise-templates') return templatesPromise;
      return Promise.resolve({ data: [] });
    });

    renderWithRouter(<ExerciseTemplates />);

    expect(screen.getByText('Carregando...')).toBeInTheDocument();

    resolveTemplates(envelope([]));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sem exercícios ainda' })).toBeInTheDocument();
    });
  });

  it('keeps search input mounted across a refetch — full-screen loader does not reappear', async () => {
    const user = userEvent.setup();

    // First call resolves normally (initial load)
    let resolveSecond;
    const secondFetch = new Promise((resolve) => { resolveSecond = resolve; });
    let callCount = 0;

    api.get.mockImplementation((url) => {
      if (url === '/trainer/exercise-templates') {
        callCount += 1;
        if (callCount === 1) return Promise.resolve(envelope(mockTemplates));
        return secondFetch;
      }
      return Promise.resolve({ data: [] });
    });

    renderWithRouter(<ExerciseTemplates />);

    // Wait for initial load to complete
    await waitFor(() => screen.getByText('Agachamento'));

    // The search input should now be in the document
    const searchInput = screen.getByLabelText(/buscar exerc/i);
    expect(searchInput).toBeInTheDocument();

    // Type a character — triggers a debounced refetch
    await user.type(searchInput, 'A');

    // The full-screen loader must NOT appear during the refetch
    expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();

    // The search input must still be in the document with the typed value
    expect(screen.getByLabelText(/buscar exerc/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/buscar exerc/i)).toHaveValue('A');

    // Resolve the second fetch
    resolveSecond(envelope(mockTemplates));

    await waitFor(() => {
      expect(screen.queryByText('Buscando…')).not.toBeInTheDocument();
    });
  });


  it('shows custom confirm dialog and calls DELETE on confirmation', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});

    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));

    const menuTrigger = screen.getByRole('button', { name: /ações do modelo agachamento/i });
    await user.click(menuTrigger);
    await user.click(screen.getByText('Excluir'));
    await waitFor(() => screen.getByRole('alertdialog'));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /excluir/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/exercise-templates/1');
      expect(mockShowToast).toHaveBeenCalledWith('Exercício excluído com sucesso!', 'success');
    });
  });

  it('does not delete when custom dialog confirmation is cancelled', async () => {
    const user = userEvent.setup();

    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));

    const menuTrigger = screen.getByRole('button', { name: /ações do modelo agachamento/i });
    await user.click(menuTrigger);
    await user.click(screen.getByText('Excluir'));
    await waitFor(() => screen.getByRole('button', { name: /cancelar/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(api.delete).not.toHaveBeenCalled();
  });

  it('renders the unified list (no view toggle buttons)', async () => {
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));

    expect(screen.queryByRole('button', { name: /visualização em cards/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /visualização em lista/i })).not.toBeInTheDocument();
  });

  it('displays all templates as list rows', async () => {
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Agachamento')).toBeInTheDocument();
      expect(screen.getByText('Corrida')).toBeInTheDocument();
      expect(screen.getByText('Rosca Direta')).toBeInTheDocument();
    });
  });

  it('shows Vídeo badge for template with a valid YouTube URL', async () => {
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Rosca Direta'));

    expect(screen.getByText('Vídeo')).toBeInTheDocument();
  });

  it('shows a GIF badge for a template with gifUrl and no video', async () => {
    api.get.mockResolvedValue(envelope([
      { id: 4, name: 'Remada Curvada', type: 'strength', isPublic: false, videoUrl: null, gifUrl: 'https://media.example.com/remada.gif' },
    ]));
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Remada Curvada'));

    expect(screen.getByText('GIF')).toBeInTheDocument();
    expect(screen.queryByText('Vídeo')).not.toBeInTheDocument();
  });

  it('does not show the GIF badge for templates without a gifUrl', async () => {
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));

    expect(screen.queryByText('GIF')).not.toBeInTheDocument();
  });

  it('does not show Vídeo badge for templates without a videoUrl', async () => {
    renderWithRouter(<ExerciseTemplates />);

    await waitFor(() => screen.getByText('Agachamento'));

    // Only Rosca Direta has a video — expect exactly one badge
    expect(screen.getAllByText('Vídeo').length).toBe(1);
  });


  describe('Server-driven list (pagination, search, filters, batch delete)', () => {
    it('renders rows from the pagination envelope (res.data.data)', async () => {
      renderWithRouter(<ExerciseTemplates />);

      await waitFor(() => {
        expect(screen.getByText('Agachamento')).toBeInTheDocument();
        expect(screen.getByText('Corrida')).toBeInTheDocument();
      });
    });

    it('sends params.q to the API after debounced search', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ExerciseTemplates />);

      await waitFor(() => screen.getByText('Agachamento'));

      await user.type(screen.getByLabelText(/buscar exerc/i), 'Agacha');

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/trainer/exercise-templates',
          expect.objectContaining({ params: expect.objectContaining({ q: 'Agacha' }) }),
        );
      });
    });

    it('sends the lowercase type value and resets page on filter tab click', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ExerciseTemplates />);

      await waitFor(() => screen.getByText('Agachamento'));

      await user.click(screen.getByRole('tab', { name: /^força$/i }));

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/trainer/exercise-templates',
          expect.objectContaining({ params: expect.objectContaining({ type: 'strength', page: 1 }) }),
        );
      });
    });

    it('shows the footer summary and appends the next page on "Ver mais"', async () => {
      const user = userEvent.setup();
      api.get.mockImplementation((url, config) => {
        if (config?.params?.page === 2) {
          return Promise.resolve(envelope([{ id: 4, name: 'Remada Curvada', type: 'strength' }], 4, 2));
        }
        return Promise.resolve(envelope(mockTemplates, 4));
      });
      renderWithRouter(<ExerciseTemplates />);

      await waitFor(() => screen.getByText('Agachamento'));
      expect(screen.getByText('Mostrando 3 de 4 exercícios')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /ver mais/i }));

      expect(await screen.findByText('Remada Curvada')).toBeInTheDocument();
      expect(screen.getByText('Agachamento')).toBeInTheDocument();
      expect(api.get).toHaveBeenCalledWith(
        '/trainer/exercise-templates',
        expect.objectContaining({ params: expect.objectContaining({ page: 2 }) }),
      );
      expect(screen.getByText('Mostrando 4 de 4 exercícios')).toBeInTheDocument();
    });

    it('shows an alert with retry when the initial fetch fails', async () => {
      const user = userEvent.setup();
      api.get.mockRejectedValueOnce({ userMessage: 'Falha ao carregar' });
      renderWithRouter(<ExerciseTemplates />);

      expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao carregar');
      await user.click(screen.getByRole('button', { name: /tentar novamente/i }));

      expect(await screen.findByText('Agachamento')).toBeInTheDocument();
    });

    it('shows the no-results block when a search matches nothing', async () => {
      const user = userEvent.setup();
      api.get.mockImplementation((url, config) =>
        Promise.resolve(config?.params?.q ? envelope([], 0) : envelope(mockTemplates)));
      renderWithRouter(<ExerciseTemplates />);

      await waitFor(() => screen.getByText('Agachamento'));
      await user.type(screen.getByRole('textbox', { name: /buscar exercícios/i }), 'zzz');

      expect(await screen.findByRole('heading', { name: 'Sem resultados' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /buscar exercícios/i })).toBeInTheDocument();
    });

    it('selects a row and batch-deletes the selection', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: { deletedCount: 1 } });
      renderWithRouter(<ExerciseTemplates />);

      await waitFor(() => screen.getByText('Agachamento'));

      await user.click(screen.getByRole('checkbox', { name: /selecionar agachamento/i }));

      const batchButton = screen.getByRole('button', { name: /excluir selecionados/i });
      expect(batchButton).toBeInTheDocument();

      await user.click(batchButton);
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /excluir/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/trainer/exercise-templates/batch-delete', { ids: [1] });
        expect(mockShowToast).toHaveBeenCalledWith('1 itens excluídos.', 'success');
      });
    });

    it('select-all toggles every row checkbox on the current page', async () => {
      const user = userEvent.setup();
      renderWithRouter(<ExerciseTemplates />);

      await waitFor(() => screen.getByText('Agachamento'));

      await user.click(screen.getByRole('button', { name: /selecionar todos/i }));

      expect(screen.getByRole('checkbox', { name: /selecionar agachamento/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /selecionar corrida/i })).toBeChecked();
      expect(screen.getByRole('button', { name: /limpar seleção/i })).toBeInTheDocument();
    });
  });

  describe('Delayed refetch indicator', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('refetch indicator does not appear when fetch resolves before 250 ms threshold', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });

      let callCount = 0;
      api.get.mockImplementation(() => {
        callCount += 1;
        // Both initial and refetch resolve immediately
        return Promise.resolve(envelope(mockTemplates));
      });

      renderWithRouter(<ExerciseTemplates />);
      await waitFor(() => screen.getByText('Agachamento'));

      // Type to trigger a debounced refetch
      await user.type(screen.getByLabelText(/buscar exerc/i), 'A');

      // Advance past debounce (300 ms) — fetch fires and resolves instantly
      act(() => { vi.advanceTimersByTime(350); });

      // Flush promises
      await waitFor(() => expect(callCount).toBeGreaterThan(1));

      // The spinner must never have appeared (delay = 250 ms, but fetch resolved before that)
      expect(document.querySelector('.library-refetch-indicator')).toBeNull();
    });

    it('refetch indicator appears after 250 ms when fetch is still in flight', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime.bind(vi) });

      let resolveSecond;
      let callCount = 0;
      api.get.mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) return Promise.resolve(envelope(mockTemplates));
        return new Promise((resolve) => { resolveSecond = resolve; });
      });

      renderWithRouter(<ExerciseTemplates />);
      await waitFor(() => screen.getByText('Agachamento'));

      await user.type(screen.getByLabelText(/buscar exerc/i), 'slow');

      // Advance past debounce (300 ms) + spinner delay (250 ms).
      await act(async () => { vi.advanceTimersByTime(600); });

      // waitFor lets React settle after the timer-triggered state updates
      await waitFor(() => {
        expect(document.querySelector('.library-refetch-indicator')).not.toBeNull();
      });

      // Resolve and confirm it disappears
      resolveSecond(envelope(mockTemplates));
      await waitFor(() => {
        expect(document.querySelector('.library-refetch-indicator')).toBeNull();
      });
    });
  });

  describe('public items (admin-only deletion)', () => {
    it('lets a non-admin open a public row but offers no menu, and disables its checkbox', async () => {
      authState.isAdmin = false;
      renderWithRouter(<ExerciseTemplates />);
      await waitFor(() => screen.getByText('Corrida'));

      expect(screen.queryByRole('button', { name: /ações do modelo corrida/i })).not.toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /selecionar corrida/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /ações do modelo agachamento/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /selecionar agachamento/i })).toBeEnabled();
    });

    it('select-all skips public rows for a non-admin and batch-deletes only the others', async () => {
      const user = userEvent.setup();
      authState.isAdmin = false;
      api.post.mockResolvedValue({ data: { deletedCount: 1 } });
      renderWithRouter(<ExerciseTemplates />);
      await waitFor(() => screen.getByText('Agachamento'));

      await user.click(screen.getByRole('button', { name: /selecionar todos/i }));
      expect(screen.getByRole('checkbox', { name: /selecionar agachamento/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /selecionar corrida/i })).not.toBeChecked();

      await user.click(screen.getByRole('button', { name: /excluir selecionados/i }));
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /excluir/i }));
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(expect.stringMatching(/batch-delete$/), { ids: [1, 3] });
      });
    });

    it('lets an admin delete a public row', async () => {
      const user = userEvent.setup();
      api.delete.mockResolvedValue({});
      renderWithRouter(<ExerciseTemplates />);
      await waitFor(() => screen.getByText('Corrida'));

      expect(screen.getByRole('checkbox', { name: /selecionar corrida/i })).toBeEnabled();
      await user.click(screen.getByRole('button', { name: /ações do modelo corrida/i }));
      await user.click(screen.getByText('Excluir'));
      await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /excluir/i }));
      await waitFor(() => expect(api.delete).toHaveBeenCalledWith(expect.stringMatching(/\/2$/)));
    });
  });
});
