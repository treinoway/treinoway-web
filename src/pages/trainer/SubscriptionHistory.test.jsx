import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor, within } from '../../test/test-utils';
import SubscriptionHistory from './SubscriptionHistory';
import api from '../../api/axios';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  NUTRITIONIST_ONLY,
  TRAINER_ONLY,
  apiError,
  authAs,
  makePayment,
  overduePayment,
  paidPayment,
  pinFinanceClock,
  voidPayment,
} from '../../test/financeFixtures';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();
const PATH = '/financeiro/alunos/:studentId';

const buildHistory = (overrides = {}) => ({
  student: { id: 'student-1', name: 'Maria Silva', avatarUrl: null },
  summary: { totalReceived: '598.80', receivedCount: 6, customerSince: '2026-01-31' },
  payments: [
    overduePayment(),
    paidPayment({ id: 'pay-2025', cycleStartDate: '2025-12-01', cycleEndDate: '2025-12-31', dueDate: '2025-12-01' }),
  ],
  ...overrides,
});

const renderPage = (entry = '/financeiro/alunos/student-1') => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path={PATH} element={<SubscriptionHistory />} />
    </Routes>
  </MemoryRouter>,
);

describe('SubscriptionHistory', () => {
  beforeEach(() => {
    pinFinanceClock();
    vi.clearAllMocks();
    useToast.mockReturnValue({ showToast: mockShowToast });
    useAuth.mockReturnValue(authAs(TRAINER_ONLY));
    api.get.mockResolvedValue({ data: buildHistory() });
  });

  afterEach(() => vi.useRealTimers());

  it('uses one request and never fetches the students list', async () => {
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Maria Silva' });
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith('/professional/students/student-1/payments');
  });

  it('shows the name from router state while loading, and skeletons instead of empty states', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderPage({ pathname: '/financeiro/alunos/student-1', state: { studentName: 'Maria S.' } });
    expect(screen.getByRole('heading', { level: 1, name: 'Maria S.' })).toBeInTheDocument();
    expect(screen.getByText('Histórico financeiro')).toBeInTheDocument();
    expect(screen.queryByText('Sem cobranças ainda')).not.toBeInTheDocument();
    expect(screen.queryByText('Aluno não encontrado')).not.toBeInTheDocument();
  });

  it('falls back to the API student name on a deep link', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Maria Silva' })).toBeInTheDocument();
  });

  it('uses "Aluno sem nome" when the API name is empty', async () => {
    api.get.mockResolvedValue({ data: buildHistory({ student: { id: 'student-1', name: '', avatarUrl: null } }) });
    renderPage();
    expect(await screen.findByRole('heading', { level: 1, name: 'Aluno sem nome' })).toBeInTheDocument();
  });

  it('treats student: null as not found (only after loading)', async () => {
    api.get.mockResolvedValue({ data: { student: null, summary: null, payments: [] } });
    renderPage();
    expect(await screen.findByText('Aluno não encontrado')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Histórico financeiro' })).toBeInTheDocument();
  });

  it('renders the three stats ("Aluno desde", never "cliente")', async () => {
    renderPage();
    const hero = await screen.findByRole('region', { name: 'Resumo do histórico' });
    expect(within(hero).getByText('Total recebido')).toBeInTheDocument();
    expect(within(hero).getByText(/^R\$\s?598,80$/)).toBeInTheDocument();
    expect(within(hero).getByText('6 pagamentos')).toBeInTheDocument();
    expect(within(hero).getByText('Em aberto')).toBeInTheDocument();
    expect(within(hero).getByText('1 em atraso')).toBeInTheDocument();
    expect(within(hero).getByText('Aluno desde')).toBeInTheDocument();
    expect(within(hero).getByText('jan/2026')).toBeInTheDocument();
    expect(screen.queryByText(/cliente/i)).not.toBeInTheDocument();
  });

  it('groups by year (newest first) and filters; hides "Anuladas" when there are none', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('heading', { level: 2, name: '2026' });

    const years = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent);
    expect(years).toEqual(['2026', '2025']);
    expect(screen.queryByRole('tab', { name: /Anuladas/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Pagas (1)' }));
    expect(screen.queryByRole('heading', { level: 2, name: '2026' })).not.toBeInTheDocument();
    expect(screen.getByText('01/12 – 31/12/2025')).toBeInTheDocument();
  });

  it('shows anuladas with their filter', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: buildHistory({ payments: [overduePayment(), voidPayment({ id: 'v1', cycleStartDate: '2026-09-01', cycleEndDate: '2026-09-30', dueDate: '2026-09-01' })] }) });
    renderPage();
    await user.click(await screen.findByRole('tab', { name: 'Anuladas (1)' }));
    expect(screen.getByText('Anulada')).toBeInTheDocument();
    expect(screen.getByText('01/09 – 30/09/2026')).toBeInTheDocument();
  });

  it('has no "Gerar próximo ciclo" action and never posts to /subscriptions/:id/payments', async () => {
    renderPage();
    await screen.findByRole('heading', { level: 1, name: 'Maria Silva' });
    expect(screen.queryByRole('button', { name: /gerar próximo ciclo/i })).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('marks a charge paid inline and reloads', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: {} });
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Marcar pago: cobrança de 01/10' }));
    expect(api.post).toHaveBeenCalledWith('/professional/payments/pay-overdue/mark-paid', {});
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });

  it('voids with the history wording', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: {} });
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ações da cobrança de 01/10' }));
    await user.click(screen.getByRole('button', { name: 'Anular cobrança' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Anular a cobrança de 01/10 – 31/10/2026?');
  });

  it('edits notes on a paid charge (amount locked)', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: buildHistory({ payments: [paidPayment()] }) });
    api.patch.mockResolvedValue({ data: {} });
    renderPage();
    await user.click(await screen.findByRole('button', { name: 'Ações da cobrança de 01/10' }));
    await user.click(screen.getByRole('button', { name: 'Editar cobrança' }));
    expect(screen.getByLabelText('Valor (R$)')).toBeDisabled();
    await user.type(screen.getByLabelText('Observação'), 'ok');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(api.patch).toHaveBeenCalledWith('/professional/payments/pay-paid', { notes: 'ok' });
    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith('Cobrança salva.', 'success'));
  });

  it('shows the empty state when there are no payments', async () => {
    api.get.mockResolvedValue({ data: buildHistory({ payments: [] }) });
    renderPage();
    expect(await screen.findByText('Sem cobranças ainda')).toBeInTheDocument();
  });

  it('shows the error state and retries', async () => {
    const user = userEvent.setup();
    api.get.mockRejectedValueOnce(apiError(403, 'FORBIDDEN', 'auth.forbidden', 'Sem permissão.'));
    renderPage();
    await screen.findByText('Não foi possível carregar o histórico.');
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Maria Silva' })).toBeInTheDocument();
  });

  it('falls back to /financeiro when opened by deep link', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(mockNavigate).toHaveBeenCalledWith('/financeiro');
  });

  it('goes back in history when there is a previous entry', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/financeiro', '/financeiro/alunos/student-1']} initialIndex={1}>
        <Routes>
          <Route path={PATH} element={<SubscriptionHistory />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { level: 1, name: 'Maria Silva' });
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  describe('nutritionist-only user', () => {
    beforeEach(() => useAuth.mockReturnValue(authAs(NUTRITIONIST_ONLY)));

    it('reads "Paciente desde" and never "aluno" or "cliente"', async () => {
      renderPage();
      const hero = await screen.findByRole('region', { name: 'Resumo do histórico' });
      expect(within(hero).getByText('Paciente desde')).toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(/aluno/i);
      expect(document.body.textContent).not.toMatch(/cliente/i);
    });

    it('uses "Paciente sem nome" when the API name is empty', async () => {
      api.get.mockResolvedValue({ data: buildHistory({ student: { id: 'student-1', name: '', avatarUrl: null } }) });
      renderPage();
      expect(await screen.findByRole('heading', { level: 1, name: 'Paciente sem nome' })).toBeInTheDocument();
    });

    it('says "Paciente não encontrado" for student: null', async () => {
      api.get.mockResolvedValue({ data: { student: null, summary: null, payments: [] } });
      renderPage();
      expect(await screen.findByText('Paciente não encontrado')).toBeInTheDocument();
    });

    it('falls back to /financeiro on a deep link', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole('heading', { level: 1, name: 'Maria Silva' });
      await user.click(screen.getByRole('button', { name: 'Voltar' }));
      expect(mockNavigate).toHaveBeenCalledWith('/financeiro');
    });
  });

  it('keeps unrelated pending rows: a makePayment fixture renders', async () => {
    api.get.mockResolvedValue({ data: buildHistory({ payments: [makePayment({ dueDate: '2026-10-10' })] }) });
    renderPage();
    expect(await screen.findByText('Vence 10/10')).toBeInTheDocument();
  });
});
