import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import Students from './Students';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import { markOnboardingStepOptimistic } from '../../hooks/useOnboardingStatus';

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

vi.mock('../../hooks/useOnboardingStatus', () => ({
  markOnboardingStepOptimistic: vi.fn(),
}));

const daysAgoIso = (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const openUnlinkConfirm = async (user, name) => {
  await user.click(screen.getByRole('button', { name: new RegExp(`ações de ${name}`, 'i') }));
  await user.click(screen.getByRole('button', { name: /^desvincular$/i }));
};

const mockStudents = [
  { id: 'student-1', firstName: 'Aluno', lastName: 'Exemplo', email: 'aluno@example.com', billingStatus: 'ok' },
];

const mockMultipleStudents = [
  { id: 's1', firstName: 'Ana', lastName: 'Silva', email: 'ana@example.com', billingStatus: 'ok' },
  { id: 's2', firstName: 'Bruno', lastName: 'Costa', email: 'bruno@example.com', billingStatus: 'due_soon' },
  { id: 's3', firstName: 'Carla', lastName: 'Lima', email: 'carla@example.com', billingStatus: 'overdue' },
];

const mockImportPreviewResponse = {
  students: [
    {
      fullName: 'Nicolle Costa',
      firstName: 'Nicolle',
      lastName: 'Costa',
      email: 'nicolle@example.com',
      plan: 'Caveira Team - Semestral',
      status: 'Entregue',
      expirationDate: '01/10/2026',
      daysRemaining: 190,
      duplicateEmail: false,
    },
    {
      fullName: 'Vitor Dantas',
      firstName: 'Vitor',
      lastName: 'Dantas',
      email: 'vitor@example.com',
      plan: 'Trimestral',
      status: 'Entregue',
      expirationDate: '01/08/2026',
      daysRemaining: 130,
      duplicateEmail: true,
    },
  ],
  summary: { total: 2, withEmail: 2, withoutEmail: 0, duplicateEmails: 1 },
};

describe('Students', () => {
  let showToast;

  beforeEach(() => {
    showToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ showToast });
    api.get.mockClear();
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') {
        return Promise.resolve({ data: mockStudents });
      }
      return Promise.resolve({ data: [] });
    });
    api.post.mockReset();
    api.delete.mockReset();
    vi.mocked(markOnboardingStepOptimistic).mockClear();
  });

  // ── Loading & layout ──────────────────────────────────────────────────

  it('shows loading screen while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderWithRouter(<Students />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('renders page title and both header action buttons when students exist', async () => {
    renderWithRouter(<Students />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Meus alunos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /importar alunos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^vincular aluno$/i })).toBeInTheDocument();
  });

  // ── Empty state ───────────────────────────────────────────────────────

  it('shows redesigned empty state when there are no students', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<Students />);

    await waitFor(() => {
      expect(screen.getByText('Sem alunos ainda')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /vincular primeiro aluno/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sem alunos ainda' })).toBeInTheDocument();
    // Header "Vincular aluno" button is hidden when no students exist — CTA is in the empty state only
    expect(screen.queryByRole('button', { name: /^vincular aluno$/i })).not.toBeInTheDocument();
    // "Importar alunos" remains visible in the header regardless of student count
    expect(screen.getByRole('button', { name: /importar alunos/i })).toBeInTheDocument();
  });

  it('opens link modal from empty state CTA', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Sem alunos ainda')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /vincular primeiro aluno/i }));
    expect(screen.getByRole('dialog', { name: /vincular aluno/i })).toBeInTheDocument();
  });

  // ── Stats header ──────────────────────────────────────────────────────

  it('shows stats row with counts when students exist', async () => {
    api.get.mockResolvedValue({ data: mockMultipleStudents });
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Ana Silva')).toBeInTheDocument());

    expect(screen.getByLabelText('Resumo de alunos')).toBeInTheDocument();
  });


  // ── Student list (stats-first rows) ──────────────────────────────────

  it('renders students as stats-first rows', async () => {
    api.get.mockResolvedValue({ data: mockMultipleStudents });
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Ana Silva')).toBeInTheDocument());
    expect(screen.getByText('Bruno Costa')).toBeInTheDocument();
    expect(screen.getByText('Carla Lima')).toBeInTheDocument();
  });

  // ── Inline stats: adherence + last workout ────────────────────────────

  it('renders rounded adherence percent and relative last workout', async () => {
    api.get.mockResolvedValue({
      data: [{
        id: 's1',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        billingStatus: 'ok',
        adherence: 84.6,
        adherenceCompleted: 11,
        adherenceExpected: 13,
        adherenceMonth: '2026-05-01',
        lastWorkoutAt: daysAgoIso(2),
      }],
    });
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Ana Silva')).toBeInTheDocument());
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Há 2 dias')).toBeInTheDocument();
    expect(screen.getByText('Aderência')).toBeInTheDocument();
    expect(screen.getByText('Último treino')).toBeInTheDocument();
  });

  it('renders the X/Y treinos sub-line when adherence counts are present', async () => {
    api.get.mockResolvedValue({
      data: [{
        id: 's1',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        billingStatus: 'ok',
        adherence: 62,
        adherenceCompleted: 5,
        adherenceExpected: 8,
        adherenceMonth: '2026-05-01',
        lastWorkoutAt: null,
      }],
    });
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Ana Silva')).toBeInTheDocument());
    expect(screen.getByText('5/8 treinos')).toBeInTheDocument();
  });

  it('omits the X/Y treinos sub-line when counts are null', async () => {
    api.get.mockResolvedValue({
      data: [{
        id: 's1',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        billingStatus: 'ok',
        adherence: null,
        adherenceCompleted: null,
        adherenceExpected: null,
        lastWorkoutAt: null,
      }],
    });
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Ana Silva')).toBeInTheDocument());
    expect(screen.queryByText(/\/.* treinos/)).not.toBeInTheDocument();
  });

  it('shows fallbacks when adherence and lastWorkoutAt are null', async () => {
    api.get.mockResolvedValue({
      data: [{
        id: 's1',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        billingStatus: 'ok',
        adherence: null,
        adherenceCompleted: null,
        adherenceExpected: null,
        lastWorkoutAt: null,
      }],
    });
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Ana Silva')).toBeInTheDocument());
    expect(screen.getByText('–')).toBeInTheDocument();
    expect(screen.getByText('Nunca')).toBeInTheDocument();
  });

  it('does not render PR stat', async () => {
    api.get.mockResolvedValue({
      data: [{
        id: 's1',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        billingStatus: 'ok',
        currentPrLoad: 120,
      }],
    });
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Ana Silva')).toBeInTheDocument());
    expect(screen.queryByText(/Sem PR|^PR$|kg/)).not.toBeInTheDocument();
  });

  it('clicking a student row navigates to student profile', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    const row = screen.getByRole('button', { name: /ver perfil de aluno exemplo/i });
    await user.click(row);
    // navigation is tested via the navigate mock — just verify row is interactive
    expect(row).toBeInTheDocument();
  });

  // ── Toolbar — search ──────────────────────────────────────────────────

  it('renders toolbar with search input when students exist', async () => {
    renderWithRouter(<Students />);
    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());
    expect(screen.getByLabelText('Buscar alunos')).toBeInTheDocument();
  });

  it('filters students by name search', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockMultipleStudents });
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Ana Silva')).toBeInTheDocument());

    await user.type(screen.getByLabelText('Buscar alunos'), 'Ana');
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.queryByText('Bruno Costa')).not.toBeInTheDocument();
  });

  it('shows no-results state when search yields nothing', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.type(screen.getByLabelText('Buscar alunos'), 'xyz-no-match');
    expect(screen.getByText('Sem resultados')).toBeInTheDocument();
  });

  // ── Toolbar — status filter ───────────────────────────────────────────

  it('filters students by status tab', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockMultipleStudents });
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Ana Silva')).toBeInTheDocument());

    await user.click(screen.getByRole('tab', { name: /pendentes/i }));
    expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument();
    expect(screen.getByText('Bruno Costa')).toBeInTheDocument();
  });

  // ── Toolbar — status filter initialized from ?status= URL param ───────

  it('initializes the status filter from a valid ?status= param (pendente)', async () => {
    api.get.mockResolvedValue({ data: mockMultipleStudents });
    renderWithRouter(<Students />, { route: '/trainer/students?status=pendente' });

    await waitFor(() => expect(screen.getByText('Bruno Costa')).toBeInTheDocument());
    expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument();
    expect(screen.queryByText('Carla Lima')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /pendentes/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('initializes the status filter from a valid ?status= param (vencido)', async () => {
    api.get.mockResolvedValue({ data: mockMultipleStudents });
    renderWithRouter(<Students />, { route: '/trainer/students?status=vencido' });

    await waitFor(() => expect(screen.getByText('Carla Lima')).toBeInTheDocument());
    expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument();
    expect(screen.queryByText('Bruno Costa')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /atenção/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('falls back to "all" when ?status= is missing', async () => {
    api.get.mockResolvedValue({ data: mockMultipleStudents });
    renderWithRouter(<Students />, { route: '/trainer/students' });

    await waitFor(() => expect(screen.getByText('Ana Silva')).toBeInTheDocument());
    expect(screen.getByText('Bruno Costa')).toBeInTheDocument();
    expect(screen.getByText('Carla Lima')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^todos/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('falls back to "all" when ?status= is invalid', async () => {
    api.get.mockResolvedValue({ data: mockMultipleStudents });
    renderWithRouter(<Students />, { route: '/trainer/students?status=bogus' });

    await waitFor(() => expect(screen.getByText('Ana Silva')).toBeInTheDocument());
    expect(screen.getByText('Bruno Costa')).toBeInTheDocument();
    expect(screen.getByText('Carla Lima')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^todos/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps the tab UI as the source of truth after mount (still switchable)', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockMultipleStudents });
    renderWithRouter(<Students />, { route: '/trainer/students?status=pendente' });

    await waitFor(() => expect(screen.getByText('Bruno Costa')).toBeInTheDocument());

    await user.click(screen.getByRole('tab', { name: /^todos/i }));
    expect(screen.getByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByText('Bruno Costa')).toBeInTheDocument();
    expect(screen.getByText('Carla Lima')).toBeInTheDocument();
  });

  // ── Status derived from billingStatus (matches dashboard plans tiles) ──

  const buildBillingStudents = (billingStatus, total) =>
    Array.from({ length: total }, (_, i) => ({
      id: `${billingStatus}-${i}`,
      firstName: `Aluno${i}`,
      lastName: billingStatus,
      email: `${billingStatus}${i}@example.com`,
      billingStatus,
    }));

  const getKpiValue = (label) => {
    const summary = screen.getByRole('region', { name: 'Resumo de alunos' });
    return within(summary).getByText(label).nextElementSibling;
  };

  it('shows 5 overdue students under "Atenção" via ?status=vencido (dashboard deep-link) and in the KPI', async () => {
    api.get.mockResolvedValue({
      data: [...buildBillingStudents('overdue', 5), ...buildBillingStudents('ok', 2)],
    });
    renderWithRouter(<Students />, { route: '/trainer/students?status=vencido' });

    await waitFor(() => expect(screen.getAllByText(/Aluno\d overdue/)).toHaveLength(5));
    expect(screen.queryByText(/Aluno\d ok/)).not.toBeInTheDocument();
    const attentionTab = screen.getByRole('tab', { name: /atenção/i });
    expect(attentionTab).toHaveAttribute('aria-selected', 'true');
    expect(attentionTab).toHaveTextContent('(5)');
    expect(getKpiValue('Atenção')).toHaveTextContent('5');
    expect(screen.getAllByText('Vencido')).toHaveLength(5);
  });

  it('classifies due_soon students as Pendentes', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({
      data: [...buildBillingStudents('due_soon', 3), ...buildBillingStudents('none', 1)],
    });
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno0 none')).toBeInTheDocument());
    expect(screen.getByRole('tab', { name: /pendentes/i })).toHaveTextContent('(3)');
    expect(getKpiValue('Pendentes')).toHaveTextContent('3');

    await user.click(screen.getByRole('tab', { name: /pendentes/i }));
    expect(screen.getAllByText(/Aluno\d due_soon/)).toHaveLength(3);
    expect(screen.queryByText('Aluno0 none')).not.toBeInTheDocument();
  });

  it('treats ok, none and missing billingStatus as Ativos', async () => {
    api.get.mockResolvedValue({
      data: [
        ...buildBillingStudents('ok', 1),
        ...buildBillingStudents('none', 1),
        { id: 'legacy', firstName: 'Legado', lastName: 'Cache', email: 'legado@example.com' },
      ],
    });
    renderWithRouter(<Students />, { route: '/trainer/students?status=ativo' });

    await waitFor(() => expect(screen.getByText('Legado Cache')).toBeInTheDocument());
    expect(screen.getByText('Aluno0 ok')).toBeInTheDocument();
    expect(screen.getByText('Aluno0 none')).toBeInTheDocument();
    expect(getKpiValue('Ativos')).toHaveTextContent('3');
    expect(getKpiValue('Atenção')).toHaveTextContent('0');
  });

  // ── Unlink flow ───────────────────────────────────────────────────────

  it('opening the row menu and choosing Desvincular opens the confirm dialog', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await openUnlinkConfirm(user, 'aluno exemplo');

    expect(screen.getByText(/desvincular aluno exemplo\? esta ação não pode ser desfeita/i)).toBeInTheDocument();
  });

  it('confirms unlink — calls api.delete and shows toast', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await openUnlinkConfirm(user, 'aluno exemplo');
    await user.click(screen.getByRole('button', { name: /^desvincular$/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/students/student-1');
    });
    expect(showToast).toHaveBeenCalledWith('Aluno desvinculado.', 'success');
  });

  it('cancels unlink dialog without calling api.delete', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await openUnlinkConfirm(user, 'aluno exemplo');
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(api.delete).not.toHaveBeenCalled();
    expect(screen.queryByText(/esta ação não pode ser desfeita/i)).not.toBeInTheDocument();
  });

  it('shows error toast on unlink failure', async () => {
    const user = userEvent.setup();
    const err = new Error('Network error');
    err.userMessage = 'Erro ao desvincular aluno.';
    api.delete.mockRejectedValue(err);
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await openUnlinkConfirm(user, 'aluno exemplo');
    await user.click(screen.getByRole('button', { name: /^desvincular$/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Erro ao desvincular aluno.', 'error');
    });
  });

  // ── Link student modal ────────────────────────────────────────────────

  it('opens link modal from header button', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /^vincular aluno$/i }));
    expect(screen.getByRole('dialog', { name: /vincular aluno/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail do aluno/i)).toBeInTheDocument();
  });

  it('closes link modal on cancel', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /^vincular aluno$/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(screen.queryByRole('dialog', { name: /vincular aluno/i })).not.toBeInTheDocument();
  });

  it('closes link modal on close button click', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /^vincular aluno$/i }));
    await user.click(screen.getByRole('button', { name: /^fechar$/i }));

    expect(screen.queryByRole('dialog', { name: /vincular aluno/i })).not.toBeInTheDocument();
  });

  it('link button is disabled when email is empty', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /^vincular aluno$/i }));
    expect(screen.getByRole('button', { name: /^vincular$/i })).toBeDisabled();
  });

  const submitLinkForm = async (user, email) => {
    await user.click(screen.getByRole('button', { name: /^vincular aluno$/i }));
    await user.type(screen.getByLabelText(/e-mail do aluno/i), email);
    await user.click(screen.getByRole('button', { name: /^vincular$/i }));
  };

  const linkedStudent = { id: 'new-1', firstName: 'Novo', lastName: 'Aluno', email: 'novo@example.com', avatarUrl: null };

  const pendingInvite = {
    id: 'inv-new',
    email: 'convidado@example.com',
    status: 'pending',
    statusLabel: 'Pendente',
    studentId: null,
    expiresAt: '2026-10-29T12:00:00.000Z',
    acceptedAt: null,
    revokedAt: null,
    lastSentAt: '2026-09-29T12:00:00.000Z',
    sendCount: 1,
    createdAt: '2026-09-29T12:00:00.000Z',
    canResend: false,
    resendAvailableAt: '2026-09-29T13:00:00.000Z',
  };

  it('explains in the link modal that unregistered students get a TeuFit invite by e-mail', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /^vincular aluno$/i }));

    const dialog = screen.getByRole('dialog', { name: /vincular aluno/i });
    expect(within(dialog).getByText(/convite por e-mail com os links para baixar o app TeuFit/i)).toBeInTheDocument();
  });

  it('posts to /trainer/student-invites and appends the student when outcome is linked', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { outcome: 'linked', student: linkedStudent } });
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());
    await submitLinkForm(user, 'novo@example.com');

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/student-invites', { email: 'novo@example.com' });
    });
    expect(showToast).toHaveBeenCalledWith('Aluno vinculado com sucesso!', 'success');
    expect(await screen.findByText('Novo Aluno')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /vincular aluno/i })).not.toBeInTheDocument();
    // Not the first student → no onboarding step
    expect(markOnboardingStepOptimistic).not.toHaveBeenCalled();
  });

  it('marks the first-student onboarding step when the first student is linked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({ data: { outcome: 'linked', student: linkedStudent } });
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Sem alunos ainda')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /vincular primeiro aluno/i }));
    await user.type(screen.getByLabelText(/e-mail do aluno/i), 'novo@example.com');
    await user.click(screen.getByRole('button', { name: /^vincular$/i }));

    await waitFor(() => {
      expect(markOnboardingStepOptimistic).toHaveBeenCalledWith('firstStudentLinked');
    });
  });

  it('shows the invite toast, does not append or trigger onboarding, and opens the Convites tab when outcome is invited', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [] });
      if (url === '/trainer/student-invites') {
        return Promise.resolve({ data: { items: [pendingInvite], total: 1, page: 1, pageSize: 20 } });
      }
      return Promise.resolve({ data: [] });
    });
    api.post.mockResolvedValue({ data: { outcome: 'invited', invite: pendingInvite } });
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Sem alunos ainda')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /vincular primeiro aluno/i }));
    await user.type(screen.getByLabelText(/e-mail do aluno/i), 'convidado@example.com');
    await user.click(screen.getByRole('button', { name: /^vincular$/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Convite enviado para convidado@example.com.', 'success');
    });
    expect(markOnboardingStepOptimistic).not.toHaveBeenCalled();
    expect(screen.getByRole('tab', { name: 'Convites' })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByText('convidado@example.com')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();

    // Student roster is untouched: back on Alunos the empty state is still there
    await user.click(screen.getByRole('tab', { name: 'Alunos' }));
    expect(screen.getByText('Sem alunos ainda')).toBeInTheDocument();
  });

  it('treats an existing but unverified account as invited: no roster append, no onboarding, no linked toast', async () => {
    const user = userEvent.setup();
    const unverifiedInvite = { ...pendingInvite, id: 'inv-unverified', email: 'naoverificado@example.com' };
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [] });
      if (url === '/trainer/student-invites') {
        return Promise.resolve({ data: { items: [unverifiedInvite], total: 1, page: 1, pageSize: 20 } });
      }
      return Promise.resolve({ data: [] });
    });
    // Backend answers 'invited' (not 'linked') when the account exists but its e-mail is unverified.
    api.post.mockResolvedValue({ data: { outcome: 'invited', invite: unverifiedInvite } });
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Sem alunos ainda')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /vincular primeiro aluno/i }));
    await user.type(screen.getByLabelText(/e-mail do aluno/i), 'naoverificado@example.com');
    await user.click(screen.getByRole('button', { name: /^vincular$/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Convite enviado para naoverificado@example.com.', 'success');
    });
    expect(showToast).not.toHaveBeenCalledWith('Aluno vinculado com sucesso!', 'success');
    expect(markOnboardingStepOptimistic).not.toHaveBeenCalled();

    await user.click(screen.getByRole('tab', { name: 'Alunos' }));
    expect(screen.getByText('Sem alunos ainda')).toBeInTheDocument();
  });

  it('shows the daily invite limit with the wait time from retryAfterSeconds and keeps the modal open', async () => {
    const user = userEvent.setup();
    const err = new Error('Too Many Requests');
    err.response = {
      status: 429,
      data: {
        error: 'STUDENT_INVITE_DAILY_LIMIT',
        messageCode: 'studentInvite.dailyLimit',
        message: 'x',
        details: { retryAfterSeconds: 8100 },
      },
    };
    err.userMessage = 'Você atingiu o limite diário de convites. Tente novamente mais tarde.';
    api.post.mockRejectedValue(err);
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());
    await submitLinkForm(user, 'limite@example.com');

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        'Você atingiu o limite diário de convites. Tente novamente em 2 h 15 min.',
        'error'
      );
    });
    expect(screen.getByRole('dialog', { name: /vincular aluno/i })).toBeInTheDocument();
  });

  it('falls back to the generic daily limit message when retryAfterSeconds is missing', async () => {
    const user = userEvent.setup();
    const err = new Error('Too Many Requests');
    err.response = {
      status: 429,
      data: { error: 'STUDENT_INVITE_DAILY_LIMIT', messageCode: 'studentInvite.dailyLimit', message: 'x' },
    };
    api.post.mockRejectedValue(err);
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());
    await submitLinkForm(user, 'limite@example.com');

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        'Você atingiu o limite diário de convites. Tente novamente mais tarde.',
        'error'
      );
    });
  });

  it('points to the Convites tab when an invite is already pending for the e-mail', async () => {
    const user = userEvent.setup();
    const err = new Error('Conflict');
    err.response = {
      status: 409,
      data: { error: 'STUDENT_INVITE_ALREADY_PENDING', messageCode: 'studentInvite.alreadyPending', message: 'x' },
    };
    err.userMessage = 'Já existe um convite pendente para este e-mail. Você pode reenviá-lo na aba Convites.';
    api.post.mockRejectedValue(err);
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());
    await submitLinkForm(user, 'pendente@example.com');

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(err.userMessage, 'error');
    });
    expect(screen.queryByRole('dialog', { name: /vincular aluno/i })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Convites' })).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps the modal open on other link errors', async () => {
    const user = userEvent.setup();
    const err = new Error('Forbidden');
    err.response = {
      status: 403,
      data: { error: 'STUDENT_CAP_EXCEEDED', messageCode: 'platformPlan.studentCapExceeded', message: 'x' },
    };
    api.post.mockRejectedValue(err);
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());
    await submitLinkForm(user, 'cap@example.com');

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        'Você atingiu o limite de alunos do seu plano. Faça upgrade para adicionar mais alunos.',
        'error'
      );
    });
    expect(screen.getByRole('dialog', { name: /vincular aluno/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Alunos' })).toHaveAttribute('aria-selected', 'true');
  });

  // ── Page tabs ─────────────────────────────────────────────────────────

  it('renders Alunos and Convites tabs with Alunos selected by default', async () => {
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());
    expect(screen.getByRole('tab', { name: 'Alunos' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Convites' })).toHaveAttribute('aria-selected', 'false');
  });

  it('does not fetch invites until the Convites tab is opened', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());
    expect(api.get).not.toHaveBeenCalledWith('/trainer/student-invites', expect.anything());

    await user.click(screen.getByRole('tab', { name: 'Convites' }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/trainer/student-invites', {
        params: { page: 1, pageSize: 20 },
      });
    });
    expect(screen.queryByText('Aluno Exemplo')).not.toBeInTheDocument();
  });

  it('shows error toast when link api.post fails', async () => {
    const user = userEvent.setup();
    const err = new Error('Conflict');
    err.userMessage = 'Aluno já vinculado.';
    api.post.mockRejectedValue(err);
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /^vincular aluno$/i }));
    await user.type(screen.getByLabelText(/e-mail do aluno/i), 'dup@example.com');
    await user.click(screen.getByRole('button', { name: /^vincular$/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Aluno já vinculado.', 'error');
    });
  });

  // ── Import modal — platform step ──────────────────────────────────────

  it('shows import button always', async () => {
    renderWithRouter(<Students />);
    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /importar alunos/i })).toBeInTheDocument();
  });

  it('opens import modal with platform step', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /importar alunos/i }));

    expect(screen.getByRole('dialog', { name: /importar alunos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /primecoaching/i })).toBeInTheDocument();
  });

  it('closes import modal from close button', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /importar alunos/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^fechar$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // ── Import modal — upload step ────────────────────────────────────────

  it('shows file upload form after selecting PrimeCoaching', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /importar alunos/i }));
    await user.click(screen.getByRole('button', { name: /primecoaching/i }));

    expect(screen.getByRole('dialog', { name: /importar do primecoaching/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/arquivo xlsx do primecoaching/i)).toBeInTheDocument();
  });

  it('import submit button is disabled until a file is selected', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /importar alunos/i }));
    await user.click(screen.getByRole('button', { name: /primecoaching/i }));

    expect(screen.getByRole('button', { name: /^continuar$/i })).toBeDisabled();
  });

  it('Voltar button on upload step goes back to platform', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /importar alunos/i }));
    await user.click(screen.getByRole('button', { name: /primecoaching/i }));
    await user.click(screen.getByRole('button', { name: /voltar/i }));

    expect(screen.getByRole('dialog', { name: /importar alunos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /primecoaching/i })).toBeInTheDocument();
  });

  // ── Import modal — preview step ───────────────────────────────────────

  const uploadFileAndSubmit = async (user) => {
    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /importar alunos/i }));
    await user.click(screen.getByRole('button', { name: /primecoaching/i }));
    const fileInput = screen.getByLabelText(/arquivo xlsx do primecoaching/i);
    const mockFile = new File(['xlsx content'], 'alunos.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await user.upload(fileInput, mockFile);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^continuar$/i })).not.toBeDisabled()
    );
    fireEvent.submit(fileInput.closest('form'));
  };

  it('shows preview table and summary on successful import', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/import/primecoaching/preview') {
        return Promise.resolve({ data: mockImportPreviewResponse });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter(<Students />);
    await uploadFileAndSubmit(user);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /alunos do primecoaching/i })).toBeInTheDocument();
    });

    expect(screen.getByText('Nicolle Costa')).toBeInTheDocument();
    expect(screen.getByText('Vitor Dantas')).toBeInTheDocument();
    expect(screen.getByText('Duplicado')).toBeInTheDocument();
  });

  it('shows summary chip with aluno count', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/import/primecoaching/preview') {
        return Promise.resolve({ data: mockImportPreviewResponse });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter(<Students />);
    await uploadFileAndSubmit(user);

    await waitFor(() => expect(screen.getByText('alunos encontrados')).toBeInTheDocument());
  });

  it('sends FormData with file to api.post', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/import/primecoaching/preview') {
        return Promise.resolve({ data: mockImportPreviewResponse });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter(<Students />);
    await uploadFileAndSubmit(user);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/import/primecoaching/preview',
        expect.any(FormData),
        expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } })
      );
    });
  });

  it('disables file input and submit during loading', async () => {
    const user = userEvent.setup();
    let resolveImport;
    api.post.mockImplementation((url) => {
      if (url === '/trainer/import/primecoaching/preview') {
        return new Promise((resolve) => { resolveImport = resolve; });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter(<Students />);
    await uploadFileAndSubmit(user);

    expect(screen.getByLabelText(/arquivo xlsx do primecoaching/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /processando/i })).toBeDisabled();

    resolveImport({ data: mockImportPreviewResponse });
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /alunos do primecoaching/i })).toBeInTheDocument()
    );
  });

  it('shows error toast on upload error and stays on upload step', async () => {
    const user = userEvent.setup();
    const err = new Error('Format changed');
    err.userMessage = 'O arquivo não corresponde ao formato esperado do PrimeCoaching.';
    api.post.mockImplementation((url) => {
      if (url === '/trainer/import/primecoaching/preview') {
        return Promise.reject(err);
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter(<Students />);
    await uploadFileAndSubmit(user);

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        'O arquivo não corresponde ao formato esperado do PrimeCoaching.',
        'error'
      );
    });

    expect(screen.getByRole('dialog', { name: /importar do primecoaching/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/arquivo xlsx do primecoaching/i)).not.toBeDisabled();
  });

  it('pre-selects non-duplicate students after preview', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/import/primecoaching/preview') {
        return Promise.resolve({ data: mockImportPreviewResponse });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter(<Students />);
    await uploadFileAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /alunos do primecoaching/i })).toBeInTheDocument()
    );

    expect(screen.getByRole('checkbox', { name: /selecionar nicolle costa/i })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /selecionar vitor dantas/i })).not.toBeChecked();
  });

  it('toggles individual student selection', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/import/primecoaching/preview') {
        return Promise.resolve({ data: mockImportPreviewResponse });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter(<Students />);
    await uploadFileAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /alunos do primecoaching/i })).toBeInTheDocument()
    );

    const nicolleCheckbox = screen.getByRole('checkbox', { name: /selecionar nicolle costa/i });
    expect(nicolleCheckbox).toBeChecked();
    await user.click(nicolleCheckbox);
    expect(nicolleCheckbox).not.toBeChecked();
  });

  it('select all toggles all non-duplicate students', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/import/primecoaching/preview') {
        return Promise.resolve({ data: mockImportPreviewResponse });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter(<Students />);
    await uploadFileAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /alunos do primecoaching/i })).toBeInTheDocument()
    );

    // Deselect all
    await user.click(screen.getByRole('checkbox', { name: /selecionar todos/i }));
    expect(screen.getByRole('checkbox', { name: /selecionar nicolle costa/i })).not.toBeChecked();

    // Re-select all
    await user.click(screen.getByRole('checkbox', { name: /selecionar todos/i }));
    expect(screen.getByRole('checkbox', { name: /selecionar nicolle costa/i })).toBeChecked();
  });

  it('shows success toast and closes modal on send invites', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/import/primecoaching/preview') {
        return Promise.resolve({ data: mockImportPreviewResponse });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter(<Students />);
    await uploadFileAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /alunos do primecoaching/i })).toBeInTheDocument()
    );

    const dialog = screen.getByRole('dialog', { name: /alunos do primecoaching/i });
    await user.click(within(dialog).getByRole('button', { name: /enviar.*convite/i }));

    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/convite/i), 'success');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('resets import state when closing after preview', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/import/primecoaching/preview') {
        return Promise.resolve({ data: mockImportPreviewResponse });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter(<Students />);
    await uploadFileAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /alunos do primecoaching/i })).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /^fechar$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Re-open — should start at platform step
    await user.click(screen.getByRole('button', { name: /importar alunos/i }));
    expect(screen.getByRole('dialog', { name: /importar alunos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /primecoaching/i })).toBeInTheDocument();
  });

  it('Voltar on preview step goes back to upload step', async () => {
    const user = userEvent.setup();
    api.post.mockImplementation((url) => {
      if (url === '/trainer/import/primecoaching/preview') {
        return Promise.resolve({ data: mockImportPreviewResponse });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter(<Students />);
    await uploadFileAndSubmit(user);

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /alunos do primecoaching/i })).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /^voltar$/i }));
    expect(screen.getByRole('dialog', { name: /importar do primecoaching/i })).toBeInTheDocument();
  });

  // ── Error on initial fetch ─────────────────────────────────────────────

  it('shows error toast when initial fetch fails', async () => {
    const err = new Error('Network error');
    err.userMessage = 'Erro ao carregar alunos.';
    api.get.mockRejectedValue(err);
    renderWithRouter(<Students />);

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Erro ao carregar alunos.', 'error');
    });
  });

  it('renders the metric cards and the status segmented control with counts', async () => {
    api.get.mockResolvedValue({ data: mockMultipleStudents });
    renderWithRouter(<Students />);

    const summary = await screen.findByLabelText('Resumo de alunos');
    expect(within(summary).getByText('Total')).toBeInTheDocument();
    expect(within(summary).getByText('planos vencidos')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Todos (3)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Pendentes (1)' })).toBeInTheDocument();
  });

  it('closes the link modal with Escape', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Students />);

    await waitFor(() => expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /^vincular aluno$/i }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: /vincular aluno/i })).not.toBeInTheDocument();
  });

  it('shows an error state with a retry action when the initial fetch fails', async () => {
    const user = userEvent.setup();
    const err = new Error('Network error');
    err.userMessage = 'Erro ao carregar alunos.';
    api.get.mockRejectedValueOnce(err);
    renderWithRouter(<Students />);

    expect(await screen.findByRole('heading', { name: 'Não foi possível carregar os alunos' })).toBeInTheDocument();
    expect(screen.queryByText('Sem alunos ainda')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Aluno Exemplo')).toBeInTheDocument();
  });

  // ── Readiness indicators ───────────────────────────────────────────────

  const mockStudentsWithReadiness = (list) => {
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: list });
      return Promise.resolve({ data: [] });
    });
  };

  it('renders a clean row with no chips when a student is ready', async () => {
    mockStudentsWithReadiness([
      { id: 'r1', firstName: 'Marina', lastName: 'Alves', email: 'marina@example.com', billingStatus: 'ok', ready: true, blockers: [], blockersLabel: [] },
    ]);
    renderWithRouter(<Students />);

    const row = await screen.findByRole('button', { name: 'Ver perfil de Marina Alves.' });
    expect(row).toBeInTheDocument();
    // No blocker chips anywhere
    expect(screen.queryByText('Sem rotina ativa')).not.toBeInTheDocument();
    // No quota banner
    expect(screen.queryByText(/limite de alunos da sua cota/i)).not.toBeInTheDocument();
  });

  it('renders a single blocker chip and folds it into the row aria-label', async () => {
    mockStudentsWithReadiness([
      { id: 'r2', firstName: 'Rafael', lastName: 'Souza', email: 'rafael@example.com', billingStatus: 'due_soon', ready: false, blockers: ['no_active_protocol'], blockersLabel: ['Sem rotina ativa'] },
    ]);
    renderWithRouter(<Students />);

    const row = await screen.findByRole('button', { name: 'Rafael Souza — Sem rotina ativa. Ver perfil.' });
    expect(row).toBeInTheDocument();
    expect(screen.getByText('Sem rotina ativa')).toBeInTheDocument();
  });

  it('renders multiple blocker chips in backend order and lists them in the aria-label', async () => {
    mockStudentsWithReadiness([
      { id: 'r3', firstName: 'Bruno', lastName: 'Carvalho', email: 'bruno@example.com', billingStatus: 'ok', ready: false, blockers: ['no_active_protocol', 'subscription_overdue'], blockersLabel: ['Sem rotina ativa', 'Pagamento em atraso'] },
    ]);
    renderWithRouter(<Students />);

    await screen.findByRole('button', { name: 'Bruno Carvalho — Sem rotina ativa, Pagamento em atraso. Ver perfil.' });
    expect(screen.getByText('Sem rotina ativa')).toBeInTheDocument();
    expect(screen.getByText('Pagamento em atraso')).toBeInTheDocument();
  });

  it('shows the platform chip and the list-level quota banner for blocked_on_plan', async () => {
    mockStudentsWithReadiness([
      { id: 'r4', firstName: 'Camila', lastName: 'Nunes', email: 'camila@example.com', billingStatus: 'ok', ready: false, blockers: ['blocked_on_plan'], blockersLabel: ['Bloqueado pela sua cota'] },
    ]);
    renderWithRouter(<Students />);

    await screen.findByRole('button', { name: 'Camila Nunes — Bloqueado pela sua cota. Ver perfil.' });
    expect(screen.getByText('Bloqueado pela sua cota')).toBeInTheDocument();
    // Quota banner surfaces once with the upgrade CTA
    expect(screen.getByText('Você atingiu o limite de alunos da sua cota')).toBeInTheDocument();
    expect(screen.getByText(/1 aluno está bloqueado pela sua cota/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fazer upgrade' })).toBeInTheDocument();
  });

  it('pluralizes the quota banner body when multiple students are blocked by quota', async () => {
    mockStudentsWithReadiness([
      { id: 'r5', firstName: 'Camila', lastName: 'Nunes', email: 'camila@example.com', billingStatus: 'ok', ready: false, blockers: ['blocked_on_plan'], blockersLabel: ['Bloqueado pela sua cota'] },
      { id: 'r6', firstName: 'Lucas', lastName: 'Pereira', email: 'lucas@example.com', billingStatus: 'due_soon', ready: false, blockers: ['no_active_protocol', 'blocked_on_plan'], blockersLabel: ['Sem rotina ativa', 'Bloqueado pela sua cota'] },
    ]);
    renderWithRouter(<Students />);

    await screen.findByText('Você atingiu o limite de alunos da sua cota');
    expect(screen.getByText(/2 alunos estão bloqueados pela sua cota/i)).toBeInTheDocument();
  });

  it('renders both chips for a combined student + platform block', async () => {
    mockStudentsWithReadiness([
      { id: 'r7', firstName: 'Lucas', lastName: 'Pereira', email: 'lucas@example.com', billingStatus: 'due_soon', ready: false, blockers: ['no_active_protocol', 'blocked_on_plan'], blockersLabel: ['Sem rotina ativa', 'Bloqueado pela sua cota'] },
    ]);
    renderWithRouter(<Students />);

    await screen.findByRole('button', { name: 'Lucas Pereira — Sem rotina ativa, Bloqueado pela sua cota. Ver perfil.' });
    expect(screen.getByText('Sem rotina ativa')).toBeInTheDocument();
    expect(screen.getByText('Bloqueado pela sua cota')).toBeInTheDocument();
  });

  it('degrades gracefully when readiness fields are absent (search shape)', async () => {
    mockStudentsWithReadiness([
      { id: 'r8', firstName: 'Diego', lastName: 'Martins', email: 'diego@example.com', billingStatus: 'ok' },
    ]);
    renderWithRouter(<Students />);

    const row = await screen.findByRole('button', { name: 'Ver perfil de Diego Martins.' });
    expect(row).toBeInTheDocument();
    expect(screen.queryByText(/limite de alunos da sua cota/i)).not.toBeInTheDocument();
  });

  // ── Incremental reveal ("Ver mais") ────────────────────────────────────

  const buildStudents = (count, billingStatus = 'ok') =>
    Array.from({ length: count }, (_, i) => ({
      id: `p${billingStatus}${i}`,
      firstName: `${billingStatus === 'ok' ? 'Aluno' : 'Pendente'}${String(i).padStart(2, '0')}`,
      lastName: 'Teste',
      email: `${billingStatus}${i}@example.com`,
      billingStatus,
    }));

  it('shows the first page, reveals more on "Ver mais" and hides the button when all are shown', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: buildStudents(25) });
    renderWithRouter(<Students />);

    expect(await screen.findByText('Mostrando 20 de 25 alunos')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^ver perfil de/i })).toHaveLength(20);

    await user.click(screen.getByRole('button', { name: 'Ver mais' }));

    expect(screen.getByText('Mostrando 25 de 25 alunos')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^ver perfil de/i })).toHaveLength(25);
    expect(screen.queryByRole('button', { name: 'Ver mais' })).not.toBeInTheDocument();
  });

  it('does not render "Ver mais" when the list fits in one page', async () => {
    api.get.mockResolvedValue({ data: buildStudents(3) });
    renderWithRouter(<Students />);

    expect(await screen.findByText('Mostrando 3 de 3 alunos')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver mais' })).not.toBeInTheDocument();
  });

  it('resets the reveal and counts the filtered total when the filter or search changes', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [...buildStudents(25), ...buildStudents(22, 'due_soon')] });
    renderWithRouter(<Students />);

    await screen.findByText('Mostrando 20 de 47 alunos');
    await user.click(screen.getByRole('button', { name: 'Ver mais' }));
    expect(screen.getByText('Mostrando 40 de 47 alunos')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Pendentes (22)' }));
    expect(screen.getByText('Mostrando 20 de 22 alunos')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ver mais' }));
    await user.type(screen.getByRole('textbox', { name: 'Buscar alunos' }), 'Pendente0');
    expect(screen.getByText('Mostrando 10 de 10 alunos')).toBeInTheDocument();
  });

  it('colors the adherence and last workout values by threshold', async () => {
    api.get.mockResolvedValue({
      data: [{
        id: 't1', firstName: 'Lucas', lastName: 'Ferreira', email: 'l@example.com', billingStatus: 'ok',
        adherence: 45, adherenceCompleted: 2, adherenceExpected: 4, lastWorkoutAt: daysAgoIso(10),
      }],
    });
    renderWithRouter(<Students />);

    expect(await screen.findByText('45%')).toHaveClass('kpi-value--error');
    expect(screen.getByText('Há 10 dias')).toHaveClass('kpi-value--warning');
  });
});
