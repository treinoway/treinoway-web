import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import TrainingTemplates from './TrainingTemplates';
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

const LocationProbe = () => {
  const { pathname } = useLocation();
  return <div data-testid="location">{pathname}</div>;
};

const renderWithRouter = (ui) =>
  render(
    <MemoryRouter initialEntries={['/trainer/training-templates']}>
      <Routes>
        <Route path="/trainer/training-templates" element={ui} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );

const mockShowToast = vi.fn();

const mockTemplates = [
  { id: 1, name: 'Treino A', description: 'Descrição do treino A', isPublic: false, category: 'strength', bodySegment: 'upper' },
  { id: 2, name: 'Treino B', description: 'Descrição do treino B', isPublic: true, category: 'cardio', bodySegment: 'lower' },
];

// Build a backend-style pagination envelope for list endpoints.
const envelope = (data, total = data.length, page = 1, limit = 20) => ({
  data: { data, total, page, limit },
});

const exerciseTemplatesEnvelope = envelope([
  { id: 20, name: 'Supino Reto' },
  { id: 21, name: 'Corrida' },
  { id: 99, name: 'Novo Exercício' },
]);

describe('TrainingTemplates', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    authState.isAdmin = true;
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockImplementation((url) => {
      if (url === '/trainer/training-templates') return Promise.resolve(envelope(mockTemplates));
      if (typeof url === 'string' && url.startsWith('/trainer/training-templates/')) {
        const id = url.replace('/trainer/training-templates/', '');
        const template = mockTemplates.find((t) => String(t.id) === String(id));
        // Single-resource GET is NOT paginated — return the bare record.
        return Promise.resolve({ data: template || mockTemplates[0] });
      }
      if (url === '/trainer/exercise-templates') return Promise.resolve(exerciseTemplatesEnvelope);
      return Promise.resolve({ data: [] });
    });
    api.post.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();
  });

  it('renders the page title', () => {
    renderWithRouter(<TrainingTemplates />);

    expect(screen.getByText('Treinos únicos')).toBeInTheDocument();
  });

  it('fetches and displays templates on mount', async () => {
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Treino A')).toBeInTheDocument();
      expect(screen.getByText('Treino B')).toBeInTheDocument();
    });
  });

  it('shows "Público" badge for public templates', async () => {
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Público')).toBeInTheDocument();
    });
  });

  it('shows the empty block with the explanation folded into the description', async () => {
    api.get.mockResolvedValue(envelope([]));

    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sem treinos únicos ainda' })).toBeInTheDocument();
      expect(screen.getByText(/um treino único é uma ficha pré-configurada/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /novo treino único/i })).not.toBeInTheDocument();
  });

  it('empty state CTA navigates to the create page', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(envelope([]));

    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByRole('heading', { name: 'Sem treinos únicos ainda' }));

    await user.click(screen.getByRole('button', { name: /criar primeiro treino único/i }));

    expect(screen.getByTestId('location')).toHaveTextContent('/trainer/training-templates/new');
  });

  it('does not show the empty block when templates exist', async () => {
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));

    expect(screen.queryByRole('heading', { name: 'Sem treinos únicos ainda' })).not.toBeInTheDocument();
  });

  it('shows loading and avoids empty-state flash before GET resolves', async () => {
    let resolveTemplates;
    const templatesPromise = new Promise((resolve) => {
      resolveTemplates = resolve;
    });

    api.get.mockImplementation((url) => {
      if (url === '/trainer/training-templates') return templatesPromise;
      return Promise.resolve({ data: [] });
    });

    renderWithRouter(<TrainingTemplates />);

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sem treinos únicos ainda' })).not.toBeInTheDocument();

    resolveTemplates(envelope([]));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sem treinos únicos ainda' })).toBeInTheDocument();
    });
  });


  it('header button navigates to the create page', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));
    await user.click(screen.getByRole('button', { name: /novo treino único/i }));

    expect(screen.getByTestId('location')).toHaveTextContent('/trainer/training-templates/new');
  });

  it('clicking a row opens the edit page of that template', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));
    await user.click(screen.getByRole('button', { name: /abrir treino único treino a/i }));

    expect(screen.getByTestId('location')).toHaveTextContent('/trainer/training-templates/1');
  });

  it('row menu "Editar" opens the same edit page', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino B'));
    await user.click(screen.getByRole('button', { name: /ações do modelo treino b/i }));
    await user.click(screen.getByText('Editar'));

    expect(screen.getByTestId('location')).toHaveTextContent('/trainer/training-templates/2');
  });

  it('does not fetch the exercise picker source or render an inline form', async () => {
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));

    expect(api.get).not.toHaveBeenCalledWith('/trainer/exercise-templates', expect.anything());
    expect(screen.queryByRole('textbox', { name: /^nome$/i })).not.toBeInTheDocument();
  });

  it('shows custom confirm dialog and calls DELETE on confirmation', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});

    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));

    const menuTrigger = screen.getByRole('button', { name: /ações do modelo treino a/i });
    await user.click(menuTrigger);
    await user.click(screen.getByText('Excluir'));
    await waitFor(() => screen.getByRole('alertdialog'));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /excluir/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/training-templates/1');
      expect(mockShowToast).toHaveBeenCalledWith('Treino único excluído com sucesso!', 'success');
    });
  });


  it('does not delete when custom dialog confirmation is cancelled', async () => {
    const user = userEvent.setup();

    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));

    const menuTrigger = screen.getByRole('button', { name: /ações do modelo treino a/i });
    await user.click(menuTrigger);
    await user.click(screen.getByText('Excluir'));
    await waitFor(() => screen.getByRole('button', { name: /cancelar/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(api.delete).not.toHaveBeenCalled();
  });

  it('renders the unified list with no view toggle buttons', async () => {
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => screen.getByText('Treino A'));

    expect(screen.queryByRole('button', { name: /visualização em cards/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /visualização em lista/i })).not.toBeInTheDocument();
  });

  it('displays all templates as list rows after loading', async () => {
    renderWithRouter(<TrainingTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Treino A')).toBeInTheDocument();
      expect(screen.getByText('Treino B')).toBeInTheDocument();
    });
    // No table element — unified rich-list does not use <table>
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });


  describe('Server-driven list (pagination, search, filters, batch delete)', () => {
    it('renders rows from the pagination envelope (res.data.data)', async () => {
      renderWithRouter(<TrainingTemplates />);

      await waitFor(() => {
        expect(screen.getByText('Treino A')).toBeInTheDocument();
        expect(screen.getByText('Treino B')).toBeInTheDocument();
      });
    });

    it('sends params.q to the API after debounced search', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TrainingTemplates />);

      await waitFor(() => screen.getByText('Treino A'));

      await user.type(screen.getByLabelText(/buscar treino/i), 'Treino A');

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/trainer/training-templates',
          expect.objectContaining({ params: expect.objectContaining({ q: 'Treino A' }) }),
        );
      });
    });

    it('sends the lowercase category value and resets page on filter tab click', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TrainingTemplates />);

      await waitFor(() => screen.getByText('Treino A'));

      await user.click(screen.getByRole('tab', { name: /^força$/i }));

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(
          '/trainer/training-templates',
          expect.objectContaining({ params: expect.objectContaining({ category: 'strength', page: 1 }) }),
        );
      });
    });

    it('shows the footer summary and appends the next page on "Ver mais"', async () => {
      const user = userEvent.setup();
      api.get.mockImplementation((url, config) => {
        if (url === '/trainer/exercise-templates') return Promise.resolve(exerciseTemplatesEnvelope);
        if (url !== '/trainer/training-templates') return Promise.resolve({ data: [] });
        if (config?.params?.page === 2) {
          return Promise.resolve(envelope([{ id: 7, name: 'Treino Extra', isPublic: false }], 3, 2));
        }
        return Promise.resolve(envelope(mockTemplates, 3));
      });
      renderWithRouter(<TrainingTemplates />);

      await waitFor(() => screen.getByText('Treino A'));
      expect(screen.getByText(/mostrando 2 de 3 treinos únicos/i)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /ver mais/i }));

      expect(await screen.findByText('Treino Extra')).toBeInTheDocument();
      expect(screen.getByText('Treino A')).toBeInTheDocument();
      expect(api.get).toHaveBeenCalledWith(
        '/trainer/training-templates',
        expect.objectContaining({ params: expect.objectContaining({ page: 2 }) }),
      );
    });

    it('shows an alert with retry when the initial fetch fails', async () => {
      const user = userEvent.setup();
      let templateCalls = 0;
      api.get.mockImplementation((url) => {
        if (url === '/trainer/training-templates') {
          templateCalls += 1;
          return templateCalls === 1
            ? Promise.reject({ userMessage: 'Falha ao carregar' })
            : Promise.resolve(envelope(mockTemplates));
        }
        if (url === '/trainer/exercise-templates') return Promise.resolve(exerciseTemplatesEnvelope);
        return Promise.resolve({ data: [] });
      });
      renderWithRouter(<TrainingTemplates />);

      expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao carregar');
      await user.click(screen.getByRole('button', { name: /tentar novamente/i }));

      expect(await screen.findByText('Treino A')).toBeInTheDocument();
    });

    it('selects a row and batch-deletes the selection', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: { deletedCount: 1 } });
      renderWithRouter(<TrainingTemplates />);

      await waitFor(() => screen.getByText('Treino A'));

      await user.click(screen.getByRole('checkbox', { name: /selecionar treino a/i }));

      const batchButton = screen.getByRole('button', { name: /excluir selecionados/i });
      expect(batchButton).toBeInTheDocument();

      await user.click(batchButton);
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /excluir/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/trainer/training-templates/batch-delete', { ids: [1] });
        expect(mockShowToast).toHaveBeenCalledWith('1 itens excluídos.', 'success');
      });
    });

    it('select-all toggles every row checkbox on the current page', async () => {
      const user = userEvent.setup();
      renderWithRouter(<TrainingTemplates />);

      await waitFor(() => screen.getByText('Treino A'));

      await user.click(screen.getByRole('button', { name: /selecionar todos/i }));

      expect(screen.getByRole('checkbox', { name: /selecionar treino a/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /selecionar treino b/i })).toBeChecked();
      expect(screen.getByRole('button', { name: /limpar seleção/i })).toBeInTheDocument();
    });
  });

  describe('public items (admin-only deletion)', () => {
    it('lets a non-admin open a public row but offers no menu, and disables its checkbox', async () => {
      authState.isAdmin = false;
      renderWithRouter(<TrainingTemplates />);
      await waitFor(() => screen.getByText('Treino B'));

      expect(screen.queryByRole('button', { name: /ações do modelo treino b/i })).not.toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /selecionar treino b/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /ações do modelo treino a/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /selecionar treino a/i })).toBeEnabled();
    });

    it('select-all skips public rows for a non-admin and batch-deletes only the others', async () => {
      const user = userEvent.setup();
      authState.isAdmin = false;
      api.post.mockResolvedValue({ data: { deletedCount: 1 } });
      renderWithRouter(<TrainingTemplates />);
      await waitFor(() => screen.getByText('Treino A'));

      await user.click(screen.getByRole('button', { name: /selecionar todos/i }));
      expect(screen.getByRole('checkbox', { name: /selecionar treino a/i })).toBeChecked();
      expect(screen.getByRole('checkbox', { name: /selecionar treino b/i })).not.toBeChecked();

      await user.click(screen.getByRole('button', { name: /excluir selecionados/i }));
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /excluir/i }));
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(expect.stringMatching(/batch-delete$/), { ids: [1] });
      });
    });

    it('lets an admin delete a public row', async () => {
      const user = userEvent.setup();
      api.delete.mockResolvedValue({});
      renderWithRouter(<TrainingTemplates />);
      await waitFor(() => screen.getByText('Treino B'));

      expect(screen.getByRole('checkbox', { name: /selecionar treino b/i })).toBeEnabled();
      await user.click(screen.getByRole('button', { name: /ações do modelo treino b/i }));
      await user.click(screen.getByText('Excluir'));
      await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: /excluir/i }));
      await waitFor(() => expect(api.delete).toHaveBeenCalledWith(expect.stringMatching(/\/2$/)));
    });
  });
});
