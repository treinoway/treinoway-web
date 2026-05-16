import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import PaymentRow from './PaymentRow';
import { PAYMENT_STATUS } from '../utils/subscriptionHelpers';

const basePayment = {
  id: 'pay-1',
  amount: '270.00',
  paidAt: null,
  cycleStartDate: '2026-05-01',
  cycleEndDate: '2026-05-31',
  dueDate: '2026-05-20',
};

const baseProps = {
  payment: basePayment,
  effectiveStatus: PAYMENT_STATUS.PENDING,
  studentName: 'João Silva',
  studentInitials: 'JS',
  planName: 'Plano Mensal',
  recurrenceLabel: 'Mensal',
  isMutating: false,
  onMarkPaid: vi.fn(),
  onMarkPending: vi.fn(),
  onViewHistory: vi.fn(),
};

describe('PaymentRow', () => {
  it('renders student name and initials', () => {
    render(<PaymentRow {...baseProps} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  it('renders plan name and recurrence label', () => {
    render(<PaymentRow {...baseProps} />);
    expect(screen.getByText('Plano Mensal')).toBeInTheDocument();
    expect(screen.getByText('Mensal')).toBeInTheDocument();
  });

  it('shows "Marcar pago" button for pending status', () => {
    render(<PaymentRow {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Marcar pago' })).toBeInTheDocument();
  });

  it('calls onMarkPaid when "Marcar pago" is clicked', async () => {
    const user = userEvent.setup();
    const onMarkPaid = vi.fn();
    render(<PaymentRow {...baseProps} onMarkPaid={onMarkPaid} />);
    await user.click(screen.getByRole('button', { name: 'Marcar pago' }));
    expect(onMarkPaid).toHaveBeenCalledOnce();
  });

  it('shows "Pagando…" and disables button while mutating', () => {
    render(<PaymentRow {...baseProps} isMutating />);
    const btn = screen.getByRole('button', { name: 'Pagando…' });
    expect(btn).toBeDisabled();
  });

  it('shows overdue status pill for overdue payments', () => {
    render(
      <PaymentRow
        {...baseProps}
        effectiveStatus={PAYMENT_STATUS.OVERDUE}
      />,
    );
    // Pill is rendered twice: once in the desktop status column and once in the mobile actions row
    const pills = screen.getAllByText('Atrasado');
    expect(pills.length).toBeGreaterThanOrEqual(1);
  });

  it('applies overdue row class for overdue status', () => {
    const { container } = render(
      <PaymentRow
        {...baseProps}
        effectiveStatus={PAYMENT_STATUS.OVERDUE}
      />,
    );
    expect(container.querySelector('.fin-payment-row--overdue')).toBeInTheDocument();
  });

  it('shows row menu with reverter for paid payment', async () => {
    const user = userEvent.setup();
    const onMarkPending = vi.fn();
    render(
      <PaymentRow
        {...baseProps}
        effectiveStatus={PAYMENT_STATUS.PAID}
        payment={{ ...basePayment, paidAt: '2026-05-15T12:00:00Z' }}
        onMarkPending={onMarkPending}
      />,
    );
    // Should NOT have "Marcar pago" button for paid rows
    expect(screen.queryByRole('button', { name: 'Marcar pago' })).not.toBeInTheDocument();

    // Should have a row menu
    const menuBtn = screen.getByRole('button', { name: /Ações do pagamento/ });
    await user.click(menuBtn);
    const revertBtn = screen.getByText('Reverter pagamento');
    await user.click(revertBtn);
    expect(onMarkPending).toHaveBeenCalledOnce();
  });

  it('renders paid status pill for paid payment', () => {
    render(
      <PaymentRow
        {...baseProps}
        effectiveStatus={PAYMENT_STATUS.PAID}
        payment={{ ...basePayment, paidAt: '2026-05-15T12:00:00Z' }}
      />,
    );
    // Pill rendered twice: desktop status column + mobile actions row
    const pills = screen.getAllByText('Pago');
    expect(pills.length).toBeGreaterThanOrEqual(1);
  });

  it('renders "Ver histórico" in menu for pending row when onViewHistory is provided', async () => {
    const user = userEvent.setup();
    const onViewHistory = vi.fn();
    render(<PaymentRow {...baseProps} onViewHistory={onViewHistory} />);
    const menuBtn = screen.getByRole('button', { name: /Ações do pagamento/ });
    await user.click(menuBtn);
    const histBtn = screen.getByText('Ver histórico');
    await user.click(histBtn);
    expect(onViewHistory).toHaveBeenCalledOnce();
  });

  it('does not show "Reverter pagamento" in menu for pending row with onViewHistory', async () => {
    const user = userEvent.setup();
    render(<PaymentRow {...baseProps} onViewHistory={vi.fn()} />);
    const menuBtn = screen.getByRole('button', { name: /Ações do pagamento/ });
    await user.click(menuBtn);
    expect(screen.queryByText('Reverter pagamento')).not.toBeInTheDocument();
  });

  it('does not render a row menu for non-paid row without onViewHistory', () => {
    render(<PaymentRow {...baseProps} onViewHistory={undefined} />);
    expect(screen.queryByRole('button', { name: /Ações do pagamento/ })).not.toBeInTheDocument();
  });

  it('renders pending status pill', () => {
    render(<PaymentRow {...baseProps} />);
    // Pill rendered twice: desktop status column + mobile actions row
    const pills = screen.getAllByText('Pendente');
    expect(pills.length).toBeGreaterThanOrEqual(1);
  });
});
