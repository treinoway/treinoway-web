import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test/test-utils';
import PlanFormSheet from './PlanFormSheet';
import { apiError, makePlan } from '../../test/financeFixtures';

const setup = (props = {}) => {
  const onSubmit = props.onSubmit || vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(<PlanFormSheet onClose={onClose} onSubmit={onSubmit} {...props} />);
  return { onSubmit, onClose, user: userEvent.setup() };
};

describe('PlanFormSheet', () => {
  it('creates a plan with an explicit discount payload and focuses the first field', async () => {
    const { onSubmit, user } = setup();
    expect(screen.getByRole('dialog', { name: 'Novo plano' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveFocus();

    await user.type(screen.getByLabelText('Nome'), 'Consultoria Mensal');
    await user.click(screen.getByRole('button', { name: 'Trimestral' }));
    await user.type(screen.getByLabelText('Valor por cobrança (R$)'), '99,90');
    await user.click(screen.getByRole('button', { name: 'Percentual' }));
    await user.type(screen.getByLabelText('Desconto (%)'), '33,33');

    expect(screen.getByText(/R\$\s?66,60/)).toBeInTheDocument();
    expect(screen.getByText('a cada 3 meses')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Criar plano' }));
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Consultoria Mensal',
      recurrence: 'quarterly',
      price: 99.9,
      discountPercent: 33.33,
      discountAmount: null,
      billingDay: null,
    });
  });

  it('sends both discounts as null for "Nenhum"', async () => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByLabelText('Nome'), 'Plano');
    await user.type(screen.getByLabelText('Valor por cobrança (R$)'), '150');
    await user.click(screen.getByRole('button', { name: 'Criar plano' }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ price: 150, discountPercent: null, discountAmount: null }));
  });

  it('validates required name, price decimals and percent decimals (max 2)', async () => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByLabelText('Valor por cobrança (R$)'), '10,001');
    await user.click(screen.getByRole('button', { name: 'Percentual' }));
    await user.type(screen.getByLabelText('Desconto (%)'), '33,333');
    await user.click(screen.getByRole('button', { name: 'Criar plano' }));

    expect(screen.getByText('Informe o nome do plano.')).toBeInTheDocument();
    expect(screen.getAllByText('Use até duas casas decimais.')).toHaveLength(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a fixed discount above the price', async () => {
    const { onSubmit, user } = setup();
    await user.type(screen.getByLabelText('Nome'), 'Plano');
    await user.type(screen.getByLabelText('Valor por cobrança (R$)'), '50');
    await user.click(screen.getByRole('button', { name: 'Valor fixo' }));
    await user.type(screen.getByLabelText('Desconto (R$)'), '60');
    await user.click(screen.getByRole('button', { name: 'Criar plano' }));
    expect(screen.getByText('O desconto não pode ser maior que o valor.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('in edit mode shows the price-change banner only after the price changes', async () => {
    const { user } = setup({ plan: makePlan({ activeSubscriptionCount: 4 }) });
    expect(screen.getByRole('dialog', { name: 'Editar plano' })).toBeInTheDocument();
    expect(screen.getByLabelText('Valor por cobrança (R$)')).toHaveValue('99,90');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();

    const price = screen.getByLabelText('Valor por cobrança (R$)');
    await user.clear(price);
    await user.type(price, '120');
    expect(screen.getByRole('note')).toHaveTextContent(
      /4 alunos com este plano continuam pagando R\$\s?99,90/,
    );
  });

  it('uses the generic banner text when nobody has the plan', async () => {
    const { user } = setup({ plan: makePlan({ activeSubscriptionCount: 0 }) });
    await user.click(screen.getByRole('button', { name: 'Percentual' }));
    await user.type(screen.getByLabelText('Desconto (%)'), '10');
    expect(screen.getByRole('note')).toHaveTextContent('Quem já tem este plano continua pagando o valor atual.');
  });

  it('shows "Carregando..." while saving and an inline API error on failure', async () => {
    let reject;
    const onSubmit = vi.fn(() => new Promise((_, rej) => { reject = rej; }));
    const { user } = setup({ plan: makePlan(), onSubmit });
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(screen.getByRole('button', { name: 'Carregando...' })).toBeDisabled();

    reject(apiError(400, 'SUBSCRIPTION_INVALID_AMOUNT', 'subscription.invalidAmount', 'Valor inválido.'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Valor inválido.'));
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();
  });

  it('closes on Cancelar and on Escape', async () => {
    const { onClose, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  describe('billing day ("Dia de vencimento")', () => {
    const fillRequired = async (user) => {
      await user.type(screen.getByLabelText('Nome'), 'Plano');
      await user.type(screen.getByLabelText('Valor por cobrança (R$)'), '150');
    };

    it('sends billingDay null when the field is left empty', async () => {
      const { onSubmit, user } = setup();
      expect(screen.getByLabelText('Dia de vencimento')).toHaveValue(null);
      await fillRequired(user);
      await user.click(screen.getByRole('button', { name: 'Criar plano' }));
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ billingDay: null }));
    });

    it('sends the typed day as a number', async () => {
      const { onSubmit, user } = setup();
      await fillRequired(user);
      await user.type(screen.getByLabelText('Dia de vencimento'), '10');
      await user.click(screen.getByRole('button', { name: 'Criar plano' }));
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ billingDay: 10 }));
    });

    it('pre-fills the plan billing day when editing', async () => {
      const { onSubmit, user } = setup({ plan: makePlan({ billingDay: 31 }) });
      expect(screen.getByLabelText('Dia de vencimento')).toHaveValue(31);
      await user.click(screen.getByRole('button', { name: 'Salvar' }));
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ billingDay: 31 }));
    });

    it.each(['0', '32'])('blocks submit when the day is %s', async (value) => {
      const { onSubmit, user } = setup();
      await fillRequired(user);
      await user.type(screen.getByLabelText('Dia de vencimento'), value);
      await user.click(screen.getByRole('button', { name: 'Criar plano' }));
      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Dia de vencimento')).toBeInvalid();
    });
  });
});
