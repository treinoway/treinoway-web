import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen, waitFor } from '../../test/test-utils';
import AssignPlanSheet from './AssignPlanSheet';
import { apiError, makePlan, pinFinanceClock } from '../../test/financeFixtures';

const monthly = makePlan({ discountPercent: '33.33' });
const annual = makePlan({ id: 'plan-2', name: 'Anual', recurrence: 'annual', recurrenceLabel: 'Anual', price: '990.00' });

const setup = (props = {}) => {
  const callbacks = {
    onClose: vi.fn(),
    onAssign: vi.fn().mockResolvedValue(undefined),
    onCreatePlanAndAssign: vi.fn().mockResolvedValue(undefined),
    onAlreadyActive: vi.fn(),
    onPlanArchived: vi.fn(),
  };
  render(<AssignPlanSheet plans={[monthly, annual]} {...callbacks} {...props} />);
  return { ...callbacks, ...props, user: userEvent.setup() };
};

describe('AssignPlanSheet', () => {
  beforeEach(pinFinanceClock);
  afterEach(() => vi.useRealTimers());

  it('pre-selects the first plan, previews the plan discount and assigns starting today', async () => {
    const { onAssign, user } = setup();
    expect(screen.getByRole('radio', { name: /Consultoria Mensal/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Valor por ciclo')).toBeInTheDocument();
    expect(screen.getAllByText(/R\$\s?66,60/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Atribuir plano' }));
    // "Do plano" omits both discount fields
    expect(onAssign).toHaveBeenCalledWith({ planId: 'plan-1', startDate: '2026-10-06' });
  });

  it('starts on the 1st of next month', async () => {
    const { onAssign, user } = setup();
    await user.click(screen.getByRole('button', { name: '1º do próximo mês' }));
    await user.click(screen.getByRole('button', { name: 'Atribuir plano' }));
    expect(onAssign).toHaveBeenCalledWith(expect.objectContaining({ startDate: '2026-11-01' }));
  });

  it('warns about a past start date (no retroactive charges)', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Outra data' }));
    fireEvent.change(screen.getByLabelText('Data de início'), { target: { value: '2026-09-01' } });
    expect(screen.getByRole('note')).toHaveTextContent('Data no passado: só o ciclo atual é cobrado');
  });

  it('"Nenhum" sends both discounts as null; "Personalizado" sends the chosen one + null', async () => {
    const { onAssign, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Ajustar desconto' }));
    expect(screen.getByRole('button', { name: 'Do plano (−33,33%)' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Nenhum' }));
    await user.click(screen.getByRole('button', { name: 'Atribuir plano' }));
    expect(onAssign).toHaveBeenLastCalledWith({ planId: 'plan-1', startDate: '2026-10-06', discountPercent: null, discountAmount: null });
  });

  it('custom fixed discount is sent with discountPercent null', async () => {
    const { onAssign, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Ajustar desconto' }));
    await user.click(screen.getByRole('button', { name: 'Personalizado' }));
    await user.click(screen.getByRole('button', { name: 'R$' }));
    await user.type(screen.getByLabelText('Desconto (R$)'), '9,90');
    expect(screen.getAllByText(/R\$\s?90,00/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Atribuir plano' }));
    expect(onAssign).toHaveBeenLastCalledWith({ planId: 'plan-1', startDate: '2026-10-06', discountPercent: null, discountAmount: 9.9 });
  });

  it('caps a custom percent at 2 decimals', async () => {
    const { onAssign, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Ajustar desconto' }));
    await user.click(screen.getByRole('button', { name: 'Personalizado' }));
    await user.type(screen.getByLabelText('Desconto (%)'), '10,555');
    await user.click(screen.getByRole('button', { name: 'Atribuir plano' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Use até duas casas decimais.');
    expect(onAssign).not.toHaveBeenCalled();
  });

  it('disables "Do plano" when the plan has no default discount', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('radio', { name: /Anual/ }));
    await user.click(screen.getByRole('button', { name: 'Ajustar desconto' }));
    expect(screen.getByRole('button', { name: 'Do plano (sem desconto)' })).toBeDisabled();
  });

  describe('replace mode (B1: a single request)', () => {
    it('disables the current plan, pre-selects another and explains an immediate replace', async () => {
      const { onAssign, user } = setup({ mode: 'replace', currentPlanId: 'plan-1', currentPlanName: 'Consultoria Mensal' });
      expect(screen.getByRole('dialog', { name: 'Trocar plano' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /Plano atual/ })).toBeDisabled();
      expect(screen.getByRole('radio', { name: /Anual/ })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('note')).toHaveTextContent('Consultoria Mensal é encerrado agora.');

      await user.click(screen.getByRole('button', { name: 'Trocar plano' }));
      expect(onAssign).toHaveBeenCalledTimes(1);
      expect(onAssign).toHaveBeenCalledWith({ planId: 'plan-2', startDate: '2026-10-06' });
    });

    it('explains a future-dated replace', async () => {
      const { user } = setup({ mode: 'replace', currentPlanId: 'plan-1', currentPlanName: 'Consultoria Mensal' });
      await user.click(screen.getByRole('button', { name: '1º do próximo mês' }));
      expect(screen.getByRole('note')).toHaveTextContent('Consultoria Mensal continua cobrando até 01/11');
    });
  });

  it('maps 409 SUBSCRIPTION_ALREADY_ACTIVE inline and asks the parent to refetch', async () => {
    const onAssign = vi.fn().mockRejectedValue(apiError(409, 'SUBSCRIPTION_ALREADY_ACTIVE', 'subscription.alreadyActive'));
    const { onAlreadyActive, user } = setup({ onAssign });
    await user.click(screen.getByRole('button', { name: 'Atribuir plano' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Este aluno já possui uma assinatura ativa.'));
    expect(onAlreadyActive).toHaveBeenCalled();
  });

  it('maps 409 SUBSCRIPTION_PLAN_ARCHIVED under the plan list and refetches plans', async () => {
    const onAssign = vi.fn().mockRejectedValue(apiError(409, 'SUBSCRIPTION_PLAN_ARCHIVED', 'subscription.planArchived'));
    const { onPlanArchived, user } = setup({ onAssign });
    await user.click(screen.getByRole('button', { name: 'Atribuir plano' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Este plano foi arquivado. Escolha outro.'));
    expect(onPlanArchived).toHaveBeenCalled();
  });

  describe('billing day ("Dia de vencimento")', () => {
    const billed = makePlan({ id: 'plan-3', name: 'Dia dez', billingDay: 10 });

    it('pre-fills the day from the selected plan and sends the edited override', async () => {
      const { onAssign, user } = setup({ plans: [billed, annual] });
      const field = screen.getByLabelText('Dia de vencimento');
      expect(field).toHaveValue(10);

      await user.clear(field);
      await user.type(field, '5');
      await user.click(screen.getByRole('button', { name: 'Atribuir plano' }));
      expect(onAssign).toHaveBeenCalledWith(expect.objectContaining({ planId: 'plan-3', billingDay: 5 }));
    });

    it('re-fills when another plan is picked (empty for a plan without day)', async () => {
      const { user } = setup({ plans: [billed, annual] });
      await user.click(screen.getByRole('radio', { name: /Anual/ }));
      expect(screen.getByLabelText('Dia de vencimento')).toHaveValue(null);
      await user.click(screen.getByRole('radio', { name: /Dia dez/ }));
      expect(screen.getByLabelText('Dia de vencimento')).toHaveValue(10);
    });

    it('omits billingDay from the payload when the field is empty', async () => {
      const { onAssign, user } = setup();
      expect(screen.getByLabelText('Dia de vencimento')).toHaveValue(null);
      await user.click(screen.getByRole('button', { name: 'Atribuir plano' }));
      expect(onAssign.mock.calls[0][0]).not.toHaveProperty('billingDay');
    });

    it('previews the first cycle period and first due date (dd/MM like the rest of the app)', async () => {
      const { user } = setup({ plans: [billed, annual] });
      await user.click(screen.getByRole('button', { name: '1º do próximo mês' }));
      expect(screen.getByText(/10\/10.*09\/11/)).toBeInTheDocument();
      expect(screen.getByText(/primeiro vencimento.*01\/11/i)).toBeInTheDocument();
    });
  });

  it('quick-creates a plan when the trainer has none', async () => {
    const user = userEvent.setup();
    const onCreatePlanAndAssign = vi.fn().mockResolvedValue(undefined);
    render(
      <AssignPlanSheet plans={[]} onClose={vi.fn()} onAssign={vi.fn()} onCreatePlanAndAssign={onCreatePlanAndAssign} />,
    );
    expect(screen.getByText('Você ainda não tem planos. Crie um agora e já atribua a este aluno.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Nome'), 'Mensal');
    await user.type(screen.getByLabelText('Valor por cobrança (R$)'), '150');
    await user.click(screen.getByRole('button', { name: 'Criar e atribuir' }));
    expect(onCreatePlanAndAssign).toHaveBeenCalledWith({
      planPayload: { name: 'Mensal', recurrence: 'monthly', price: 150 },
      assignPayload: { startDate: '2026-10-06' },
    });
  });

  it('cancels', async () => {
    const { onClose, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalled();
  });
});
