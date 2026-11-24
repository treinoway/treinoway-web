import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { fireEvent, render, screen } from '../../test/test-utils';
import AssignPlanSheet from './AssignPlanSheet';
import { makePlan, pinFinanceClock } from '../../test/financeFixtures';

// why: the finance UI reads the professional roles from useAuth; these cases run as a trainer-only user
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 1 }, isAuthenticated: true, hasRole: (role) => role === 'TRAINER' }),
}));

// Renders the sheet with one plan billed on day 10.
const setup = () => {
  const onAssign = vi.fn().mockResolvedValue(undefined);
  render(
    <AssignPlanSheet
      plans={[makePlan({ billingDay: 10 })]}
      onClose={vi.fn()}
      onAssign={onAssign}
      onCreatePlanAndAssign={vi.fn()}
    />,
  );
  return { onAssign, user: userEvent.setup() };
};

describe('AssignPlanSheet billing day extras', () => {
  beforeEach(pinFinanceClock);
  afterEach(() => vi.useRealTimers());

  it('shows the first-cycle preview for a start today', () => {
    setup();
    expect(screen.getByText('Primeiro ciclo')).toBeInTheDocument();
    expect(screen.getByText(/primeiro vencimento/i)).toBeInTheDocument();
  });

  it('hides the first-cycle preview for a past start date', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Outra data' }));
    fireEvent.change(screen.getByLabelText('Data de início'), { target: { value: '2026-09-01' } });
    expect(screen.queryByText('Primeiro ciclo')).not.toBeInTheDocument();
    expect(screen.queryByText(/primeiro vencimento/i)).not.toBeInTheDocument();
  });

  it('blocks submit and shows an error for an out-of-range day', async () => {
    const { onAssign, user } = setup();
    const field = screen.getByLabelText('Dia de vencimento');
    await user.clear(field);
    await user.type(field, '32');
    await user.click(screen.getByRole('button', { name: 'Atribuir plano' }));
    expect(onAssign).not.toHaveBeenCalled();
    expect(field).toBeInvalid();
    expect(screen.queryByText('Primeiro ciclo')).not.toBeInTheDocument();
  });

  it('blocks submit when the browser flags the typed day as unparseable', async () => {
    const { onAssign, user } = setup();
    const field = screen.getByLabelText('Dia de vencimento');
    Object.defineProperty(field, 'validity', { value: { badInput: true } });
    fireEvent.change(field, { target: { value: '5' } });
    await user.click(screen.getByRole('button', { name: 'Atribuir plano' }));
    expect(onAssign).not.toHaveBeenCalled();
    expect(field).toBeInvalid();
  });

  it('adds a next-due caption only when the first cycle starts before the start date', async () => {
    const { user } = setup();
    expect(screen.getByText(/próximo vencimento: 10\/10/i)).toBeInTheDocument();
    const field = screen.getByLabelText('Dia de vencimento');
    await user.clear(field);
    await user.type(field, '6');
    expect(screen.queryByText(/próximo vencimento/i)).not.toBeInTheDocument();
  });
});
