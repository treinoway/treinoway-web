import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import ProtocolTemplates from './ProtocolTemplates';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import { ROUTINE_DRAFT_KEY, ROUTINE_DRAFT_VERSION } from '../../utils/routineDraft';

// Mock cleanupDraftResources so tests control its outcome without real API calls.
// The module is also used for getRoutineDraft/clearRoutineDraft — keep those real.
vi.mock('../../utils/routineDraft', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    cleanupDraftResources: vi.fn().mockResolvedValue({ successCount: 0, failureCount: 0, errors: [] }),
  };
});

import { cleanupDraftResources } from '../../utils/routineDraft';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockTemplates = [
  {
    id: 1,
    name: 'Modelo Força',
    description: 'Protocolo de força',
    defaultDurationWeeks: 12,
    trainingLevel: 'intermediate',
    type: 'strength',
    scheduleTemplatesCount: 3,
  },
  {
    id: 2,
    name: 'Modelo Cardio',
    description: 'Protocolo de cardio',
    defaultDurationWeeks: 8,
    trainingLevel: 'beginner',
    type: 'cardio',
    scheduleTemplatesCount: 0,
  },
];

// Build a backend-style pagination envelope for the list endpoint.
const envelope = (data, total = data.length, page = 1, limit = 20) => ({
  data: { data, total, page, limit },
});

const makeDraft = (overrides = {}) =>
  JSON.stringify({
    version: ROUTINE_DRAFT_VERSION,
    savedAt: new Date(Date.now() - 2 * 60000).toISOString(), // 2 min ago
    data: {
      name: 'Rotina Teste',
      meta: { type: 'strength' },
      trainingIds: ['t1', 't2', 't3'],
      createdTrainingIds: [],
      junctionsAddedToImported: [],
    },
    ...overrides,
  });

describe('ProtocolTemplates', () => {
  beforeEach(() => {
    localStorage.clear();
    mockShowToast.mockReset();
    mockNavigate.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocol-templates') return Promise.resolve(envelope(mockTemplates));
      return Promise.resolve({ data: [] });
    });
    api.post.mockReset();
    api.delete.mockReset();
    vi.mocked(cleanupDraftResources).mockClear();
    vi.mocked(cleanupDraftResources).mockResolvedValue({ successCount: 0, failureCount: 0, errors: [] });
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ── Loading state ──────────────────────────────────────────────────────────
  it('shows loading state initially', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderWithRouter(<ProtocolTemplates />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  // ── Page structure ─────────────────────────────────────────────────────────
  it('renders the page title after loading', async () => {
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Rotinas' })).toBeInTheDocument();
    });
  });

  it('renders no eyebrow above the title', async () => {
    renderWithRouter(<ProtocolTemplates />);
    await screen.findByText('Modelo Força');
    expect(screen.getAllByText(/^rotinas$/i)).toHaveLength(1);
  });

  it('renders the search input', async () => {
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /buscar rotina/i })).toBeInTheDocument();
    });
  });

  // ── Template list ──────────────────────────────────────────────────────────
  it('displays templates after loading', async () => {
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
      expect(screen.getByText('Modelo Cardio')).toBeInTheDocument();
    });
  });

  it('shows an alert with retry when the initial fetch fails, and recovers on retry', async () => {
    const user = userEvent.setup();
    api.get.mockRejectedValueOnce({ userMessage: 'Falha ao carregar rotinas' });
    renderWithRouter(<ProtocolTemplates />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao carregar rotinas');
    expect(screen.getByRole('heading', { name: /não foi possível carregar as rotinas/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /nova rotina/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));

    expect(await screen.findByText('Modelo Força')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the count on the active filter tab and the footer summary', async () => {
    renderWithRouter(<ProtocolTemplates />);
    expect(await screen.findByRole('tab', { name: /todos \(2\)/i })).toBeInTheDocument();
    expect(screen.getByText('Mostrando 2 de 2 rotinas')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ver mais/i })).not.toBeInTheDocument();
  });

  // ── Server-side type filter tabs ───────────────────────────────────────────
  it('renders server-side type filter tabs (Todos + protocol types)', async () => {
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /todos/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /^força$/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /^cardio$/i })).toBeInTheDocument();
    });
  });

  it('sends the lowercase type value and resets page on filter tab click', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));

    await user.click(screen.getByRole('tab', { name: /^força$/i }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/trainer/protocol-templates',
        expect.objectContaining({ params: expect.objectContaining({ type: 'strength', page: 1 }) }),
      );
    });
  });

  it('sends the lowercase trainingLevel value when the level select changes', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));

    await user.click(screen.getByRole('combobox', { name: /filtrar por nível/i }));
    await user.click(screen.getByRole('option', { name: 'Iniciante' }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/trainer/protocol-templates',
        expect.objectContaining({ params: expect.objectContaining({ trainingLevel: 'beginner', page: 1 }) }),
      );
    });
  });

  // ── Search ─────────────────────────────────────────────────────────────────
  it('sends params.q to the API after debounced search', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });

    await user.type(screen.getByRole('textbox', { name: /buscar rotina/i }), 'Força');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/trainer/protocol-templates',
        expect.objectContaining({ params: expect.objectContaining({ q: 'Força' }) }),
      );
    });
  });

  it('shows no-results empty state when the filtered page is empty', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((url, config) => {
      if (url !== '/trainer/protocol-templates') return Promise.resolve({ data: [] });
      // A search query returns an empty page; the unfiltered load returns templates.
      const hasQuery = !!config?.params?.q;
      return Promise.resolve(hasQuery ? envelope([], 0) : envelope(mockTemplates));
    });
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });

    await user.type(screen.getByRole('textbox', { name: /buscar rotina/i }), 'xyznotfound');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        '/trainer/protocol-templates',
        expect.objectContaining({ params: expect.objectContaining({ q: 'xyznotfound' }) }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Modelo Força')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /sem resultados/i })).toBeInTheDocument();
      expect(screen.getByText(/nenhuma rotina corresponde/i)).toBeInTheDocument();
    });
  });

  // ── Empty state ────────────────────────────────────────────────────────────
  it('shows the empty block with the explanation and hides the header CTA', async () => {
    api.get.mockResolvedValue(envelope([]));
    renderWithRouter(<ProtocolTemplates />);

    expect(await screen.findByRole('heading', { name: 'Sem rotinas ainda' })).toBeInTheDocument();
    expect(screen.getByText(/comece pelo treino/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /nova rotina/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  // ── Navigation ─────────────────────────────────────────────────────────────
  it('navigates to /new when clicking Nova rotina in the header', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /nova rotina/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/routines/new');
  });

  it('navigates to /new from the empty state button', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(envelope([]));
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /criar primeira rotina/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /criar primeira rotina/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/routines/new');
  });

  it('opens the routine view when clicking a row', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /abrir rotina modelo força/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/routines/1');
  });

  it('navigates to edit via row menu Editar item', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });

    const menuBtn = screen.getAllByRole('button', { name: /ações da rotina/i })[0];
    await user.click(menuBtn);
    await user.click(screen.getByRole('button', { name: 'Editar' }));

    expect(mockNavigate).toHaveBeenCalledWith('/trainer/routines/1/edit');
  });

  // ── Delete flow ────────────────────────────────────────────────────────────
  it('shows confirm dialog before deleting', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });

    const menuBtn = screen.getAllByRole('button', { name: /ações da rotina/i })[0];
    await user.click(menuBtn);
    await user.click(screen.getByRole('button', { name: /excluir/i }));

    expect(screen.getByText(/excluir "modelo força"/i)).toBeInTheDocument();
  });

  it('deletes template after confirmation and shows success toast', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });

    const menuBtn = screen.getAllByRole('button', { name: /ações da rotina/i })[0];
    await user.click(menuBtn);
    await user.click(screen.getByRole('button', { name: /excluir/i }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /excluir/i }));

    expect(api.delete).toHaveBeenCalledWith('/trainer/protocol-templates/1');
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Rotina excluída.', 'success');
    });
  });

  it('dismisses confirm dialog on cancel', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });

    const menuBtn = screen.getAllByRole('button', { name: /ações da rotina/i })[0];
    await user.click(menuBtn);
    await user.click(screen.getByRole('button', { name: /excluir/i }));

    expect(screen.getByText(/excluir "modelo força"/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(screen.queryByText(/excluir "modelo força"/i)).not.toBeInTheDocument();
  });

  it('shows error toast when delete fails', async () => {
    const user = userEvent.setup();
    api.delete.mockRejectedValue({ userMessage: 'Erro ao excluir' });
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });

    const menuBtn = screen.getAllByRole('button', { name: /ações da rotina/i })[0];
    await user.click(menuBtn);
    await user.click(screen.getByRole('button', { name: /excluir/i }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /excluir/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao excluir', 'error');
    });
  });

  // ── Draft card (localStorage) ──────────────────────────────────────────────

  it('does not show draft card when localStorage has no draft', async () => {
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /continuar rascunho/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Em andamento')).not.toBeInTheDocument();
  });

  it('shows draft card with name and Em andamento badge when draft is valid', async () => {
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continuar rascunho/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /continuar rascunho/i })).toHaveTextContent('Rotina Teste');
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
    expect(screen.getAllByText('3 treinos').length).toBeGreaterThan(0);
    expect(screen.getByText(/salvo/i)).toBeInTheDocument();
  });

  it('shows "Sem nome" in draft card when draft has no name', async () => {
    localStorage.setItem(
      ROUTINE_DRAFT_KEY,
      makeDraft({ data: { name: '', meta: { type: 'strength' }, trainingIds: ['t1'] } }),
    );
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continuar rascunho/i })).toBeInTheDocument();
    });
    const card = screen.getByRole('button', { name: /continuar rascunho/i });
    expect(within(card).getByText('Sem nome')).toBeInTheDocument();
  });

  it('navigates to /trainer/routines/new when clicking the draft card', async () => {
    const user = userEvent.setup();
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continuar rascunho/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /continuar rascunho/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/routines/new');
  });

  it('navigates to /trainer/routines/new when pressing Enter on the draft card', async () => {
    const user = userEvent.setup();
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continuar rascunho/i })).toBeInTheDocument();
    });
    screen.getByRole('button', { name: /continuar rascunho/i }).focus();
    await user.keyboard('{Enter}');
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/routines/new');
  });

  it('navigates to /new via draft menu "Continuar editando"', async () => {
    const user = userEvent.setup();
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ações do rascunho/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /ações do rascunho/i }));
    await user.click(screen.getByRole('button', { name: 'Continuar editando' }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/routines/new');
  });

  it('opens confirm dialog via draft menu "Descartar"', async () => {
    const user = userEvent.setup();
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ações do rascunho/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /ações do rascunho/i }));
    await user.click(screen.getByRole('button', { name: /descartar/i }));
    expect(screen.getByText(/descartar este rascunho/i)).toBeInTheDocument();
  });

  it('removes draft card and clears localStorage after confirming discard', async () => {
    const user = userEvent.setup();
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ações do rascunho/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /ações do rascunho/i }));
    await user.click(screen.getByRole('button', { name: /descartar/i }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /descartar/i }));
    await waitFor(() => {
      expect(screen.queryByText('Em andamento')).not.toBeInTheDocument();
    });
    expect(localStorage.getItem(ROUTINE_DRAFT_KEY)).toBeNull();
  });

  it('keeps draft card when cancelling discard', async () => {
    const user = userEvent.setup();
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ações do rascunho/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /ações do rascunho/i }));
    await user.click(screen.getByRole('button', { name: /descartar/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
    expect(localStorage.getItem(ROUTINE_DRAFT_KEY)).not.toBeNull();
  });

  it('shows the draft card on the unfiltered first page', async () => {
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
  });

  it('hides the draft card once a server-side filter is active', async () => {
    const user = userEvent.setup();
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });
    // The draft row cannot be paginated/filtered server-side, so applying a
    // type filter hides it.
    await user.click(screen.getByRole('tab', { name: /^força$/i }));
    await waitFor(() => {
      expect(screen.queryByText('Em andamento')).not.toBeInTheDocument();
    });
  });

  it('does not show empty state when only localStorage draft exists (no server templates)', async () => {
    api.get.mockResolvedValue(envelope([]));
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByText('Em andamento')).toBeInTheDocument();
    });
    expect(screen.queryByText(/comece pelo treino/i)).not.toBeInTheDocument();
  });

  it('shows empty state when 0 server templates and no localStorage draft', async () => {
    api.get.mockResolvedValue(envelope([]));
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByText(/comece pelo treino/i)).toBeInTheDocument();
    });
  });

  it('clicking the draft menu trigger does not navigate', async () => {
    const user = userEvent.setup();
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ações do rascunho/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /ações do rascunho/i }));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows "1 treino" singular in draft card', async () => {
    localStorage.setItem(
      ROUTINE_DRAFT_KEY,
      makeDraft({ data: { name: 'Um treino', meta: { type: 'strength' }, trainingIds: ['t1'] } }),
    );
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continuar rascunho/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/1 treino/)).toBeInTheDocument();
    expect(screen.queryByText(/1 treinos/)).not.toBeInTheDocument();
  });

  it('does not render draft card for a completely empty draft (defensive)', async () => {
    localStorage.setItem(
      ROUTINE_DRAFT_KEY,
      JSON.stringify({
        version: ROUTINE_DRAFT_VERSION,
        savedAt: new Date().toISOString(),
        data: { name: '', meta: null, trainingIds: [], createdTrainingIds: [], junctionsAddedToImported: [] },
      }),
    );
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });
    expect(screen.queryByText('Em andamento')).not.toBeInTheDocument();
  });

  // ── Discard cleanup ────────────────────────────────────────────────────────

  it('calls cleanupDraftResources before clearing localStorage on discard', async () => {
    const user = userEvent.setup();
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ações do rascunho/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /ações do rascunho/i }));
    await user.click(screen.getByRole('button', { name: /descartar/i }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /descartar/i }));

    await waitFor(() => {
      expect(cleanupDraftResources).toHaveBeenCalledOnce();
    });
    expect(localStorage.getItem(ROUTINE_DRAFT_KEY)).toBeNull();
  });

  it('shows success toast when discard cleanup has 0 failures', async () => {
    const user = userEvent.setup();
    vi.mocked(cleanupDraftResources).mockResolvedValue({ successCount: 2, failureCount: 0, errors: [] });
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ações do rascunho/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /ações do rascunho/i }));
    await user.click(screen.getByRole('button', { name: /descartar/i }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /descartar/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Rascunho descartado.', 'success');
    });
  });

  it('shows warning toast with count when discard cleanup has partial failures', async () => {
    const user = userEvent.setup();
    vi.mocked(cleanupDraftResources).mockResolvedValue({ successCount: 1, failureCount: 2, errors: [] });
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ações do rascunho/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /ações do rascunho/i }));
    await user.click(screen.getByRole('button', { name: /descartar/i }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /descartar/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('2 item(ns) não puderam ser apagados'),
        'warning',
      );
    });
    // localStorage must still be cleared (best-effort)
    expect(localStorage.getItem(ROUTINE_DRAFT_KEY)).toBeNull();
  });

  it('clears localStorage even when cleanupDraftResources throws', async () => {
    const user = userEvent.setup();
    vi.mocked(cleanupDraftResources).mockRejectedValue(new Error('network error'));
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ações do rascunho/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /ações do rascunho/i }));
    await user.click(screen.getByRole('button', { name: /descartar/i }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /descartar/i }));

    await waitFor(() => {
      expect(localStorage.getItem(ROUTINE_DRAFT_KEY)).toBeNull();
    });
    expect(mockShowToast).toHaveBeenCalledWith('Erro ao descartar rascunho.', 'error');
  });

  it('confirm dialog message warns about trainings and exercises being deleted', async () => {
    const user = userEvent.setup();
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ações do rascunho/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /ações do rascunho/i }));
    await user.click(screen.getByRole('button', { name: /descartar/i }));

    expect(screen.getByText(/treinos e exercícios criados aqui também serão apagados/i)).toBeInTheDocument();
  });

  // ── Pagination + batch delete ──────────────────────────────────────────────
  it('renders rows from the pagination envelope (res.data.data)', async () => {
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
      expect(screen.getByText('Modelo Cardio')).toBeInTheDocument();
    });
  });

  it('shows the footer summary and appends the next page on "Ver mais"', async () => {
    const user = userEvent.setup();
    const nextPage = [{ id: 3, name: 'Modelo Mobilidade', type: 'mobility', scheduleTemplatesCount: 1 }];
    api.get.mockImplementation((url, config) => {
      if (url !== '/trainer/protocol-templates') return Promise.resolve({ data: [] });
      return Promise.resolve(config.params.page === 2 ? envelope(nextPage, 3, 2) : envelope(mockTemplates, 3));
    });
    renderWithRouter(<ProtocolTemplates />);

    await screen.findByText('Modelo Força');
    expect(screen.getByText('Mostrando 2 de 3 rotinas')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ver mais/i }));

    expect(await screen.findByText('Modelo Mobilidade')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(
      '/trainer/protocol-templates',
      expect.objectContaining({ params: expect.objectContaining({ page: 2 }) }),
    );
    expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 3 de 3 rotinas')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ver mais/i })).not.toBeInTheDocument();
  });

  it('selects a row and batch-deletes the selection', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { deletedCount: 1 } });
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));

    await user.click(screen.getByRole('checkbox', { name: /selecionar modelo força/i }));

    const batchButton = screen.getByRole('button', { name: /excluir selecionados/i });
    expect(batchButton).toBeInTheDocument();

    await user.click(batchButton);
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /excluir/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/protocol-templates/batch-delete', { ids: [1] });
      expect(mockShowToast).toHaveBeenCalledWith('1 itens excluídos.', 'success');
    });
  });

  it('select-all toggles every row checkbox on the current page', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => screen.getByText('Modelo Força'));

    await user.click(screen.getByRole('button', { name: /selecionar todos/i }));

    expect(screen.getByRole('checkbox', { name: /selecionar modelo força/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /selecionar modelo cardio/i })).toBeChecked();
    expect(screen.getByRole('button', { name: /limpar seleção/i })).toBeInTheDocument();
  });
});
