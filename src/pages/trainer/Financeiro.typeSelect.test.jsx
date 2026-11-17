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
  NUTRITIONIST_ONLY,
  TRAINER_ONLY,
  authAs,
  bothPlan,
  makeKpis,
  makePayment,
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

const nutritionRow = makePayment({
  id: 'pay-nutri',
  dueDate: '2026-10-10',
  serviceType: 'nutrition',
  serviceTypeLabel: 'Nutrição',
  student: { id: 'student-2', name: 'João Pereira', avatarUrl: null },
  plan: { id: 'plan-nutri', name: 'Acompanhamento Nutricional', recurrence: 'monthly' },
});

// Test helper: answers the overview and plans requests of the /professional/* API.
const mockApi = () => {
  api.get.mockImplementation((url) => {
    if (url === '/professional/finance/overview') {
      return Promise.resolve({
        data: { month: '2026-10', overdueGraceDays: 3, kpis: makeKpis(), payments: [overduePayment(), nutritionRow, paidPayment()] },
      });
    }
    if (url === '/professional/subscription-plans') {
      return Promise.resolve({ data: [makePlan(), nutritionPlan(), bothPlan()] });
    }
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

// Test helper: the "Tipo" select (custom Select trigger) of the service-type filter.
const typeSelect = () => screen.getByRole('combobox', { name: 'Tipo' });

// Test helper: opens the "Tipo" select and picks the option with the given label.
const chooseType = async (user, label) => {
  await user.click(typeSelect());
  await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: label }));
};

describe('Financeiro "Tipo" select', () => {
  beforeEach(() => {
    pinFinanceClock();
    vi.clearAllMocks();
    localStorage.clear();
    useToast.mockReturnValue({ showToast: vi.fn() });
    useAuth.mockReturnValue(authAs(DUAL_ROLE));
    mockApi();
  });

  afterEach(() => vi.useRealTimers());

  describe('dual-role user', () => {
    it('offers Todos / Treino / Nutrição / Ambos with Todos selected by default', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('Maria Silva');

      const select = typeSelect();
      expect(select).toHaveTextContent('Todos');
      expect(select).toHaveAttribute('aria-expanded', 'false');

      await user.click(select);
      const options = within(screen.getByRole('listbox')).getAllByRole('option');
      expect(options.map((option) => option.textContent)).toEqual(['Todos', 'Treino', 'Nutrição', 'Ambos']);
      expect(within(screen.getByRole('listbox')).getByRole('option', { name: 'Todos' })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByText('Maria Silva')).toBeInTheDocument();
      expect(screen.getByText('João Pereira')).toBeInTheDocument();
      expect(screen.getByText('Ana Costa')).toBeInTheDocument();
    });

    it('no longer renders the "Filtrar por tipo" tablist', async () => {
      renderPage();
      await screen.findByText('Maria Silva');

      expect(typeSelect()).toBeInTheDocument();
      expect(screen.queryByRole('tablist', { name: 'Filtrar por tipo' })).not.toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: /^Todos/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('tab', { name: /^Ambos/ })).not.toBeInTheDocument();
    });

    it('places the "Tipo" select on the same toolbar row as the Cobranças/Planos tabs, using the DS Select', async () => {
      renderPage();
      await screen.findByText('Maria Silva');

      const tabs = screen.getByRole('tablist', { name: 'Visão financeira' });
      const row = tabs.closest('.finance-tabs-row');
      expect(row).not.toBeNull();
      expect(within(row).getByRole('combobox', { name: 'Tipo' })).toBe(typeSelect());
      expect(within(row).getByRole('tab', { name: 'Cobranças' })).toBeInTheDocument();
      expect(within(row).getByRole('tab', { name: 'Planos' })).toBeInTheDocument();
      expect(typeSelect().closest('.custom-select')).not.toBeNull();
      expect(typeSelect()).toHaveClass('custom-select__trigger');
      expect(within(row).queryByRole('tabpanel')).not.toBeInTheDocument();
    });

    it('keeps the toolbar row with the select on the Planos tab', async () => {
      renderPage('/financeiro?tab=plans');
      await screen.findByRole('heading', { level: 3, name: 'Consultoria Mensal' });

      const row = screen.getByRole('tablist', { name: 'Visão financeira' }).closest('.finance-tabs-row');
      expect(row).not.toBeNull();
      expect(within(row).getByRole('combobox', { name: 'Tipo' })).toHaveTextContent('Todos');
    });

    it('keeps the selected type when switching between Cobranças and Planos', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('Maria Silva');

      await chooseType(user, 'Nutrição');
      expect(typeSelect()).toHaveTextContent('Nutrição');
      expect(screen.getByText('João Pereira')).toBeInTheDocument();
      expect(screen.queryByText('Maria Silva')).not.toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: 'Planos' }));
      await screen.findByRole('heading', { level: 3, name: 'Acompanhamento Nutricional' });
      expect(typeSelect()).toHaveTextContent('Nutrição');
      expect(screen.queryByRole('heading', { level: 3, name: 'Consultoria Mensal' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { level: 3, name: 'Treino e Dieta' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: 'Cobranças' }));
      await screen.findByText('João Pereira');
      expect(typeSelect()).toHaveTextContent('Nutrição');
      expect(screen.queryByText('Maria Silva')).not.toBeInTheDocument();
      expect(screen.queryByText('Ana Costa')).not.toBeInTheDocument();
    });

    it('closes the option list without changing the type when clicking outside', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('Maria Silva');

      await user.click(typeSelect());
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      await user.click(screen.getByRole('heading', { level: 1, name: 'Financeiro' }));

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(typeSelect()).toHaveTextContent('Todos');
      expect(screen.getByText('Maria Silva')).toBeInTheDocument();
      expect(screen.getByText('João Pereira')).toBeInTheDocument();
    });
  });

  describe('single-role users', () => {
    it('shows no "Tipo" select to a trainer-only user, on either tab', async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue(authAs(TRAINER_ONLY));
      renderPage();
      await screen.findByText('Maria Silva');
      expect(screen.queryByRole('combobox', { name: 'Tipo' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: 'Planos' }));
      await screen.findByRole('heading', { level: 3, name: 'Consultoria Mensal' });
      expect(screen.queryByRole('combobox', { name: 'Tipo' })).not.toBeInTheDocument();
      expect(screen.queryByText('Tipo')).not.toBeInTheDocument();
    });

    it('shows no "Tipo" select to a nutritionist-only user, on either tab', async () => {
      const user = userEvent.setup();
      useAuth.mockReturnValue(authAs(NUTRITIONIST_ONLY));
      renderPage();
      await screen.findByText('Maria Silva');
      expect(screen.queryByRole('combobox', { name: 'Tipo' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('tab', { name: 'Planos' }));
      await screen.findByRole('heading', { level: 3, name: 'Acompanhamento Nutricional' });
      expect(screen.queryByRole('combobox', { name: 'Tipo' })).not.toBeInTheDocument();
      expect(screen.queryByText('Tipo')).not.toBeInTheDocument();
    });
  });
});
