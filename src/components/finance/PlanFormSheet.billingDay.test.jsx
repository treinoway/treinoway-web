import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen } from '../../test/test-utils';
import PlanFormSheet from './PlanFormSheet';
import { makePlan } from '../../test/financeFixtures';

const BANNER = 'Alunos que já estão no plano mantêm o dia de vencimento atual.';

// Renders the form for an existing plan with the given billing day.
const setupEdit = (billingDay) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<PlanFormSheet plan={makePlan({ billingDay })} onClose={vi.fn()} onSubmit={onSubmit} />);
  return { onSubmit, user: userEvent.setup() };
};

describe('PlanFormSheet billing day extras', () => {
  it('shows no banner until the day changes', async () => {
    const { user } = setupEdit(10);
    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();
    const field = screen.getByLabelText('Dia de vencimento');
    await user.clear(field);
    await user.type(field, '5');
    expect(screen.getByText(BANNER)).toBeInTheDocument();
  });

  it('hides the banner again when the original day is restored', async () => {
    const { user } = setupEdit(10);
    const field = screen.getByLabelText('Dia de vencimento');
    await user.clear(field);
    await user.type(field, '12');
    await user.clear(field);
    await user.type(field, '10');
    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();
  });

  it('shows the banner when clearing a set day', async () => {
    const { user } = setupEdit(10);
    await user.clear(screen.getByLabelText('Dia de vencimento'));
    expect(screen.getByText(BANNER)).toBeInTheDocument();
  });

  it('blocks submit when the browser flags the typed day as unparseable', async () => {
    const { onSubmit, user } = setupEdit(null);
    const field = screen.getByLabelText('Dia de vencimento');
    Object.defineProperty(field, 'validity', { value: { badInput: true } });
    fireEvent.change(field, { target: { value: '5' } });
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(field).toBeInvalid();
  });

  it('shows no banner when creating a plan', async () => {
    render(<PlanFormSheet onClose={vi.fn()} onSubmit={vi.fn()} />);
    await userEvent.setup().type(screen.getByLabelText('Dia de vencimento'), '5');
    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();
  });
});
