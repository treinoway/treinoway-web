import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test/test-utils';
import PlanFormSheet from './PlanFormSheet';
import { useAuth } from '../../contexts/AuthContext';
import {
  DUAL_ROLE,
  NUTRITIONIST_ONLY,
  TRAINER_ONLY,
  apiError,
  authAs,
  makePlan,
  nutritionPlan,
} from '../../test/financeFixtures';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));

const setup = (props = {}) => {
  const onSubmit = props.onSubmit || vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(<PlanFormSheet onClose={onClose} onSubmit={onSubmit} {...props} />);
  return { onSubmit, onClose, user: userEvent.setup() };
};

describe('PlanFormSheet', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue(authAs(TRAINER_ONLY));
  });

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
  describe('service type (Treino / Nutrição / Ambos)', () => {
    const SERVICE_CHOICES = ['Treino', 'Nutrição', 'Ambos'];

    const fillRequired = async (user) => {
      await user.type(screen.getByLabelText('Nome'), 'Plano');
      await user.type(screen.getByLabelText('Valor por cobrança (R$)'), '150');
    };

    it('offers the three types as .chip buttons of a ChoiceGroup for a dual-role user', () => {
      vi.mocked(useAuth).mockReturnValue(authAs(DUAL_ROLE));
      setup();
      const chips = SERVICE_CHOICES.map((name) => screen.getByRole('button', { name }));
      chips.forEach((chip) => {
        expect(chip).toHaveClass('chip');
        expect(chip).toHaveAttribute('aria-pressed');
      });
      const group = chips[0].closest('.chip-group');
      expect(group).toHaveAttribute('role', 'group');
      chips.forEach((chip) => expect(group).toContainElement(chip));
      expect(chips.filter((chip) => chip.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    });

    it.each([
      ['Treino', 'training'],
      ['Nutrição', 'nutrition'],
      ['Ambos', 'both'],
    ])('dual-role: choosing "%s" sends serviceType "%s"', async (label, serviceType) => {
      vi.mocked(useAuth).mockReturnValue(authAs(DUAL_ROLE));
      const { onSubmit, user } = setup();
      await fillRequired(user);
      await user.click(screen.getByRole('button', { name: label }));
      expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: label })).toHaveClass('chip--active');
      await user.click(screen.getByRole('button', { name: 'Criar plano' }));
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ serviceType }));
    });

    it('dual-role: always sends a serviceType, even without touching the choice', async () => {
      vi.mocked(useAuth).mockReturnValue(authAs(DUAL_ROLE));
      const { onSubmit, user } = setup();
      await fillRequired(user);
      await user.click(screen.getByRole('button', { name: 'Criar plano' }));
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        serviceType: expect.stringMatching(/^(training|nutrition|both)$/),
      }));
    });

    it('dual-role: editing pre-selects the plan type and sends it back', async () => {
      vi.mocked(useAuth).mockReturnValue(authAs(DUAL_ROLE));
      const { onSubmit, user } = setup({ plan: nutritionPlan() });
      expect(screen.getByRole('button', { name: 'Nutrição' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Treino' })).toHaveAttribute('aria-pressed', 'false');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ serviceType: 'nutrition' }));
    });

    it.each([
      ['trainer-only', TRAINER_ONLY],
      ['nutritionist-only', NUTRITIONIST_ONLY],
    ])('%s: shows no type choice and omits serviceType from the payload', async (_label, roles) => {
      vi.mocked(useAuth).mockReturnValue(authAs(roles));
      const { onSubmit, user } = setup();
      SERVICE_CHOICES.forEach((name) => expect(screen.queryByRole('button', { name })).not.toBeInTheDocument());
      await fillRequired(user);
      await user.click(screen.getByRole('button', { name: 'Criar plano' }));
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('serviceType');
    });

    it('single-role: editing a tagged plan still omits serviceType', async () => {
      vi.mocked(useAuth).mockReturnValue(authAs(NUTRITIONIST_ONLY));
      const { onSubmit, user } = setup({ plan: nutritionPlan() });
      await user.click(screen.getByRole('button', { name: 'Salvar' }));
      expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('serviceType');
    });
  });

  describe('copy by role', () => {
    it('nutritionist-only: the price-change banner counts "pacientes"', async () => {
      vi.mocked(useAuth).mockReturnValue(authAs(NUTRITIONIST_ONLY));
      const { user } = setup({ plan: nutritionPlan({ activeSubscriptionCount: 4 }) });
      const price = screen.getByLabelText('Valor por cobrança (R$)');
      await user.clear(price);
      await user.type(price, '120');
      expect(screen.getByRole('note')).toHaveTextContent(/4 pacientes com este plano continuam pagando R\$\s?99,90/);
    });
  });
});
