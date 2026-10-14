import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import StudentRelationshipMetrics from './StudentRelationshipMetrics';

const NOW = new Date('2026-10-04T12:00:00');

const summary = {
  adherence: 38,
  adherenceCompleted: 3,
  adherenceExpected: 8,
  adherenceMonth: '2026-10-01',
  previousAdherence: 85,
  previousAdherenceMonth: '2026-09-01',
};

const renderMetrics = (props = {}) => {
  const onAssignPlan = vi.fn();
  render(
    <StudentRelationshipMetrics
      loading={false}
      summary={summary}
      subscription={{ id: 'sub-1', planId: 'plan-1' }}
      nextPayment={{ cycleEndDate: '2026-11-15', status: 'pending' }}
      planName="Plano trimestral"
      lastWorkoutAt="2026-09-25T12:00:00"
      onAssignPlan={onAssignPlan}
      {...props}
    />,
  );
  return { onAssignPlan };
};

describe('StudentRelationshipMetrics', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => vi.useRealTimers());

  it('renders the section heading', () => {
    renderMetrics();
    expect(screen.getByRole('heading', { name: 'Aderência e relacionamento' })).toBeInTheDocument();
  });

  it('shows the month adherence with counts and the delta vs the previous month', () => {
    renderMetrics();
    expect(screen.getByText('Aderência do mês')).toBeInTheDocument();
    expect(screen.getByText('38%')).toBeInTheDocument();
    expect(screen.getByText('3/8 treinos · ↓ 47 pts vs setembro')).toBeInTheDocument();
  });

  it('explains a missing adherence', () => {
    renderMetrics({ summary: { ...summary, adherence: null } });
    expect(screen.getByText('Sem rotina ativa no mês')).toBeInTheDocument();
  });

  it('shows the days until the subscription renews', () => {
    renderMetrics();
    expect(screen.getByText('Renova em')).toBeInTheDocument();
    expect(screen.getByText('42 dias')).toBeInTheDocument();
    expect(screen.getByText('15/11/2026 · Plano trimestral')).toBeInTheDocument();
  });

  it('flags an overdue charge with the API days overdue', () => {
    renderMetrics({ nextPayment: { cycleEndDate: '2026-10-30', dueDate: '2026-10-01', effectiveStatus: 'overdue', daysOverdue: 3 } });
    expect(screen.getByText('Venceu há')).toBeInTheDocument();
    expect(screen.getByText('3 dias')).toBeInTheDocument();
  });

  it('does not flag a charge inside the grace window (API still says pending)', () => {
    renderMetrics({ nextPayment: { cycleEndDate: '2026-10-01', dueDate: '2026-10-01', effectiveStatus: 'pending', daysOverdue: 0 } });
    expect(screen.queryByText('Venceu há')).not.toBeInTheDocument();
  });

  it('has no subscription menu (replace/cancel/history live in the Assinatura block)', () => {
    renderMetrics();
    expect(screen.getByText('Renova em')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ações da assinatura' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('has no subscription menu when the subscription has no payment cycle', () => {
    renderMetrics({ nextPayment: null });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('offers to assign a plan when there is no subscription', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const actions = renderMetrics({ subscription: null, nextPayment: null });
    expect(screen.getByText('Sem plano')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Atribuir plano' }));
    expect(actions.onAssignPlan).toHaveBeenCalledTimes(1);
  });

  it('shows the plan name when the subscription has no payment cycle', () => {
    renderMetrics({ nextPayment: null });
    expect(screen.getByText('Plano trimestral')).toBeInTheDocument();
    expect(screen.getByText('Sem ciclo de cobrança')).toBeInTheDocument();
  });

  it('shows how long ago the last session was', () => {
    renderMetrics();
    expect(screen.getByText('Última sessão')).toBeInTheDocument();
    expect(screen.getByText('Há 9 dias')).toBeInTheDocument();
  });

  it('shows "Nunca" when the student never trained', () => {
    renderMetrics({ lastWorkoutAt: undefined });
    expect(screen.getByText('Nunca')).toBeInTheDocument();
    expect(screen.getByText('Nenhuma sessão registrada')).toBeInTheDocument();
  });

  it('shows one skeleton for the whole row while loading — no figure appears on its own', () => {
    renderMetrics({ loading: true });
    expect(screen.getByRole('heading', { name: 'Aderência e relacionamento' })).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Carregando indicadores' })).toBeInTheDocument();
    expect(screen.queryByText('Aderência do mês')).not.toBeInTheDocument();
    expect(screen.queryByText('Renova em')).not.toBeInTheDocument();
    expect(screen.queryByText('Última sessão')).not.toBeInTheDocument();
    expect(screen.queryByText('Nunca')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Atribuir plano' })).not.toBeInTheDocument();
  });

  it('shows the three figures together once loaded', () => {
    renderMetrics();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Aderência do mês')).toBeInTheDocument();
    expect(screen.getByText('Renova em')).toBeInTheDocument();
    expect(screen.getByText('Última sessão')).toBeInTheDocument();
  });
});
