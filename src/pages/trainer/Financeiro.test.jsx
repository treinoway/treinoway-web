import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen, waitFor, within } from '../../test/test-utils';
import Financeiro from './Financeiro';
import api from '../../api/axios';
import { useToast } from '../../contexts/ToastContext';
import { FINANCE_OVERDUE_EVENT } from '../../constants/finance';
import {
  apiError,
  makeKpis,
  makePayment,
  makePlan,
  overduePayment,
  paidPayment,
  pinFinanceClock,
} from '../../test/financeFixtures';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 }, isAuthenticated: true, hasRole: (role) => role === 'TRAINER' }),
}));

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

const pendingRow = makePayment({
  id: 'pay-pending',
  dueDate: '2026-10-10',
  student: { id: 'student-2', name: 'João Pereira', avatarUrl: null },
});

const buildOverview = (overrides = {}) => ({
  month: '2026-10',
  overdueGraceDays: 3,
  kpis: makeKpis(),
  payments: [overduePayment(), pendingRow, paidPayment()],
  ...overrides,
});

let overviewResponse;
let plansResponse;

const mockApi = () => {
  api.get.mockImplementation((url) => {
    if (url === '/professional/finance/overview') return overviewResponse();
    if (url === '/professional/subscription-plans') return plansResponse();
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
};

const LocationProbe = () => {
  const location = useLocation();
  return <output aria-label="location">{`${location.pathname}${location.search}`}</output>;
};

const HistoryProbe = () => {
  const location = useLocation();
  return <output aria-label="history state">{location.state?.studentName}</output>;
};

const renderPage = (route = '/financeiro') => render(
  <MemoryRouter initialEntries={[route]}>
    <Routes>
      <Route path="/financeiro" element={<><Financeiro /><LocationProbe /></>} />
      <Route
        path="/financeiro/alunos/:studentId"
        element={<><LocationProbe /><HistoryProbe /></>}
      />
    </Routes>
  </MemoryRouter>,
);

const waitForRows = () => screen.findByText('Maria Silva');

describe('Financeiro', () => {
  beforeEach(() => {
    pinFinanceClock();
    vi.clearAllMocks();
    localStorage.clear();
    useToast.mockReturnValue({ showToast: mockShowToast });
    overviewResponse = () => Promise.resolve({ data: buildOverview() });
    plansResponse = () => Promise.resolve({ data: [makePlan()] });
    mockApi();
  });

  afterEach(() => vi.useRealTimers());

  it('loads the month with exactly one overview request and no per-student calls', async () => {
    renderPage();
    await waitForRows();

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/professional/finance/overview', expect.objectContaining({ params: { month: '2026-10' } }));
    expect(screen.getByRole('heading', { level: 1, name: 'Financeiro' })).toBeInTheDocument();
  });

  it('shows skeletons (not empty states) before the overview resolves', () => {
    overviewResponse = () => new Promise(() => {});
    renderPage();
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText(/Sem cobranças/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mês anterior' })).toBeDisabled();
  });

  it('renders the API KPIs, labelling overdue and delinquency as "hoje"', async () => {
    renderPage();
    await waitForRows();

    const hero = screen.getByRole('region', { name: 'Resumo de outubro de 2026' });
    expect(within(hero).getByText('Recebido no mês')).toBeInTheDocument();
    expect(within(hero).getByText(/^R\$\s?1\.200,00$/)).toBeInTheDocument();
    expect(within(hero).getByText('12 pagamentos')).toBeInTheDocument();
    expect(within(hero).getByText('A receber')).toBeInTheDocument();
    expect(within(hero).getByText('Em atraso hoje')).toBeInTheDocument();
    expect(within(hero).getByText(/^R\$\s?199,80$/)).toBeInTheDocument();
    expect(within(hero).getByText('Inadimplência hoje')).toBeInTheDocument();
    expect(within(hero).getByText('13,3%')).toBeInTheDocument();
    expect(within(hero).getByText('2 de 15 alunos')).toBeInTheDocument();
  });

  it('explains the grace rule and the "hoje" scope using overdueGraceDays from the API', async () => {
    overviewResponse = () => Promise.resolve({ data: buildOverview({ overdueGraceDays: 5 }) });
    renderPage();
    await waitForRows();

    const hero = screen.getByRole('region', { name: 'Resumo de outubro de 2026' });
    expect(hero).toHaveTextContent('Uma cobrança entra em atraso 5 dias após o vencimento');
    expect(hero).toHaveTextContent('Em atraso e inadimplência mostram a posição de hoje');
  });

  it('groups rows Em atraso → Pendentes → Pagas with counts', async () => {
    renderPage();
    await waitForRows();

    const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
    expect(headings).toEqual(['Em atraso · 1', 'Pendentes · 1', 'Pagas · 1']);
    expect(screen.getByRole('tab', { name: 'Todas (3)' })).toHaveAttribute('aria-selected', 'true');
  });

  it('filters by status and writes it to the URL', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForRows();

    await user.click(screen.getByRole('tab', { name: 'Pendentes (1)' }));
    expect(screen.queryByText('Maria Silva')).not.toBeInTheDocument();
    expect(screen.getByText('João Pereira')).toBeInTheDocument();
    expect(screen.getByLabelText('location')).toHaveTextContent('status=pending');
  });

  it('opens pre-filtered from the dashboard link (?status=overdue)', async () => {
    renderPage('/financeiro?status=overdue');
    await waitForRows();
    expect(screen.queryByText('João Pereira')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Em atraso (1)' })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows "Ninguém em atraso." when the overdue filter is empty', async () => {
    overviewResponse = () => Promise.resolve({ data: buildOverview({ payments: [pendingRow] }) });
    renderPage('/financeiro?status=overdue');
    await screen.findByText('Ninguém em atraso.');
  });

  it('shows "Tudo em dia neste mês." when everything is paid', async () => {
    overviewResponse = () => Promise.resolve({ data: buildOverview({ payments: [paidPayment()] }) });
    renderPage();
    await screen.findByText('Tudo em dia neste mês.');
  });

  it('searches by student name (accent-insensitive, debounced)', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForRows();

    await user.type(screen.getByRole('textbox', { name: 'Buscar cobranças por aluno' }), 'joao');
    await waitFor(() => expect(screen.queryByText('Maria Silva')).not.toBeInTheDocument());
    expect(screen.getByText('João Pereira')).toBeInTheDocument();

    await user.clear(screen.getByRole('textbox', { name: 'Buscar cobranças por aluno' }));
    await user.type(screen.getByRole('textbox', { name: 'Buscar cobranças por aluno' }), 'zzz');
    await screen.findByText('Nenhum aluno encontrado para "zzz".');
  });

  it('marks paid with one tap, toasts "Desfazer" and refetches silently', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: {} });
    renderPage();
    await waitForRows();

    await user.click(screen.getByRole('button', { name: /Marcar pago: Maria Silva/ }));
    expect(api.post).toHaveBeenCalledWith('/professional/payments/pay-overdue/mark-paid', {});
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith(
      'Pagamento registrado.',
      'success',
      expect.objectContaining({ actionLabel: 'Desfazer', duration: 5000 }),
    ));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();

    const { onAction } = mockShowToast.mock.calls[0][2];
    await onAction();
    expect(api.post).toHaveBeenCalledWith('/professional/payments/pay-overdue/mark-pending');
  });

  it('maps a 409 conflict to an info toast and refetches', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue(apiError(409, 'SUBSCRIPTION_PAYMENT_CONFLICT', 'subscription.paymentConflict'));
    renderPage();
    await waitForRows();

    await user.click(screen.getByRole('button', { name: /Marcar pago: Maria Silva/ }));
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith(
      'Esta cobrança foi alterada em outro lugar. Atualizamos a lista.',
      'info',
    ));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });

  it('voids a charge after confirmation (POST …/void)', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: {} });
    renderPage();
    await waitForRows();

    await user.click(screen.getByRole('button', { name: 'Ações da cobrança de Maria Silva, vencimento 01/10' }));
    await user.click(screen.getByRole('button', { name: 'Anular cobrança' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent(/Anular a cobrança de R\$\s?99,90 de Maria Silva \(venc\. 01\/10\)\?/);

    await user.click(within(dialog).getByRole('button', { name: 'Voltar' }));
    expect(api.post).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Ações da cobrança de Maria Silva, vencimento 01/10' }));
    await user.click(screen.getByRole('button', { name: 'Anular cobrança' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Anular cobrança' }));
    expect(api.post).toHaveBeenCalledWith('/professional/payments/pay-overdue/void');
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Cobrança anulada.', 'success'));
  });

  it('predicts the revert outcome from voidedAt', async () => {
    const user = userEvent.setup();
    overviewResponse = () => Promise.resolve({
      data: buildOverview({ payments: [paidPayment({ voidedAt: '2026-09-30T10:00:00.000Z' })] }),
    });
    renderPage();
    await screen.findByText('Ana Costa');

    await user.click(screen.getByRole('button', { name: /^Ações da cobrança de Ana Costa/ }));
    await user.click(screen.getByRole('button', { name: 'Voltar para pendente' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('O valor sai da receita de outubro. Como ela tinha sido anulada antes, volta a ficar anulada.');
  });

  it('records a past payment date through the sheet', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: {} });
    renderPage();
    await waitForRows();

    await user.click(screen.getByRole('button', { name: 'Ações da cobrança de Maria Silva, vencimento 01/10' }));
    await user.click(screen.getByRole('button', { name: 'Marcar pago em outra data…' }));
    const sheet = screen.getByRole('dialog', { name: 'Registrar pagamento' });
    expect(within(sheet).getByText(/Maria Silva · R\$\s?99,90 · venc\. 01\/10/)).toBeInTheDocument();

    await user.click(within(sheet).getByRole('button', { name: 'Registrar pagamento' }));
    expect(api.post).toHaveBeenCalledWith('/professional/payments/pay-overdue/mark-paid', { paidAt: '2026-10-06' });
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Pagamento registrado em 06/10.', 'success'));
    expect(screen.queryByRole('dialog', { name: 'Registrar pagamento' })).not.toBeInTheDocument();
  });

  it('links the student identity to their history, passing the name in router state', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForRows();

    const link = screen.getByRole('link', { name: 'Ver histórico de Maria Silva' });
    expect(link).toHaveAttribute('href', '/financeiro/alunos/student-1');
    await user.click(link);

    expect(screen.getByLabelText('location')).toHaveTextContent('/financeiro/alunos/student-1');
    expect(screen.getByLabelText('history state')).toHaveTextContent('Maria Silva');
  });

  it('no longer offers "Ver histórico" in the charge row menu', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForRows();

    await user.click(screen.getByRole('button', { name: 'Ações da cobrança de Maria Silva, vencimento 01/10' }));
    expect(screen.getByRole('button', { name: 'Editar cobrança' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver histórico/ })).not.toBeInTheDocument();
  });

  it('broadcasts the overdue count and patches the dashboard cache', async () => {
    const listener = vi.fn();
    window.addEventListener(FINANCE_OVERDUE_EVENT, listener);
    localStorage.setItem('treinoway.trainerDashboardData:1', JSON.stringify({
      plans: { expiredCount: 0, renewingSoonCount: 0 },
      routines: { expiredCount: 0, expiringSoonCount: 0 },
      finance: { monthReceived: '0.00', totalReceived: '0.00', overdueCount: 9, overdueAmount: '1.00' },
      engagement: { inactiveStudentsCount: 0, adherenceMonthPct: '0', adherenceDeltaPp: null, weekPrCount: 0 },
      generatedAt: '2026-10-06T10:00:00.000Z',
    }));
    renderPage();
    await waitForRows();

    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: { overdueCount: 2, overdueAmount: '199.80' } }));
    expect(JSON.parse(localStorage.getItem('treinoway.trainerDashboardData:1')).finance.overdueCount).toBe(2);
    window.removeEventListener(FINANCE_OVERDUE_EVENT, listener);
  });

  describe('month navigation', () => {
    it('blocks future months and falls back to the current month for a future ?month', async () => {
      renderPage('/financeiro?month=2027-01');
      await waitForRows();
      expect(screen.getByText('outubro de 2026')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Próximo mês' })).toHaveAttribute('aria-disabled', 'true');
    });

    it('loads the previous month', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForRows();
      await user.click(screen.getByRole('button', { name: 'Mês anterior' }));
      await waitFor(() => expect(api.get).toHaveBeenLastCalledWith(
        '/professional/finance/overview',
        expect.objectContaining({ params: { month: '2026-09' } }),
      ));
      expect(screen.getByLabelText('location')).toHaveTextContent('month=2026-09');
    });
  });

  describe('empty and error states', () => {
    it('shows the error state with retry', async () => {
      const user = userEvent.setup();
      overviewResponse = () => Promise.reject(apiError(500, 'INTERNAL', 'server.error', 'Erro no servidor.'));
      renderPage();
      await screen.findByText('Não foi possível carregar o financeiro.');
      expect(screen.getByText('Erro no servidor.')).toBeInTheDocument();

      overviewResponse = () => Promise.resolve({ data: buildOverview() });
      await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
      await waitForRows();
    });

    it('never-set-up: no rows and no plans → CRIAR PLANO opens the plan sheet on Planos', async () => {
      const user = userEvent.setup();
      overviewResponse = () => Promise.resolve({ data: buildOverview({ payments: [], kpis: makeKpis({ billedStudents: 0 }) }) });
      plansResponse = () => Promise.resolve({ data: [] });
      renderPage();
      await screen.findByText('Sem cobranças ainda');

      await user.click(screen.getByRole('button', { name: 'Criar plano' }));
      expect(screen.getByRole('dialog', { name: 'Novo plano' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Planos' })).toHaveAttribute('aria-selected', 'true');
    });

    it('empty month with plans: KPIs + "Sem cobranças em outubro", no toolbar', async () => {
      overviewResponse = () => Promise.resolve({ data: buildOverview({ payments: [], kpis: makeKpis({ billedStudents: 0 }) }) });
      renderPage();
      await screen.findByText('Sem cobranças em outubro');
      expect(screen.getByText('sem cobranças no mês')).toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: 'Buscar cobranças por aluno' })).not.toBeInTheDocument();
    });
  });

  describe('Planos tab', () => {
    it('loads plans on first open, hides archived ones behind a toggle', async () => {
      const user = userEvent.setup();
      plansResponse = () => Promise.resolve({ data: [makePlan(), makePlan({ id: 'plan-9', name: 'Antigo', isArchived: true })] });
      renderPage();
      await waitForRows();
      expect(api.get).not.toHaveBeenCalledWith('/professional/subscription-plans', expect.anything());

      await user.click(screen.getByRole('tab', { name: 'Planos' }));
      await screen.findByRole('heading', { level: 3, name: 'Consultoria Mensal' });
      expect(api.get).toHaveBeenCalledWith('/professional/subscription-plans', { params: { includeArchived: true } });
      expect(screen.queryByRole('heading', { level: 3, name: 'Antigo' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Ver arquivados (1)' }));
      expect(screen.getByRole('heading', { level: 3, name: 'Antigo' })).toBeInTheDocument();
    });

    it('creates a plan from NOVO PLANO and reloads the list', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: makePlan({ id: 'plan-new' }) });
      renderPage('/financeiro?tab=plans');
      await screen.findByRole('heading', { level: 3, name: 'Consultoria Mensal' });

      await user.click(screen.getByRole('button', { name: 'Novo plano' }));
      await user.type(screen.getByLabelText('Nome'), 'Trimestral');
      await user.type(screen.getByLabelText('Valor por cobrança (R$)'), '270');
      await user.click(screen.getByRole('button', { name: 'Criar plano' }));

      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/professional/subscription-plans', expect.objectContaining({ name: 'Trimestral', price: 270 })));
      await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Plano criado.', 'success'));
      expect(screen.queryByRole('dialog', { name: 'Novo plano' })).not.toBeInTheDocument();
    });

    it('archives a plan from the card menu', async () => {
      const user = userEvent.setup();
      api.post.mockResolvedValue({ data: {} });
      renderPage('/financeiro?tab=plans');
      await screen.findByRole('heading', { level: 3, name: 'Consultoria Mensal' });

      await user.click(screen.getByRole('button', { name: 'Ações do plano Consultoria Mensal' }));
      await user.click(screen.getByRole('button', { name: 'Arquivar plano' }));
      expect(api.post).toHaveBeenCalledWith('/professional/subscription-plans/plan-1/archive');
      await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Plano arquivado.', 'success'));
    });

    it('shows the plans error state', async () => {
      plansResponse = () => Promise.reject(apiError(500, 'INTERNAL', 'server.error', 'Falhou.'));
      renderPage('/financeiro?tab=plans');
      await screen.findByText('Não foi possível carregar os planos.');
    });
  });
});
