import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen, waitFor } from '../../test/test-utils';
import EditPaymentSheet from './EditPaymentSheet';
import { makePayment, paidPayment } from '../../test/financeFixtures';

const renderSheet = (payment, onSubmit = vi.fn().mockResolvedValue(null)) => {
  const onClose = vi.fn();
  render(<EditPaymentSheet payment={payment} contextLabel="ctx" graceDays={3} onClose={onClose} onSubmit={onSubmit} />);
  return { onSubmit, onClose, user: userEvent.setup() };
};

describe('EditPaymentSheet', () => {
  it('PATCHes only the changed fields', async () => {
    const { onSubmit, user } = renderSheet(makePayment());
    const amount = screen.getByLabelText('Valor (R$)');
    await user.clear(amount);
    await user.type(amount, '120,50');
    await user.type(screen.getByLabelText('Observação'), 'Pix');
    expect(screen.getByText('3/500')).toBeInTheDocument();
    expect(screen.getByText('A cobrança entra em atraso 3 dias após o vencimento.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSubmit).toHaveBeenCalledWith({ amount: 120.5, notes: 'Pix' });
  });

  it('changes the due date', async () => {
    const { onSubmit, user } = renderSheet(makePayment());
    fireEvent.change(screen.getByLabelText('Vencimento'), { target: { value: '2026-10-15' } });
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSubmit).toHaveBeenCalledWith({ dueDate: '2026-10-15' });
  });

  it('locks amount and due date on a paid charge and explains why', async () => {
    const { onSubmit, user } = renderSheet(paidPayment());
    expect(screen.getByLabelText('Valor (R$)')).toBeDisabled();
    expect(screen.getByLabelText('Vencimento')).toBeDisabled();
    expect(screen.getByRole('note')).toHaveTextContent('Cobrança paga: valor e vencimento ficam bloqueados.');

    await user.type(screen.getByLabelText('Observação'), 'Recibo enviado');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSubmit).toHaveBeenCalledWith({ notes: 'Recibo enviado' });
  });

  it('closes without a request when nothing changed', async () => {
    const { onSubmit, onClose, user } = renderSheet(makePayment());
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('validates the amount and shows API amount errors inline', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ field: 'amount', message: 'Valor inválido. Use até duas casas decimais.' });
    const { user } = renderSheet(makePayment(), onSubmit);
    const amount = screen.getByLabelText('Valor (R$)');
    await user.clear(amount);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Informe um valor.');

    await user.type(amount, '50');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Valor inválido.'));
  });
});
