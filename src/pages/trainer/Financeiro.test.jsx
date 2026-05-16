import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import Financeiro from './Financeiro';
import api from '../../api/axios';
import { useToast } from '../../contexts/ToastContext';

// Pin "today" to avoid timezone drift in status derivation
const FIXED_NOW = new Date('2026-05-15T12:00:00Z');
const RealDate = Date;
class FixedDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) { super(FIXED_NOW.getTime()); return; }
    super(...args);
  }
  static now() { return FIXED_NOW.getTime(); }
}

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

const studentAlpha = { id: 'student-1', firstName: 'João', lastName: 'Silva', email: 'joao@example.com' };
const studentBeta = { id: 'student-2', firstName: 'Maria', lastName: 'Souza', email: 'maria@example.com' };

const planMonthly = {
  id: 'plan-1',
  name: 'Plano Mensal',
  recurrence: 'monthly',
  recurrenceLabel: 'Mensal',
  price: '270.00',
  isArchived: false,
};

const planArchived = {
  id: 'plan-2',
  name: 'Plano Antigo',
  recurrence: 'quarterly',
  recurrenceLabel: 'Trimestral',
  price: '600.00',
  isArchived: true,
};

const subscriptionAlpha = {
  id: 'sub-1',
  studentId: 'student-1',
  planId: 'plan-1',
  status: 'active',
  recurrence: 'monthly',
  price: '270.00',
};

const subscriptionBeta = {
  id: 'sub-2',
  studentId: 'student-2',
  planId: 'plan-1',
  status: 'active',
  recurrence: 'monthly',
  price: '270.00',
};

// João: pending payment due this month
const paymentPendingThisMonth = {
  id: 'pay-1',
  subscriptionId: 'sub-1',
  cycleStartDate: '2026-05-01',
  cycleEndDate: '2026-05-31',
  dueDate: '2026-05-20',
  amount: '270.00',
  status: 'pending',
  paidAt: null,
};

// Maria: pending payment with cycleEndDate in the past → overdue
const paymentOverdue = {
  id: 'pay-2',
  subscriptionId: 'sub-2',
  cycleStartDate: '2026-03-01',
  cycleEndDate: '2026-03-31',
  dueDate: '2026-03-15',
  amount: '270.00',
  status: 'pending',
  paidAt: null,
};

const setupApiMocks = () => {
  api.get.mockImplementation((url) => {
    if (url === '/trainer/students') return Promise.resolve({ data: [studentAlpha, studentBeta] });
    if (url === '/trainer/subscription-plans') return Promise.resolve({ data: [planMonthly, planArchived] });
    if (url === '/trainer/subscriptions') return Promise.resolve({ data: [subscriptionAlpha, subscriptionBeta] });
    if (url === '/trainer/subscriptions/sub-1/payments') return Promise.resolve({ data: [paymentPendingThisMonth] });
    if (url === '/trainer/subscriptions/sub-2/payments') return Promise.resolve({ data: [paymentOverdue] });
    return Promise.resolve({ data: [] });
  });

  api.post.mockImplementation((url) => {
    if (url === '/trainer/payments/pay-2/mark-paid') {
      return Promise.resolve({
        data: { ...paymentOverdue, status: 'paid', paidAt: '2026-05-15T12:00:00.000Z' },
      });
    }
    return Promise.resolve({ data: {} });
  });
};

beforeEach(() => {
  globalThis.Date = FixedDate;
  vi.clearAllMocks();
  useToast.mockReturnValue({ showToast: mockShowToast });
  setupApiMocks();
});

afterEach(() => {
  globalThis.Date = RealDate;
});

describe('Financeiro page', () => {
  it('renders the hero title', async () => {
    renderWithRouter(<Financeiro />);
    expect(screen.getByRole('heading', { name: 'Financeiro' })).toBeInTheDocument();
  });

  it('renders both tabs', () => {
    renderWithRouter(<Financeiro />);
    expect(screen.getByRole('tab', { name: /Cobranças/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Planos/ })).toBeInTheDocument();
  });

  it('shows overdue student (Maria) and pending student (João) after loading', async () => {
    renderWithRouter(<Financeiro />);
    await waitFor(() => {
      expect(screen.getByText('Maria Souza')).toBeInTheDocument();
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Atrasado').length).toBeGreaterThan(0);
    // 'Pendente' appears in both the status pill and the waveform legend
    expect(screen.getAllByText('Pendente').length).toBeGreaterThan(0);
  });

  it('marks a payment as paid and shows success toast', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Financeiro />);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Marcar pago' }).length).toBeGreaterThan(0);
    });

    // Overdue row (Maria) comes first — click the first "Marcar pago"
    await user.click(screen.getAllByRole('button', { name: 'Marcar pago' })[0]);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/payments/pay-2/mark-paid');
    });
    expect(mockShowToast).toHaveBeenCalledWith(
      'Pagamento registrado.',
      'success',
      expect.objectContaining({ actionLabel: 'Desfazer' }),
    );
  });

  it('filters rows by search query', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Financeiro />);
    await waitFor(() => expect(screen.getByText('Maria Souza')).toBeInTheDocument());

    await user.type(screen.getByPlaceholderText('Buscar por aluno'), 'joao');

    await waitFor(() => {
      expect(screen.queryByText('Maria Souza')).not.toBeInTheDocument();
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });
  });

  it('activates overdue filter chip and hides pending rows', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Financeiro />);
    await waitFor(() => expect(screen.getByText('Maria Souza')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Atrasadas/ }));

    await waitFor(() => {
      // Pending João should be hidden; overdue Maria visible
      expect(screen.queryByText('João Silva')).not.toBeInTheDocument();
      expect(screen.getByText('Maria Souza')).toBeInTheDocument();
    });
  });

  it('shows plans in the Planos tab and hides archived plans by default', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Financeiro />);
    await waitFor(() => expect(screen.getByText('Maria Souza')).toBeInTheDocument());

    await user.click(screen.getByRole('tab', { name: /Planos/ }));

    expect(screen.getByText('Plano Mensal')).toBeInTheDocument();
    expect(screen.queryByText('Plano Antigo')).not.toBeInTheDocument();

    // Toggle archived plans
    await user.click(screen.getByLabelText('Mostrar arquivados').closest('label'));
    expect(screen.getByText('Plano Antigo')).toBeInTheDocument();
  });

  it('opens plan form sheet when "Novo plano" is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Financeiro />);
    await waitFor(() => expect(screen.getByText('Maria Souza')).toBeInTheDocument());

    await user.click(screen.getByRole('tab', { name: /Planos/ }));
    await user.click(screen.getByRole('button', { name: 'Novo plano' }));

    expect(screen.getByRole('heading', { name: 'Novo plano' })).toBeInTheDocument();
  });

  it('navigates to subscription history when "Ver histórico" is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Financeiro />);
    await waitFor(() => expect(screen.getByText('Maria Souza')).toBeInTheDocument());

    // Open the row menu for the first row (overdue = Maria)
    const menuBtns = screen.getAllByRole('button', { name: /Ações do pagamento/ });
    await user.click(menuBtns[0]);
    await user.click(screen.getByText('Ver histórico'));

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining('/trainer/students/student-2/subscription-history'),
    );
  });
});
