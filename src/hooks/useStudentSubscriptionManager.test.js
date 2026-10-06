import { act, renderHook, waitFor } from '../test/test-utils';
import useStudentSubscriptionManager from './useStudentSubscriptionManager';
import * as subscriptionsApi from '../api/subscriptions';
import { useToast } from '../contexts/ToastContext';
import { apiError, makePayment, overduePayment, pinFinanceClock } from '../test/financeFixtures';

vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));

vi.mock('../api/subscriptions', () => ({
  getActiveSubscriptionForStudent: vi.fn(),
  listStudentPayments: vi.fn(),
  listSubscriptionPlans: vi.fn(),
  assignPlanToStudent: vi.fn(),
  cancelSubscription: vi.fn(),
  createSubscriptionPlan: vi.fn(),
  markPaymentAsPaid: vi.fn(),
  markPaymentAsPending: vi.fn(),
  updatePayment: vi.fn(),
  voidPayment: vi.fn(),
}));

const showToast = vi.fn();
const subscription = { id: 'sub-1', planId: 'plan-1' };

const setup = async () => {
  const hook = renderHook(() => useStudentSubscriptionManager('student-1', 'Maria Silva'));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
};

describe('useStudentSubscriptionManager', () => {
  beforeEach(() => {
    pinFinanceClock();
    vi.resetAllMocks();
    useToast.mockReturnValue({ showToast });
    subscriptionsApi.getActiveSubscriptionForStudent.mockResolvedValue(subscription);
    subscriptionsApi.listStudentPayments.mockResolvedValue({
      payments: [makePayment({ id: 'pending' }), overduePayment({ id: 'late', plan: { id: 'plan-1', name: 'Plano arquivado' } })],
    });
    subscriptionsApi.listSubscriptionPlans.mockResolvedValue([{ id: 'plan-1', name: 'Nome da lista' }]);
  });

  afterEach(() => vi.useRealTimers());

  it('takes the plan name from the payments (archived plans included) and the most urgent charge', async () => {
    const { result } = await setup();
    expect(result.current.planName).toBe('Consultoria Mensal');
    expect(result.current.currentCharge.id).toBe('late');
    expect(result.current.cancelMessage).toContain('Cancelar a assinatura de Maria Silva?');
  });

  it('replaces with ONE assign request (B1) and toasts the first billed cycle', async () => {
    subscriptionsApi.assignPlanToStudent.mockResolvedValue({
      id: 'sub-2',
      firstPayment: { cycleStartDate: '2026-10-15', cycleEndDate: '2026-11-14' },
    });
    const { result } = await setup();
    act(() => result.current.openReplace());
    await act(() => result.current.handleAssign({ planId: 'plan-2', startDate: '2026-10-15' }));

    expect(subscriptionsApi.cancelSubscription).not.toHaveBeenCalled();
    expect(subscriptionsApi.assignPlanToStudent).toHaveBeenCalledTimes(1);
    expect(subscriptionsApi.assignPlanToStudent).toHaveBeenCalledWith('student-1', { planId: 'plan-2', startDate: '2026-10-15' });
    expect(showToast).toHaveBeenCalledWith('Plano trocado. Primeira cobrança: 15/10 – 14/11.', 'success');
    expect(result.current.assignMode).toBeNull();
  });

  it('switches to replace mode and reloads on 409 already active', async () => {
    const { result } = await setup();
    act(() => result.current.openAssign());
    act(() => result.current.handleAlreadyActive());
    expect(result.current.assignMode).toBe('replace');
    await waitFor(() => expect(subscriptionsApi.listStudentPayments).toHaveBeenCalledTimes(2));
  });

  it('creates a plan then assigns it', async () => {
    subscriptionsApi.createSubscriptionPlan.mockResolvedValue({ id: 'plan-9' });
    subscriptionsApi.assignPlanToStudent.mockResolvedValue({});
    const { result } = await setup();
    act(() => result.current.openAssign());
    await act(() => result.current.handleCreatePlanAndAssign({ planPayload: { name: 'Novo' }, assignPayload: { startDate: '2026-10-06' } }));
    expect(subscriptionsApi.assignPlanToStudent).toHaveBeenCalledWith('student-1', { startDate: '2026-10-06', planId: 'plan-9' });
    expect(showToast).toHaveBeenCalledWith('Plano atribuído. Primeira cobrança: —.', 'success');
  });

  it('cancels the subscription and reloads', async () => {
    subscriptionsApi.cancelSubscription.mockResolvedValue({});
    const { result } = await setup();
    act(() => result.current.requestCancel());
    await act(() => result.current.handleConfirmCancel());
    expect(subscriptionsApi.cancelSubscription).toHaveBeenCalledWith('sub-1');
    expect(showToast).toHaveBeenCalledWith('Assinatura cancelada.', 'success');
    expect(result.current.cancelState).toBeNull();
  });

  it('maps a 409 on an already cancelled subscription to an info toast', async () => {
    subscriptionsApi.cancelSubscription.mockRejectedValue(
      apiError(409, 'SUBSCRIPTION_CANNOT_EDIT_CANCELLED', 'subscription.cannotEditCancelled'),
    );
    const { result } = await setup();
    act(() => result.current.requestCancel());
    await act(() => result.current.handleConfirmCancel());
    expect(showToast).toHaveBeenCalledWith('Esta assinatura já foi cancelada.', 'info');
  });
});
