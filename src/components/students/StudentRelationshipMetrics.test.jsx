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
  const subscriptionActions = {
    onAssignPlan: vi.fn(),
    onReplacePlan: vi.fn(),
    onViewHistory: vi.fn(),
    onCancelSubscription: vi.fn(),
  };
  render(
    <StudentRelationshipMetrics
      summary={summary}
      summaryLoading={false}
      subscription={{ id: 'sub-1', planId: 'plan-1' }}
      nextPayment={{ cycleEndDate: '2026-11-15', status: 'pending' }}
      planName="Plano trimestral"
      subscriptionLoading={false}
      lastWorkoutAt="2026-09-25T12:00:00"
      subscriptionActions={subscriptionActions}
      {...props}
    />,
  );
  return subscriptionActions;
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

  it('flags an overdue cycle', () => {
    renderMetrics({ nextPayment: { cycleEndDate: '2026-10-01', status: 'pending' } });
    expect(screen.getByText('Venceu há')).toBeInTheDocument();
    expect(screen.getByText('3 dias')).toBeInTheDocument();
  });

  it('offers the subscription actions in a row menu', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const actions = renderMetrics();
    await user.click(screen.getByRole('button', { name: 'Ações da assinatura' }));
    await user.click(screen.getByRole('button', { name: 'Trocar plano' }));
    expect(actions.onReplacePlan).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Ações da assinatura' }));
    await user.click(screen.getByRole('button', { name: 'Ver histórico' }));
    expect(actions.onViewHistory).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Ações da assinatura' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar assinatura' }));
    expect(actions.onCancelSubscription).toHaveBeenCalledTimes(1);
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

  it('hides adherence and renewal values while loading', () => {
    renderMetrics({ summaryLoading: true, subscriptionLoading: true });
    expect(screen.queryByText('Aderência do mês')).not.toBeInTheDocument();
    expect(screen.queryByText('Renova em')).not.toBeInTheDocument();
    expect(screen.getByText('Última sessão')).toBeInTheDocument();
  });
});
