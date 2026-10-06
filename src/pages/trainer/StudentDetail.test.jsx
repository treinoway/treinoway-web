import userEvent from '@testing-library/user-event';
import { selectOption } from '../../test-utils/selectOption';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { act, render, renderWithRoute, screen, waitFor, within } from '../../test/test-utils';
import StudentDetail from './StudentDetail';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAiChat } from '../../contexts/AiChatContext';
import api from '../../api/axios';
import { buildAnamnesisLink, linkResponses } from '../../test/anamnesisLinkFixtures';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../contexts/AiChatContext', () => ({ useAiChat: vi.fn() }));

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const block = (data = null, overrides = {}) => ({ data, loading: false, error: null, ...overrides });
const emptyDashboard = () => ({
  summary: block(),
  recentSessions: block(),
  progression: block(),
  dailyActivity: block(),
  studentNotFound: false,
});
let mockDashboard = emptyDashboard();
const mockRetryBlock = vi.fn();

vi.mock('../../hooks/useStudentDashboard', () => ({
  default: () => ({ ...mockDashboard, retryBlock: mockRetryBlock }),
}));

vi.mock('../../hooks/usePeriodPersistence', () => ({
  default: () => [
    { presetKey: 'last-30-days', from: '2026-04-15', to: '2026-05-15' },
    vi.fn(),
  ],
}));

vi.mock('../../components/PeriodPickerSheet', () => ({
  default: ({ open, onApply, onCancel }) =>
    open ? (
      <div data-testid="period-picker">
        <button onClick={() => onApply({ presetKey: 'last-30-days', from: '2026-04-15', to: '2026-05-15' })}>
          Aplicar
        </button>
        <button onClick={onCancel}>Fechar picker</button>
      </div>
    ) : null,
}));

vi.mock('../../components/IArnoldFAB', () => ({
  default: ({ onClick, label }) => <button type="button" onClick={onClick}>{label}</button>,
}));

vi.mock('../../components/finance/AssignPlanSheet', () => ({
  default: ({ mode, onAssign }) => (
    <div role="dialog" aria-label={`Plano (${mode})`}>
      <button type="button" onClick={() => onAssign({ planId: 'plan-1', startDate: '2026-10-04' })}>Confirmar plano</button>
    </div>
  ),
}));

const mockStudent = {
  id: 'student-1',
  firstName: 'Aluno',
  lastName: 'Exemplo',
  email: 'aluno@example.com',
  lastWorkoutAt: null,
};

const mockProtocols = [
  { id: 'proto-1', name: 'Rotina Ativa', status: 'active', startDate: '2025-01-01', expirationDate: '2025-03-31' },
  { id: 'proto-2', name: 'Rotina Concluída', status: 'completed', startDate: '2024-07-01', expirationDate: '2024-09-30' },
];

const mockSubscription = { id: 'sub-1', planId: 'plan-1', recurrence: 'quarterly' };
const mockPlans = [{ id: 'plan-1', name: 'Plano trimestral', isArchived: false }];

const mockShowToast = vi.fn();
const mockSendMessage = vi.fn();

function setupMocks(overrides = {}) {
  vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'trainer-1', firstName: 'João', lastName: 'Lucas' } });
  vi.mocked(useAiChat).mockReturnValue({ sendMessage: mockSendMessage });

  const routes = {
    '/trainer/students': [mockStudent],
    '/trainer/students/student-1': overrides.student ?? mockStudent,
    '/trainer/protocols': overrides.protocols ?? mockProtocols,
    '/trainer/students/student-1/anamneses': overrides.anamneses ?? [],
    '/trainer/anamneses': overrides.allAnamneses ?? [],
    '/trainer/students/student-1/subscriptions/active': 'subscription' in overrides ? overrides.subscription : null,
    '/trainer/students/student-1/payments': { student: { id: 'student-1', name: 'Aluno Exemplo' }, summary: null, payments: overrides.payments ?? [] },
    '/trainer/subscription-plans': mockPlans,
  };
  api.get.mockImplementation((url) => Promise.resolve({ data: url in routes ? routes[url] : [] }));
}

// Renders and lets the mocked fetches settle so their state updates land inside act().
async function renderDetail({ withState = true } = {}) {
  const route = withState
    ? { pathname: '/trainer/students/student-1', state: { student: mockStudent } }
    : '/trainer/students/student-1';
  const view = renderWithRoute(<StudentDetail />, { route, path: '/trainer/students/:id' });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return view;
}

describe('StudentDetail (cockpit)', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    mockNavigate.mockReset();
    mockSendMessage.mockReset();
    mockRetryBlock.mockReset();
    api.get.mockReset();
    api.post.mockReset();
    api.delete.mockReset();
    mockDashboard = emptyDashboard();
    setupMocks();
  });

  describe('header', () => {
    it('renders immediately without blocking on the student fetch', async () => {
      api.get.mockReturnValue(new Promise(() => {}));
      await renderDetail({ withState: false });
      expect(screen.getByRole('button', { name: /voltar para alunos/i })).toBeInTheDocument();
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
    });

    it('back button navigates to /trainer/students', async () => {
      const user = userEvent.setup();
      await renderDetail();
      await user.click(screen.getByRole('button', { name: /voltar para alunos/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/trainer/students');
    });

    it('shows the student, the active routine, the plan and the trainer in charge', async () => {
      setupMocks({ subscription: mockSubscription });
      await renderDetail();
      expect(screen.getByRole('heading', { level: 1, name: 'Aluno Exemplo' })).toBeInTheDocument();
      expect(screen.getByText('aluno@example.com')).toBeInTheDocument();
      expect(await screen.findByText('Rotina Ativa · Plano trimestral')).toBeInTheDocument();
      expect(screen.getByText('João Lucas')).toBeInTheDocument();
    });

    it('fetches the student by id (not the whole roster) when there is no location state', async () => {
      await renderDetail({ withState: false });
      expect(await screen.findByRole('heading', { level: 1, name: 'Aluno Exemplo' })).toBeInTheDocument();
      expect(api.get).toHaveBeenCalledWith('/trainer/students/student-1');
      expect(api.get).not.toHaveBeenCalledWith('/trainer/students');
    });

    it('renders the router-state student instantly and still refreshes it by id', async () => {
      let resolveStudent;
      setupMocks();
      const routeGet = api.get.getMockImplementation();
      api.get.mockImplementation((url, config) => (url === '/trainer/students/student-1'
        ? new Promise((resolve) => { resolveStudent = resolve; })
        : routeGet(url, config)));
      await renderDetail();
      expect(screen.getByRole('heading', { level: 1, name: 'Aluno Exemplo' })).toBeInTheDocument();
      expect(api.get).toHaveBeenCalledWith('/trainer/students/student-1');

      await act(async () => { resolveStudent({ data: { ...mockStudent, firstName: 'Aluna', lastName: 'Atualizada' } }); });
      expect(screen.getByRole('heading', { level: 1, name: 'Aluna Atualizada' })).toBeInTheDocument();
    });

    it('renders the not-found state when the student is not linked (404 student.notLinked)', async () => {
      const user = userEvent.setup();
      setupMocks();
      const routeGet = api.get.getMockImplementation();
      api.get.mockImplementation((url, config) => (url === '/trainer/students/student-1'
        ? Promise.reject({ response: { status: 404, data: { error: 'NOT_FOUND', messageCode: 'student.notLinked', message: 'No link' } } })
        : routeGet(url, config)));
      await renderDetail({ withState: false });
      expect(await screen.findByRole('heading', { name: 'Aluno não encontrado' })).toBeInTheDocument();
      expect(mockShowToast).not.toHaveBeenCalled();
      await user.click(screen.getByRole('button', { name: 'Voltar para alunos' }));
      expect(mockNavigate).toHaveBeenCalledWith('/trainer/students');
    });

    it('renders the not-found state for an unknown student', async () => {
      const user = userEvent.setup();
      mockDashboard = { ...emptyDashboard(), studentNotFound: true };
      await renderDetail();
      expect(screen.getByRole('heading', { name: 'Aluno não encontrado' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Voltar para alunos' }));
      expect(mockNavigate).toHaveBeenCalledWith('/trainer/students');
    });

    it('does not render dropped mockup cards without a data source', async () => {
      await renderDetail();
      expect(screen.queryByText(/risco alto de cancelamento/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/progresso no treino/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/whatsapp/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/destaques/i)).not.toBeInTheDocument();
    });
  });

  describe('Aderência e relacionamento', () => {
    it('shows adherence from the dashboard summary', async () => {
      mockDashboard = {
        ...emptyDashboard(),
        summary: block({ adherence: 75, adherenceCompleted: 6, adherenceExpected: 8, previousAdherence: null }),
      };
      await renderDetail();
      const section = screen.getByRole('region', { name: 'Aderência e relacionamento' });
      expect(within(section).getByText('75%')).toBeInTheDocument();
      expect(within(section).getByText('6/8 treinos')).toBeInTheDocument();
    });

    it('shows "Nunca" for a student who never trained', async () => {
      await renderDetail();
      const section = screen.getByRole('region', { name: 'Aderência e relacionamento' });
      expect(within(section).getByText('Nunca')).toBeInTheDocument();
    });

    it('shows "Nunca" while the API does not return lastWorkoutAt yet', async () => {
      const studentWithoutLastWorkout = { ...mockStudent };
      delete studentWithoutLastWorkout.lastWorkoutAt;
      setupMocks({ student: studentWithoutLastWorkout });
      await renderDetail({ withState: false });
      await screen.findByRole('heading', { level: 1, name: 'Aluno Exemplo' });
      const section = screen.getByRole('region', { name: 'Aderência e relacionamento' });
      expect(within(section).getByText('Nunca')).toBeInTheDocument();
    });

    it('shows the last session from the fetched student', async () => {
      setupMocks({ student: { ...mockStudent, lastWorkoutAt: new Date().toISOString() } });
      await renderDetail({ withState: false });
      const section = screen.getByRole('region', { name: 'Aderência e relacionamento' });
      expect(await within(section).findByText('Hoje')).toBeInTheDocument();
    });

    it('assigns a plan when the student has none', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: { ...mockSubscription, firstPayment: null } });
      await renderDetail();
      const section = screen.getByRole('region', { name: 'Aderência e relacionamento' });
      await user.click(await within(section).findByRole('button', { name: 'Atribuir plano' }));
      await user.click(within(screen.getByRole('dialog', { name: 'Plano (assign)' })).getByRole('button', { name: 'Confirmar plano' }));
      await waitFor(() => expect(api.post).toHaveBeenCalledWith(
        '/trainer/students/student-1/subscriptions',
        { planId: 'plan-1', startDate: '2026-10-04' },
      ));
      expect(mockShowToast).toHaveBeenCalledWith('Plano atribuído. Primeira cobrança: —.', 'success');
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Plano (assign)' })).not.toBeInTheDocument());
    });

    it('has no subscription menu on the renewal metric (actions live in the Assinatura block)', async () => {
      setupMocks({ subscription: mockSubscription, payments: [] });
      await renderDetail();
      await screen.findByRole('button', { name: 'Trocar plano' });
      const section = screen.getByRole('region', { name: 'Aderência e relacionamento' });
      expect(within(section).queryByRole('button', { name: 'Ações da assinatura' })).not.toBeInTheDocument();
      expect(within(section).queryByRole('button', { name: /Ver histórico/ })).not.toBeInTheDocument();
      expect(within(section).queryByRole('button', { name: 'Trocar plano' })).not.toBeInTheDocument();
      expect(within(section).queryByRole('button', { name: 'Cancelar assinatura' })).not.toBeInTheDocument();
    });
  });

  describe('Assinatura', () => {
    const overdueCharge = {
      id: 'pay-late', subscriptionId: 'sub-1', cycleStartDate: '2026-09-01', cycleEndDate: '2026-09-30',
      dueDate: '2026-09-01', amount: '99.90', status: 'pending', effectiveStatus: 'overdue', daysOverdue: 5,
      paidAt: null, voidedAt: null, notes: null, subscriptionStatus: 'active',
      plan: { id: 'plan-1', name: 'Plano trimestral', recurrence: 'quarterly' },
    };

    it('replaces the plan from the block with a single assignment, without cancelling first', async () => {
      const user = userEvent.setup();
      setupMocks({ subscription: mockSubscription });
      api.post.mockResolvedValue({ data: { id: 'sub-2', planId: 'plan-1', firstPayment: null } });
      await renderDetail();
      const block = await screen.findByRole('region', { name: 'Assinatura' });
      await user.click(await within(block).findByRole('button', { name: 'Trocar plano' }));
      await user.click(within(screen.getByRole('dialog', { name: 'Plano (replace)' })).getByRole('button', { name: 'Confirmar plano' }));
      await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Plano trocado. Primeira cobrança: —.', 'success'));
      expect(api.post).toHaveBeenCalledTimes(1);
      expect(api.post).toHaveBeenCalledWith('/trainer/students/student-1/subscriptions', { planId: 'plan-1', startDate: '2026-10-04' });
      expect(api.post).not.toHaveBeenCalledWith('/trainer/subscriptions/sub-1/cancel', expect.anything());
    });

    it('cancels the subscription from the block after confirmation', async () => {
      const user = userEvent.setup();
      setupMocks({ subscription: mockSubscription });
      api.post.mockResolvedValue({ data: {} });
      await renderDetail();
      await user.click(await screen.findByRole('button', { name: 'Mais ações da assinatura' }));
      await user.click(screen.getByRole('button', { name: 'Cancelar assinatura' }));
      const dialog = screen.getByRole('alertdialog');
      await user.click(within(dialog).getByRole('button', { name: 'Cancelar assinatura' }));
      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/trainer/subscriptions/sub-1/cancel', {}));
      expect(mockShowToast).toHaveBeenCalledWith('Assinatura cancelada.', 'success');
    });

    it('keeps the subscription when the cancel dialog is dismissed', async () => {
      const user = userEvent.setup();
      setupMocks({ subscription: mockSubscription });
      await renderDetail();
      await user.click(await screen.findByRole('button', { name: 'Mais ações da assinatura' }));
      await user.click(screen.getByRole('button', { name: 'Cancelar assinatura' }));
      await user.click(screen.getByRole('button', { name: 'Voltar' }));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('opens the subscription history from the block', async () => {
      const user = userEvent.setup();
      setupMocks({ subscription: mockSubscription, payments: [overdueCharge] });
      await renderDetail();
      const block = await screen.findByRole('region', { name: 'Assinatura' });
      await user.click(await within(block).findByRole('button', { name: 'Ver histórico' }));
      expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1/subscription-history', {
        state: { studentName: 'Aluno Exemplo' },
      });
      expect(screen.getAllByRole('button', { name: 'Ver histórico' })).toHaveLength(1);
    });

    it('loads the subscription and every student payment, never the per-subscription endpoint', async () => {
      setupMocks({ subscription: mockSubscription, payments: [overdueCharge] });
      await renderDetail();
      const block = await screen.findByRole('region', { name: 'Assinatura' });
      expect(within(block).getByRole('heading', { level: 3, name: 'Plano trimestral' })).toBeInTheDocument();
      expect(within(block).getByText('Atrasada · 5 dias')).toBeInTheDocument();
      expect(api.get).toHaveBeenCalledWith('/trainer/students/student-1/payments');
      expect(api.get).not.toHaveBeenCalledWith('/trainer/subscriptions/sub-1/payments');
    });

    it('flags the renewal metric as overdue from the API status', async () => {
      setupMocks({ subscription: mockSubscription, payments: [overdueCharge] });
      await renderDetail();
      const section = screen.getByRole('region', { name: 'Aderência e relacionamento' });
      expect(await within(section).findByText('Venceu há')).toBeInTheDocument();
      expect(within(section).getByText('5 dias')).toBeInTheDocument();
    });

    it('marks an open charge paid inline and reloads the block', async () => {
      const user = userEvent.setup();
      setupMocks({ subscription: mockSubscription, payments: [overdueCharge] });
      api.post.mockResolvedValue({ data: {} });
      await renderDetail();
      const block = await screen.findByRole('region', { name: 'Assinatura' });
      await user.click(within(block).getByRole('button', { name: /^Marcar pago: cobrança de/ }));
      expect(api.post).toHaveBeenCalledWith('/trainer/payments/pay-late/mark-paid', {});
      await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith(
        'Pagamento registrado.', 'success', expect.objectContaining({ actionLabel: 'Desfazer' }),
      ));
    });

    it('offers "Atribuir plano" in the block when the student has no plan', async () => {
      await renderDetail();
      const block = await screen.findByRole('region', { name: 'Assinatura' });
      expect(within(block).getByText('Sem plano ativo')).toBeInTheDocument();
      expect(within(block).getByRole('button', { name: 'Atribuir plano' })).toBeInTheDocument();
    });
  });

  describe('Rotinas', () => {
    it('lists the routines, active first', async () => {
      await renderDetail();
      const active = await screen.findByRole('button', { name: 'Abrir rotina Rotina Ativa' });
      const completed = screen.getByRole('button', { name: 'Abrir rotina Rotina Concluída' });
      expect(active.compareDocumentPosition(completed) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('opens a routine', async () => {
      const user = userEvent.setup();
      await renderDetail();
      await user.click(await screen.findByRole('button', { name: 'Abrir rotina Rotina Ativa' }));
      expect(mockNavigate).toHaveBeenCalledWith('/trainer/protocols/proto-1');
    });

    it('"Ver todas" navigates to the protocols sub-route', async () => {
      const user = userEvent.setup();
      await renderDetail();
      await user.click(screen.getByRole('button', { name: /ver todas as rotinas/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1/protocols');
    });

    it('"Nova rotina" navigates to the new protocol route with the student', async () => {
      const user = userEvent.setup();
      await renderDetail();
      await user.click(await screen.findByRole('button', { name: 'Nova rotina' }));
      expect(mockNavigate).toHaveBeenCalledWith('/trainer/protocols/new?studentId=student-1');
    });

    it('shows the empty state without routines', async () => {
      setupMocks({ protocols: [] });
      await renderDetail();
      expect(await screen.findByText('Sem rotinas ainda')).toBeInTheDocument();
    });
  });

  describe('Anamneses', () => {
    it('"Ver todas (n)" navigates to the anamneses sub-route', async () => {
      const user = userEvent.setup();
      setupMocks({ anamneses: [buildAnamnesisLink({ id: 'anam-1', title: 'Anamnese de Saúde', response: linkResponses.submitted, canFill: true })] });
      await renderDetail();
      await user.click(await screen.findByRole('button', { name: 'Ver todas as 1 anamneses' }));
      expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1/anamneses');
    });

    it('fills and views responses from the row menu', async () => {
      const user = userEvent.setup();
      setupMocks({ anamneses: [buildAnamnesisLink({ id: 'anam-1', title: 'Anamnese de Saúde', response: linkResponses.submitted, canFill: true })] });
      await renderDetail();
      await user.click(await screen.findByRole('button', { name: 'Opções da anamnese Anamnese de Saúde' }));
      await user.click(screen.getByRole('button', { name: 'Preencher com o aluno' }));
      expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1/anamneses/anam-1/fill');

      await user.click(screen.getByRole('button', { name: 'Opções da anamnese Anamnese de Saúde' }));
      await user.click(screen.getByRole('button', { name: 'Ver respostas' }));
      expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1/anamneses/anam-1/response');
    });

    it('links an anamnesis through the modal and offers to fill it', async () => {
      const user = userEvent.setup();
      setupMocks({ allAnamneses: [{ id: 'anam-1', title: 'Anamnese de Saúde', isGeneral: false }] });
      api.post.mockResolvedValue({ data: {} });
      await renderDetail();
      await user.click(await screen.findByRole('button', { name: 'Vincular anamnese' }));
      const dialog = await screen.findByRole('dialog', { name: 'Vincular anamnese' });
      await selectOption(user, within(dialog).getByLabelText('Selecionar anamnese'), 'anam-1');
      await user.click(screen.getByRole('button', { name: 'Vincular' }));
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/trainer/students/student-1/anamneses', { anamnesisId: 'anam-1' });
        expect(mockShowToast).toHaveBeenCalledWith(
          'Anamnese vinculada com sucesso!',
          'success',
          expect.objectContaining({ actionLabel: 'Preencher agora' }),
        );
      });
      expect(screen.queryByRole('dialog', { name: 'Vincular anamnese' })).not.toBeInTheDocument();
      mockShowToast.mock.calls[0][2].onAction();
      expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1/anamneses/anam-1/fill');
    });

    it('closes the link modal on cancel without linking', async () => {
      const user = userEvent.setup();
      await renderDetail();
      await user.click(await screen.findByRole('button', { name: 'Vincular anamnese' }));
      await user.click(await screen.findByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByRole('dialog', { name: 'Vincular anamnese' })).not.toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('shows a toast when linking fails', async () => {
      const user = userEvent.setup();
      setupMocks({ allAnamneses: [{ id: 'anam-1', title: 'Anamnese de Saúde', isGeneral: true }] });
      api.post.mockRejectedValue({ userMessage: 'Anamnese já vinculada' });
      await renderDetail();
      await user.click(await screen.findByRole('button', { name: 'Vincular anamnese' }));
      const dialog = await screen.findByRole('dialog', { name: 'Vincular anamnese' });
      await selectOption(user, within(dialog).getByLabelText('Selecionar anamnese'), 'anam-1');
      await user.click(screen.getByRole('button', { name: 'Vincular' }));
      await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Anamnese já vinculada', 'error'));
    });
  });

  describe('Treino no período', () => {
    const sessions = [
      { id: 'sess-1', trainingName: 'Upper', status: 'completed', startedAt: '2026-05-10T13:00:00Z', noteText: null },
      { id: 'sess-2', trainingName: 'Lower', status: 'completed', startedAt: '2026-05-08T13:00:00Z', noteText: 'Semana corrida' },
    ];

    it('opens the period picker and closes it on cancel', async () => {
      const user = userEvent.setup();
      await renderDetail();
      await user.click(screen.getByRole('button', { name: /alterar período\. atual: últimos 30 dias/i }));
      expect(screen.getByTestId('period-picker')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Fechar picker' }));
      expect(screen.queryByTestId('period-picker')).not.toBeInTheDocument();
    });

    it('applies a period and closes the picker', async () => {
      const user = userEvent.setup();
      await renderDetail();
      await user.click(screen.getByRole('button', { name: /alterar período/i }));
      await user.click(screen.getByRole('button', { name: 'Aplicar' }));
      expect(screen.queryByTestId('period-picker')).not.toBeInTheDocument();
    });

    it('renders the volume chart from daily activity', async () => {
      mockDashboard = {
        ...emptyDashboard(),
        dailyActivity: block({ data: [{ date: '2026-05-10', status: 'completed', volumeKg: 1200, completedSets: 6, totalSets: 6 }] }),
      };
      await renderDetail();
      expect(screen.getByRole('group', { name: 'Volume por sessão' })).toBeInTheDocument();
    });

    it('retries the daily activity block', async () => {
      const user = userEvent.setup();
      mockDashboard = { ...emptyDashboard(), dailyActivity: block(null, { error: new Error('fail') }) };
      await renderDetail();
      await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
      expect(mockRetryBlock).toHaveBeenCalledWith('dailyActivity');
    });

    it('shows the latest student note and the recent sessions', async () => {
      const user = userEvent.setup();
      mockDashboard = { ...emptyDashboard(), recentSessions: block({ data: sessions }) };
      await renderDetail();
      expect(screen.getByRole('heading', { name: 'Última observação do aluno' })).toBeInTheDocument();
      expect(screen.getByText('“Semana corrida”')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /abrir sessão upper/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1/sessions/sess-1');
    });

    it('hides the note card when no session has a note', async () => {
      mockDashboard = { ...emptyDashboard(), recentSessions: block({ data: [sessions[0]] }) };
      await renderDetail();
      expect(screen.queryByRole('heading', { name: 'Última observação do aluno' })).not.toBeInTheDocument();
    });

    it('"Ver todas" sessions keeps the period in the URL', async () => {
      const user = userEvent.setup();
      mockDashboard = { ...emptyDashboard(), recentSessions: block({ data: sessions }) };
      await renderDetail();
      await user.click(screen.getByRole('button', { name: 'Ver todas as sessões' }));
      expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1/sessions?from=2026-04-15&to=2026-05-15');
    });

    it('opens an exercise progression keeping the period', async () => {
      const user = userEvent.setup();
      mockDashboard = {
        ...emptyDashboard(),
        progression: block({
          data: [{
            exerciseId: 'ex-1', exerciseName: 'Supino', hasLoad: true, trainingId: 'tr-1', trainingName: 'Upper',
            sessionCount: 3, latest: { maxLoad: 40 }, trend: { maxLoadDelta: 5, maxLoadDeltaPct: 14.29 }, loadHistory: [40, 35],
          }],
        }),
      };
      await renderDetail();
      await user.click(screen.getByRole('link', { name: /supino/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1/exercises/ex-1/progression?from=2026-04-15&to=2026-05-15');
    });
  });

  describe('navigating from student A to student B while mounted', () => {
    const studentA = { id: 'student-a', firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com', lastWorkoutAt: null };
    const studentB = { id: 'student-b', firstName: 'Bruno', lastName: 'Reis', email: 'bruno@example.com', lastWorkoutAt: null };

    const responsesFor = (student, routineName, subscription) => ({
      [`/trainer/students/${student.id}`]: student,
      [`/trainer/students/${student.id}/anamneses`]: [],
      [`/trainer/students/${student.id}/subscriptions/active`]: subscription,
      protocols: [{ id: `proto-${student.id}`, name: routineName, status: 'active', startDate: '2026-01-01', expirationDate: '2026-12-31' }],
    });

    const respond = (responses, url) => {
      if (url === '/trainer/protocols') return { data: responses.protocols };
      if (url === '/trainer/subscription-plans') return { data: mockPlans };
      return { data: url in responses ? responses[url] : [] };
    };

    const belongsToA = (url, config) => url.includes('student-a') || config?.params?.assigneeId === 'student-a';

    // Every request for student A hangs until `releaseA()`; student B answers immediately.
    const setupLateStudentA = () => {
      let releaseA;
      const gateA = new Promise((resolve) => { releaseA = resolve; });
      const aResponses = responsesFor(studentA, 'Rotina da Ana', { id: 'sub-a', planId: 'plan-1' });
      const bResponses = responsesFor(studentB, 'Rotina do Bruno', null);
      api.get.mockImplementation((url, config) => (belongsToA(url, config)
        ? gateA.then(() => respond(aResponses, url))
        : Promise.resolve(respond(bResponses, url))));
      return () => act(async () => { releaseA(); });
    };

    const renderAtStudentA = async () => {
      const router = createMemoryRouter(
        [{ path: '/trainer/students/:id', element: <StudentDetail /> }],
        { initialEntries: ['/trainer/students/student-a'] },
      );
      render(<RouterProvider router={router} />);
      await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
      return router;
    };

    it('shows student B and ignores student A responses that arrive late', async () => {
      const releaseA = setupLateStudentA();
      const router = await renderAtStudentA();

      await act(async () => { await router.navigate('/trainer/students/student-b'); });
      expect(await screen.findByRole('heading', { level: 1, name: 'Bruno Reis' })).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'Abrir rotina Rotina do Bruno' })).toBeInTheDocument();
      const relationship = () => screen.getByRole('region', { name: 'Aderência e relacionamento' });
      expect(await within(relationship()).findByRole('button', { name: 'Atribuir plano' })).toBeInTheDocument();

      await releaseA();

      expect(screen.getByRole('heading', { level: 1, name: 'Bruno Reis' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { level: 1, name: 'Ana Lima' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Abrir rotina Rotina da Ana' })).not.toBeInTheDocument();
      expect(within(relationship()).getByRole('button', { name: 'Atribuir plano' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Trocar plano' })).not.toBeInTheDocument();
    });

    it('drops student A data as soon as the route points to student B', async () => {
      const aResponses = responsesFor(studentA, 'Rotina da Ana', { id: 'sub-a', planId: 'plan-1' });
      const belongsToB = (url, config) => url.includes('student-b') || config?.params?.assigneeId === 'student-b';
      api.get.mockImplementation((url, config) => (belongsToB(url, config)
        ? new Promise(() => {})
        : Promise.resolve(respond(aResponses, url))));
      const router = await renderAtStudentA();
      expect(await screen.findByRole('heading', { level: 1, name: 'Ana Lima' })).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'Abrir rotina Rotina da Ana' })).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'Trocar plano' })).toBeInTheDocument();

      await act(async () => { await router.navigate('/trainer/students/student-b'); });

      expect(screen.queryByRole('heading', { level: 1, name: 'Ana Lima' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Abrir rotina Rotina da Ana' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Trocar plano' })).not.toBeInTheDocument();
      expect(api.get).toHaveBeenCalledWith('/trainer/students/student-b');
      expect(api.get).toHaveBeenCalledWith('/trainer/protocols', { params: { assigneeId: 'student-b' } });
      expect(api.get).toHaveBeenCalledWith('/trainer/students/student-b/anamneses');
      expect(api.get).toHaveBeenCalledWith('/trainer/students/student-b/subscriptions/active');
    });
  });

  it('asks iArnold about the student', async () => {
    const user = userEvent.setup();
    mockSendMessage.mockResolvedValue(undefined);
    await renderDetail();
    await user.click(screen.getByRole('button', { name: 'Perguntar ao iArnold' }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/ai-assistant');
    expect(mockSendMessage).toHaveBeenCalledWith('Como posso ajudar com Aluno Exemplo?');
  });
});
