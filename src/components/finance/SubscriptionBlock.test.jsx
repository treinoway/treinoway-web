import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import SubscriptionBlock from './SubscriptionBlock';
import { makePayment, overduePayment, paidPayment, pinFinanceClock } from '../../test/financeFixtures';

const subscription = {
  id: 'sub-1', planId: 'plan-1', recurrence: 'monthly', price: '99.90',
  discountPercent: null, discountAmount: null, startDate: '2026-01-31',
};

const renderBlock = (props = {}) => {
  const callbacks = { onRetry: vi.fn(), onAssign: vi.fn(), onReplace: vi.fn(), onCancel: vi.fn(), onViewHistory: vi.fn() };
  render(
    <SubscriptionBlock
      loading={false}
      error={null}
      subscription={subscription}
      planName="Consultoria Mensal"
      payments={[]}
      rowHandlers={{ onMarkPaid: vi.fn(), onMarkPaidOnDate: vi.fn(), onEdit: vi.fn(), onRevert: vi.fn(), onVoid: vi.fn() }}
      {...callbacks}
      {...props}
    />,
  );
  return callbacks;
};

describe('SubscriptionBlock', () => {
  beforeEach(pinFinanceClock);
  afterEach(() => vi.useRealTimers());

  it('shows a skeleton while loading (not an empty state)', () => {
    renderBlock({ loading: true, subscription: null });
    expect(screen.queryByText('Sem plano ativo')).not.toBeInTheDocument();
  });

  it('is "Em dia" with no open charges', () => {
    renderBlock({ payments: [paidPayment()] });
    expect(screen.getByText('Em dia')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma cobrança em aberto.')).toBeInTheDocument();
  });

  it('shows "Começa em" for a future start date', () => {
    renderBlock({ subscription: { ...subscription, startDate: '2026-11-01' } });
    expect(screen.getByText('Começa em 01/11')).toBeInTheDocument();
  });

  it('lists at most 3 open charges, overdue first, then "Ver todas (n)"', async () => {
    const user = userEvent.setup();
    const payments = [
      makePayment({ id: 'a', dueDate: '2026-10-20', cycleStartDate: '2026-10-20', cycleEndDate: '2026-11-19' }),
      overduePayment({ id: 'b', daysOverdue: 4, cycleStartDate: '2026-09-01', cycleEndDate: '2026-09-30' }),
      overduePayment({ id: 'c', daysOverdue: 30, cycleStartDate: '2026-08-01', cycleEndDate: '2026-08-31' }),
      makePayment({ id: 'd', dueDate: '2026-10-10', cycleStartDate: '2026-10-10', cycleEndDate: '2026-11-09' }),
    ];
    const { onViewHistory } = renderBlock({ payments });

    const titles = screen.getAllByText(/^\d{2}\/\d{2} – /).map((title) => title.textContent);
    expect(titles).toEqual(['01/08 – 31/08/2026', '01/09 – 30/09/2026', '10/10 – 09/11/2026']);
    await user.click(screen.getByRole('button', { name: 'Ver todas (4)' }));
    expect(onViewHistory).toHaveBeenCalled();
  });

  it('offers TROCAR PLANO and the cancel menu', async () => {
    const user = userEvent.setup();
    const { onReplace, onCancel } = renderBlock();
    await user.click(screen.getByRole('button', { name: 'Trocar plano' }));
    expect(onReplace).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Mais ações da assinatura' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar assinatura' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('retries after an error', async () => {
    const user = userEvent.setup();
    const { onRetry } = renderBlock({ error: 'falhou', subscription: null });
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalled();
  });
});
