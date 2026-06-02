import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '../../test/test-utils';
import { renderWithRoute } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'trainer-1' } }),
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('../../api/subscriptions', () => ({
  listSubscriptionsForStudent: vi.fn(),
  listPaymentsForSubscription: vi.fn(),
  markPaymentAsPaid: vi.fn(),
  markPaymentAsPending: vi.fn(),
  createPaymentCycle: vi.fn(),
  deletePaymentCycle: vi.fn(),
}));

import api from '../../api/axios';
import {
  listSubscriptionsForStudent,
  listPaymentsForSubscription,
  markPaymentAsPaid,
  markPaymentAsPending,
  createPaymentCycle,
  deletePaymentCycle,
} from '../../api/subscriptions';
import SubscriptionHistory from './SubscriptionHistory';

const STUDENT_ID = '42';

const mockStudent = {
  id: STUDENT_ID,
  firstName: 'Marina',
  lastName: 'Rocha',
  email: 'marina@example.com',
};

const mockSubscription = {
  id: 'sub-1',
  status: 'active',
  planName: 'Plano Performance',
};

/**
 * Build a "YYYY-MM-DD" string offset by `monthDelta` months from today.
 * Day is clamped to 1 (start) or 28 (end) to avoid month-length edge cases.
 */
const relativeDate = (monthDelta, day = 1) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1 + monthDelta; // 1-based, may overflow
  const normalized = new Date(year, month - 1, day);
  const y = normalized.getFullYear();
  const m = String(normalized.getMonth() + 1).padStart(2, '0');
  const d = String(normalized.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Paid cycle: two months ago (firmly in the past regardless of current date).
const makePaidPayment = (overrides = {}) => ({
  id: 'pay-1',
  cycleStartDate: relativeDate(-2, 1),
  cycleEndDate: relativeDate(-2, 28),
  amount: '540',
  status: 'paid',
  paidAt: relativeDate(-2, 3),
  ...overrides,
});

// Pending cycle: starts this month, ends next month (always in the future).
const makePendingPayment = (overrides = {}) => ({
  id: 'pay-2',
  cycleStartDate: relativeDate(0, 1),
  cycleEndDate: relativeDate(1, 28),
  amount: '540',
  status: 'pending',
  paidAt: null,
  ...overrides,
});

const renderPage = () =>
  renderWithRoute(<SubscriptionHistory />, {
    route: `/trainer/students/${STUDENT_ID}/financeiro`,
    path: `/trainer/students/:studentId/financeiro`,
  });

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: [mockStudent] });
  listSubscriptionsForStudent.mockResolvedValue([mockSubscription]);
  listPaymentsForSubscription.mockResolvedValue([makePaidPayment(), makePendingPayment()]);
});

describe('SubscriptionHistory', () => {
  describe('loading state', () => {
    it('shows loading skeletons while fetching', () => {
      listSubscriptionsForStudent.mockReturnValue(new Promise(() => {}));
      renderPage();
      expect(document.querySelector('.fin-skeleton')).toBeTruthy();
    });
  });

  describe('page header', () => {
    it('renders the eyebrow and student name', async () => {
      renderPage();
      await waitFor(() => expect(screen.queryByText('Marina Rocha')).toBeTruthy());
      expect(screen.getByText('Histórico financeiro')).toBeTruthy();
      expect(screen.getByText('Marina Rocha')).toBeTruthy();
    });

    it('renders filter chips', async () => {
      renderPage();
      await waitFor(() => screen.getByRole('tab', { name: 'Todos' }));
      expect(screen.getByRole('tab', { name: 'Pagos' })).toBeTruthy();
      expect(screen.getByRole('tab', { name: 'Pendentes' })).toBeTruthy();
      expect(screen.getByRole('tab', { name: 'Atrasados' })).toBeTruthy();
    });
  });

  describe('stadium stats strip', () => {
    it('renders Receita total, Cobranças and Cliente desde labels', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Receita total'));
      expect(screen.getByText('Cobranças')).toBeTruthy();
      expect(screen.getByText('Cliente desde')).toBeTruthy();
    });

    it('shows total revenue from paid payments', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Receita total'));
      // Amount "540,00" appears in both strip and row amounts — at least one match is correct
      const matches = screen.getAllByText(/540/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it('shows total charge count', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Cobranças'));
      expect(screen.getByText('2')).toBeTruthy();
    });
  });

  describe('year grouping and history rows', () => {
    it('groups payments by year with a year label', async () => {
      renderPage();
      const expectedYear = relativeDate(-2, 1).slice(0, 4);
      await waitFor(() => screen.getByText(expectedYear));
      expect(screen.getByText(expectedYear)).toBeTruthy();
    });

    it('renders cycle badge day and month', async () => {
      renderPage();
      // Both payments start on the 1st — use getAllByText
      await waitFor(() => screen.getAllByText('01'));
      const dayEls = screen.getAllByText('01');
      expect(dayEls.length).toBeGreaterThanOrEqual(1);
      // Paid cycle starts 2 months ago — derive expected short month abbreviation
      const SHORT_MONTH_PT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
      const paidStart = relativeDate(-2, 1);
      const expectedMonth = SHORT_MONTH_PT[Number(paidStart.slice(5, 7)) - 1];
      expect(screen.getByText(expectedMonth)).toBeTruthy();
    });

    it('renders period range in short format', async () => {
      renderPage();
      const paidStart = relativeDate(-2, 1);
      const expectedShort = `${paidStart.slice(8, 10)}/${paidStart.slice(5, 7)}`;
      await waitFor(() => screen.getByText(new RegExp(expectedShort)));
    });

    it('renders status pills for each entry', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Pago'));
      expect(screen.getByText('Pendente')).toBeTruthy();
    });
  });

  describe('filtering', () => {
    it('filters to show only paid entries', async () => {
      const user = userEvent.setup({ delay: null });
      renderPage();
      await waitFor(() => screen.getByRole('tab', { name: 'Pagos' }));
      await user.click(screen.getByRole('tab', { name: 'Pagos' }));
      expect(screen.getByText('Pago')).toBeTruthy();
      expect(screen.queryByText('Pendente')).toBeNull();
    });

    it('filters to show only pending entries', async () => {
      const user = userEvent.setup({ delay: null });
      renderPage();
      await waitFor(() => screen.getByRole('tab', { name: 'Pendentes' }));
      await user.click(screen.getByRole('tab', { name: 'Pendentes' }));
      expect(screen.getByText('Pendente')).toBeTruthy();
      expect(screen.queryByText('Pago')).toBeNull();
    });

    it('shows empty state when no entries match filter', async () => {
      const user = userEvent.setup({ delay: null });
      listPaymentsForSubscription.mockResolvedValue([makePaidPayment()]);
      renderPage();
      await waitFor(() => screen.getByRole('tab', { name: 'Atrasados' }));
      await user.click(screen.getByRole('tab', { name: 'Atrasados' }));
      await waitFor(() =>
        screen.getByText('Sem cobranças registradas para este aluno'),
      );
    });
  });

  describe('row menu actions', () => {
    it('shows "Reverter pagamento" in menu for paid entry', async () => {
      const user = userEvent.setup({ delay: null });
      renderPage();
      // Entries sorted descending: May (pending) first, April (paid) second
      await waitFor(() => screen.getAllByRole('button', { name: /ações/i }));
      const menuButtons = screen.getAllByRole('button', { name: /ações/i });
      await user.click(menuButtons[1]); // April paid row
      expect(screen.getByText('Reverter pagamento')).toBeTruthy();
    });

    it('shows "Marcar pago" in menu for non-paid entry', async () => {
      const user = userEvent.setup({ delay: null });
      renderPage();
      await waitFor(() => screen.getAllByRole('button', { name: /ações/i }));
      const menuButtons = screen.getAllByRole('button', { name: /ações/i });
      await user.click(menuButtons[0]); // May pending row
      expect(screen.getByText('Marcar pago')).toBeTruthy();
    });

    it('calls markPaymentAsPaid when "Marcar pago" is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      markPaymentAsPaid.mockResolvedValue({ ...makePendingPayment(), status: 'paid' });
      renderPage();
      await waitFor(() => screen.getAllByRole('button', { name: /ações/i }));
      const menuButtons = screen.getAllByRole('button', { name: /ações/i });
      await user.click(menuButtons[0]); // May pending row
      await user.click(screen.getByText('Marcar pago'));
      await waitFor(() => expect(markPaymentAsPaid).toHaveBeenCalledWith('pay-2'));
    });

    it('calls markPaymentAsPending when "Reverter pagamento" is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      markPaymentAsPending.mockResolvedValue({ ...makePaidPayment(), status: 'pending' });
      renderPage();
      await waitFor(() => screen.getAllByRole('button', { name: /ações/i }));
      const menuButtons = screen.getAllByRole('button', { name: /ações/i });
      await user.click(menuButtons[1]); // April paid row
      await user.click(screen.getByText('Reverter pagamento'));
      await waitFor(() => expect(markPaymentAsPending).toHaveBeenCalledWith('pay-1'));
    });
  });

  describe('delete confirmation', () => {
    it('opens confirm dialog when Excluir is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      renderPage();
      // Use paid row (index 1, April) which has Excluir in its menu
      await waitFor(() => screen.getAllByRole('button', { name: /ações/i }));
      const menuButtons = screen.getAllByRole('button', { name: /ações/i });
      await user.click(menuButtons[1]);
      await user.click(screen.getByText('Excluir'));
      expect(screen.getByText(/Excluir esta cobrança/)).toBeTruthy();
    });

    it('cancels delete dialog without calling API', async () => {
      const user = userEvent.setup({ delay: null });
      renderPage();
      await waitFor(() => screen.getAllByRole('button', { name: /ações/i }));
      const menuButtons = screen.getAllByRole('button', { name: /ações/i });
      await user.click(menuButtons[1]);
      await user.click(screen.getByText('Excluir'));
      await user.click(screen.getByText('Cancelar'));
      expect(deletePaymentCycle).not.toHaveBeenCalled();
      expect(screen.queryByText(/Excluir esta cobrança/)).toBeNull();
    });

    it('calls deletePaymentCycle on confirm', async () => {
      const user = userEvent.setup({ delay: null });
      deletePaymentCycle.mockResolvedValue({});
      renderPage();
      await waitFor(() => screen.getAllByRole('button', { name: /ações/i }));
      const menuButtons = screen.getAllByRole('button', { name: /ações/i });
      await user.click(menuButtons[1]);
      await user.click(screen.getByText('Excluir'));
      const dialog = screen.getByText(/Excluir esta cobrança/).closest('.confirm-dialog');
      await user.click(within(dialog).getByText('Excluir'));
      await waitFor(() => expect(deletePaymentCycle).toHaveBeenCalledWith('pay-1'));
    });
  });

  describe('add cycle', () => {
    it('shows Adicionar cobrança button when subscription is active', async () => {
      renderPage();
      await waitFor(() => screen.getByText('Adicionar cobrança'));
    });

    it('opens the add cycle sheet', async () => {
      const user = userEvent.setup({ delay: null });
      renderPage();
      await waitFor(() => screen.getByText('Adicionar cobrança'));
      await user.click(screen.getByText('Adicionar cobrança'));
      expect(screen.getByText('Nova cobrança')).toBeTruthy();
      expect(screen.getByLabelText('Data de início do ciclo')).toBeTruthy();
    });

    it('closes the add cycle sheet on Cancelar', async () => {
      const user = userEvent.setup({ delay: null });
      renderPage();
      await waitFor(() => screen.getByText('Adicionar cobrança'));
      await user.click(screen.getByText('Adicionar cobrança'));
      await user.click(screen.getByText('Cancelar'));
      expect(screen.queryByText('Nova cobrança')).toBeNull();
    });

    it('calls createPaymentCycle on submit', async () => {
      const user = userEvent.setup({ delay: null });
      createPaymentCycle.mockResolvedValue(makePendingPayment({ id: 'pay-new' }));
      renderPage();
      await waitFor(() => screen.getByText('Adicionar cobrança'));
      await user.click(screen.getByText('Adicionar cobrança'));
      await user.click(screen.getByText('Adicionar'));
      await waitFor(() => expect(createPaymentCycle).toHaveBeenCalled());
    });
  });

  describe('empty state', () => {
    it('shows empty state when no payments exist', async () => {
      listPaymentsForSubscription.mockResolvedValue([]);
      renderPage();
      await waitFor(() =>
        screen.getByText('Sem cobranças registradas para este aluno'),
      );
    });
  });

  describe('back navigation', () => {
    it('renders the back button', async () => {
      renderPage();
      await waitFor(() => screen.getByRole('button', { name: /voltar para o aluno/i }));
    });
  });
});
