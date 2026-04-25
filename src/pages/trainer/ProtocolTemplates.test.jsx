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
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: mockTemplates });
      return Promise.resolve({ data: [] });
    });
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
    expect(screen.getByText('Carregando…')).toBeInTheDocument();
  });

  // ── Page structure ─────────────────────────────────────────────────────────
  it('renders the page title after loading', async () => {
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Rotinas' })).toBeInTheDocument();
    });
  });

  it('renders the ROTINAS eyebrow label', async () => {
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      // The eyebrow text (uppercase via CSS, text node is "Rotinas")
      const eyebrows = screen.getAllByText(/rotinas/i);
      expect(eyebrows.length).toBeGreaterThanOrEqual(1);
    });
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

  it('shows error toast when fetch fails', async () => {
    api.get.mockRejectedValue({ userMessage: 'Falha ao carregar rotinas' });
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Falha ao carregar rotinas', 'error');
    });
  });

  // ── Filter tabs with counters ──────────────────────────────────────────────
  it('shows filter tabs with correct counts', async () => {
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /todas/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /prontas/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /rascunho/i })).toBeInTheDocument();
    });

    // All count = 2, ready = 1 (scheduleTemplatesCount: 3), draft = 1 (scheduleTemplatesCount: 0)
    const allTab = screen.getByRole('tab', { name: /todas/i });
    const readyTab = screen.getByRole('tab', { name: /prontas/i });
    const draftTab = screen.getByRole('tab', { name: /rascunho/i });

    expect(within(allTab).getByText('2')).toBeInTheDocument();
    expect(within(readyTab).getByText('1')).toBeInTheDocument();
    expect(within(draftTab).getByText('1')).toBeInTheDocument();
  });

  it('filters to ready templates when clicking Prontas tab', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: /prontas/i }));

    expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    expect(screen.queryByText('Modelo Cardio')).not.toBeInTheDocument();
  });

  it('filters to draft templates when clicking Rascunho tab', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Cardio')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: /rascunho/i }));

    expect(screen.getByText('Modelo Cardio')).toBeInTheDocument();
    expect(screen.queryByText('Modelo Força')).not.toBeInTheDocument();
  });

  // ── Search ─────────────────────────────────────────────────────────────────
  it('filters templates by search term', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });

    const searchInput = screen.getByRole('textbox', { name: /buscar rotina/i });
    await user.type(searchInput, 'Força');

    expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    expect(screen.queryByText('Modelo Cardio')).not.toBeInTheDocument();
  });

  it('shows no-results empty state when search yields nothing', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });

    await user.type(screen.getByRole('textbox', { name: /buscar rotina/i }), 'xyznotfound');

    expect(screen.getByText(/nenhuma rotina encontrada/i)).toBeInTheDocument();
  });

  // ── Empty state ────────────────────────────────────────────────────────────
  it('shows themed empty state when no templates exist', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText(/comece pelo treino/i)).toBeInTheDocument();
    });
  });

  // ── Navigation ─────────────────────────────────────────────────────────────
  it('navigates to /new when clicking Nova rotina in the header', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });

    // Get all "Nova rotina" buttons and click the first visible one (header btn)
    const novaBtns = screen.getAllByRole('button', { name: /nova rotina/i });
    // The first one is in the page-header (not the mobile bar which has tabIndex=-1)
    await user.click(novaBtns[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/routines/new');
  });

  it('navigates to /new from the empty state button', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /adicionar primeira rotina/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /adicionar primeira rotina/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/routines/new');
  });

  it('navigates to edit page when clicking a card', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /editar rotina modelo força/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/routines/1/edit');
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

  // ── Duplicate stub ─────────────────────────────────────────────────────────
  it('shows "Em breve" toast when clicking Duplicar existente', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /duplicar existente/i }));
    expect(mockShowToast).toHaveBeenCalledWith(
      'Em breve: duplicar rotina existente.',
      'info',
    );
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
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

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
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

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
    expect(screen.queryByText('EM ANDAMENTO')).not.toBeInTheDocument();
  });

  it('shows draft card with name and EM ANDAMENTO badge when draft is valid', async () => {
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continuar rascunho/i })).toBeInTheDocument();
    });
    const card = screen.getByRole('button', { name: /continuar rascunho/i });
    expect(within(card).getByText('Rotina Teste')).toBeInTheDocument();
    expect(within(card).getByText('EM ANDAMENTO')).toBeInTheDocument();
    expect(within(card).getByText(/3 treinos/i)).toBeInTheDocument();
    expect(within(card).getByText(/salvo/i)).toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: /confirmar/i }));
    await waitFor(() => {
      expect(screen.queryByText('EM ANDAMENTO')).not.toBeInTheDocument();
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
    expect(screen.getByText('EM ANDAMENTO')).toBeInTheDocument();
    expect(localStorage.getItem(ROUTINE_DRAFT_KEY)).not.toBeNull();
  });

  it('shows draft card in "Rascunho" filter', async () => {
    const user = userEvent.setup();
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('tab', { name: /rascunho/i }));
    expect(screen.getByText('EM ANDAMENTO')).toBeInTheDocument();
  });

  it('hides draft card in "Prontas" filter', async () => {
    const user = userEvent.setup();
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('tab', { name: /prontas/i }));
    expect(screen.queryByText('EM ANDAMENTO')).not.toBeInTheDocument();
  });

  it('shows draft card in "Todas" filter', async () => {
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });
    expect(screen.getByText('EM ANDAMENTO')).toBeInTheDocument();
  });

  it('counts localStorage draft in "Todas" tab counter', async () => {
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /todas/i })).toBeInTheDocument();
    });
    const allTab = screen.getByRole('tab', { name: /todas/i });
    expect(within(allTab).getByText('3')).toBeInTheDocument();
  });

  it('counts localStorage draft in "Rascunho" tab counter', async () => {
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /rascunho/i })).toBeInTheDocument();
    });
    const draftTab = screen.getByRole('tab', { name: /rascunho/i });
    expect(within(draftTab).getByText('2')).toBeInTheDocument();
  });

  it('does not count localStorage draft in "Prontas" tab counter', async () => {
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /prontas/i })).toBeInTheDocument();
    });
    const readyTab = screen.getByRole('tab', { name: /prontas/i });
    expect(within(readyTab).getByText('1')).toBeInTheDocument();
  });

  it('does not show empty state when only localStorage draft exists (no server templates)', async () => {
    api.get.mockResolvedValue({ data: [] });
    localStorage.setItem(ROUTINE_DRAFT_KEY, makeDraft());
    renderWithRouter(<ProtocolTemplates />);
    await waitFor(() => {
      expect(screen.getByText('EM ANDAMENTO')).toBeInTheDocument();
    });
    expect(screen.queryByText(/comece pelo treino/i)).not.toBeInTheDocument();
  });

  it('shows empty state when 0 server templates and no localStorage draft', async () => {
    api.get.mockResolvedValue({ data: [] });
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
    const card = screen.getByRole('button', { name: /continuar rascunho/i });
    expect(within(card).getByText(/1 treino/)).toBeInTheDocument();
    expect(within(card).queryByText(/1 treinos/)).not.toBeInTheDocument();
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
    expect(screen.queryByText('EM ANDAMENTO')).not.toBeInTheDocument();
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
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

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
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

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
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

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
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

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
});
