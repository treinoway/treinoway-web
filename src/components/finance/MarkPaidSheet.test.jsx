import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen, waitFor } from '../../test/test-utils';
import MarkPaidSheet from './MarkPaidSheet';
import { makePayment, pinFinanceClock, voidPayment } from '../../test/financeFixtures';

describe('MarkPaidSheet', () => {
  beforeEach(pinFinanceClock);
  afterEach(() => vi.useRealTimers());

  it('defaults to today (São Paulo), blocks future dates via max and submits paidAt', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(null);
    render(<MarkPaidSheet payment={makePayment()} contextLabel="Maria · R$ 99,90 · venc. 01/10" onClose={vi.fn()} onSubmit={onSubmit} />);

    const input = screen.getByLabelText('Data do pagamento');
    expect(input).toHaveValue('2026-10-06');
    expect(input).toHaveAttribute('max', '2026-10-06');
    expect(screen.getByText('O pagamento conta na receita do mês desta data.')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '2026-10-02' } });
    await user.click(screen.getByRole('button', { name: 'Registrar pagamento' }));
    expect(onSubmit).toHaveBeenCalledWith('2026-10-02');
  });

  it('rejects a future date client-side', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<MarkPaidSheet payment={makePayment()} contextLabel="x" onClose={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Data do pagamento'), { target: { value: '2026-10-07' } });
    await user.click(screen.getByRole('button', { name: 'Registrar pagamento' }));
    expect(screen.getByRole('alert')).toHaveTextContent('A data não pode ser futura.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows an API date error inline', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ field: 'paidAt', message: 'Data de pagamento inválida.' });
    render(<MarkPaidSheet payment={makePayment()} contextLabel="x" onClose={vi.fn()} onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Registrar pagamento' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Data de pagamento inválida.'));
  });

  it('explains late settlement for an anulada charge', () => {
    render(<MarkPaidSheet payment={voidPayment()} contextLabel="x" onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole('note')).toHaveTextContent('Esta cobrança foi anulada.');
  });
});
