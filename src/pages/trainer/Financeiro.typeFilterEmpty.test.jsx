import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, within } from '../../test/test-utils';
import Financeiro from './Financeiro';
import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  DUAL_ROLE,
  authAs,
  makeKpis,
  makePlan,
  nutritionPlan,
  overduePayment,
  paidPayment,
  pinFinanceClock,
} from '../../test/financeFixtures';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const PLANS_NOTICE = 'Nenhum plano deste tipo.';
const CHARGES_NOTICE = 'Nenhuma cobrança deste tipo.';
const FIRST_PLAN_TEXT = 'Crie o primeiro plano para atribuir.';

let overviewPayments;
let plans;

// Test helper: answers the overview and plans requests of the /professional/* API.
const mockApi = () => {
  api.get.mockImplementation((url) => {
    if (url === '/professional/finance/overview') {
      return Promise.resolve({ data: { month: '2026-10', overdueGraceDays: 3, kpis: makeKpis(), payments: overviewPayments } });
    }
    if (url === '/professional/subscription-plans') return Promise.resolve({ data: plans });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
};

// Test helper: renders the page at the given /financeiro URL.
const renderPage = (route = '/financeiro') => render(
  <MemoryRouter initialEntries={[route]}>
    <Routes>
      <Route path="/financeiro" element={<Financeiro />} />
    </Routes>
  </MemoryRouter>,
);

// Test helper: opens the "Tipo" select and picks the option with the given label.
const chooseType = async (user, label) => {
  await user.click(screen.getByRole('combobox', { name: 'Tipo' }));
  await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: label }));
};

// Test helper: the visible Planos/Cobranças tab panel.
const tabPanel = () => screen.getByRole('tabpanel');

describe('Financeiro type filter that empties a non-empty list (dual-role)', () => {
  beforeEach(() => {
    pinFinanceClock();
    vi.clearAllMocks();
    localStorage.clear();
    useToast.mockReturnValue({ showToast: vi.fn() });
    useAuth.mockReturnValue(authAs(DUAL_ROLE));
    overviewPayments = [overduePayment(), paidPayment()];
    plans = [makePlan()];
    mockApi();
  });

  afterEach(() => vi.useRealTimers());

  describe('Planos', () => {
    it('shows "Nenhum plano deste tipo." instead of the first-plan empty state', async () => {
      const user = userEvent.setup();
      renderPage('/financeiro?tab=plans');
      await screen.findByRole('heading', { level: 3, name: 'Consultoria Mensal' });

      await chooseType(user, 'Nutrição');

      expect(within(tabPanel()).getByText(PLANS_NOTICE)).toBeInTheDocument();
      expect(screen.queryByText(FIRST_PLAN_TEXT)).not.toBeInTheDocument();
      expect(screen.queryByText('Sem planos ainda')).not.toBeInTheDocument();
      expect(within(tabPanel()).queryByRole('button', { name: 'Criar plano' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { level: 3, name: 'Consultoria Mensal' })).not.toBeInTheDocument();
    });

    it('drops the notice and shows the plans again when the filter goes back to Todos', async () => {
      const user = userEvent.setup();
      plans = [makePlan(), nutritionPlan()];
      renderPage('/financeiro?tab=plans');
      await screen.findByRole('heading', { level: 3, name: 'Consultoria Mensal' });

      await chooseType(user, 'Ambos');
      expect(within(tabPanel()).getByText(PLANS_NOTICE)).toBeInTheDocument();

      await chooseType(user, 'Todos');
      expect(screen.queryByText(PLANS_NOTICE)).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'Consultoria Mensal' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'Acompanhamento Nutricional' })).toBeInTheDocument();
    });

    it('keeps the first-plan empty state when there are no plans at all, whatever the filter', async () => {
      const user = userEvent.setup();
      plans = [];
      renderPage('/financeiro?tab=plans');
      expect(await screen.findByText(FIRST_PLAN_TEXT)).toBeInTheDocument();
      expect(within(tabPanel()).getByRole('button', { name: 'Criar plano' })).toBeInTheDocument();

      await chooseType(user, 'Nutrição');
      expect(screen.getByText(FIRST_PLAN_TEXT)).toBeInTheDocument();
      expect(screen.queryByText(PLANS_NOTICE)).not.toBeInTheDocument();
    });
  });

  describe('Cobranças', () => {
    it('shows "Nenhuma cobrança deste tipo." when the type filter hides every charge of the month', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('Maria Silva');
      expect(screen.queryByText(CHARGES_NOTICE)).not.toBeInTheDocument();

      await chooseType(user, 'Nutrição');

      expect(within(tabPanel()).getByText(CHARGES_NOTICE)).toBeInTheDocument();
      expect(screen.queryByText('Maria Silva')).not.toBeInTheDocument();
      expect(screen.queryByText('Ana Costa')).not.toBeInTheDocument();
    });

    it('drops the notice when the filter matches charges again', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('Maria Silva');

      await chooseType(user, 'Ambos');
      expect(within(tabPanel()).getByText(CHARGES_NOTICE)).toBeInTheDocument();

      await chooseType(user, 'Treino');
      expect(screen.queryByText(CHARGES_NOTICE)).not.toBeInTheDocument();
      expect(screen.getByText('Maria Silva')).toBeInTheDocument();
      expect(screen.getByText('Ana Costa')).toBeInTheDocument();
    });
  });
});
