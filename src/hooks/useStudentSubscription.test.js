import { act, renderHook, waitFor } from '../test/test-utils';
import useStudentSubscription from './useStudentSubscription';
import * as subscriptionsApi from '../api/subscriptions';

vi.mock('../api/subscriptions', () => ({
  getActiveSubscriptionForStudent: vi.fn(),
  listPaymentsForSubscription: vi.fn(),
  listSubscriptionPlans: vi.fn(),
  assignPlanToStudent: vi.fn(),
  cancelSubscription: vi.fn(),
  createSubscriptionPlan: vi.fn(),
}));

const plans = [
  { id: 'plan-1', name: 'Plano trimestral', isArchived: false },
  { id: 'plan-2', name: 'Plano antigo', isArchived: true },
];

const setup = async () => {
  const showToast = vi.fn();
  const hook = renderHook(() => useStudentSubscription('student-1', showToast));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return { ...hook, showToast };
};

describe('useStudentSubscription', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    subscriptionsApi.listSubscriptionPlans.mockResolvedValue(plans);
    subscriptionsApi.getActiveSubscriptionForStudent.mockResolvedValue({ id: 'sub-1', planId: 'plan-1' });
    subscriptionsApi.listPaymentsForSubscription.mockResolvedValue([
      { id: 'pay-old', cycleStartDate: '2026-07-01', cycleEndDate: '2026-09-30', status: 'paid' },
      { id: 'pay-open', cycleStartDate: '2099-10-01', cycleEndDate: '2099-12-31', status: 'pending' },
    ]);
  });

  it('loads the subscription, its open cycle, the plan name and the active plans', async () => {
    const { result } = await setup();
    expect(result.current.subscription).toEqual({ id: 'sub-1', planId: 'plan-1' });
    expect(result.current.nextPayment.id).toBe('pay-open');
    await waitFor(() => expect(result.current.planName).toBe('Plano trimestral'));
    expect(result.current.activePlans).toEqual([plans[0]]);
  });

  it('falls back to the most recent cycle when none is open', async () => {
    subscriptionsApi.listPaymentsForSubscription.mockResolvedValue([
      { id: 'pay-1', cycleStartDate: '2026-04-01', cycleEndDate: '2026-06-30', status: 'paid' },
      { id: 'pay-2', cycleStartDate: '2026-07-01', cycleEndDate: '2026-09-30', status: 'paid' },
    ]);
    const { result } = await setup();
    expect(result.current.nextPayment.id).toBe('pay-2');
  });

  it('has no subscription nor payment for a student without plan', async () => {
    subscriptionsApi.getActiveSubscriptionForStudent.mockResolvedValue(null);
    const { result } = await setup();
    expect(result.current.subscription).toBeNull();
    expect(result.current.nextPayment).toBeNull();
    expect(subscriptionsApi.listPaymentsForSubscription).not.toHaveBeenCalled();
  });

  it('replaces the plan with a single assignment (the backend cancels the old one atomically)', async () => {
    subscriptionsApi.assignPlanToStudent.mockResolvedValue({ id: 'sub-2', planId: 'plan-1', firstPayment: { id: 'pay-new' } });
    const { result, showToast } = await setup();
    await act(() => result.current.replacePlan({ planId: 'plan-1' }));
    expect(subscriptionsApi.cancelSubscription).not.toHaveBeenCalled();
    expect(subscriptionsApi.assignPlanToStudent).toHaveBeenCalledTimes(1);
    expect(subscriptionsApi.assignPlanToStudent).toHaveBeenCalledWith('student-1', { planId: 'plan-1' });
    expect(result.current.subscription.id).toBe('sub-2');
    expect(result.current.nextPayment).toEqual({ id: 'pay-new' });
    expect(showToast).toHaveBeenCalledWith('Plano atribuído.', 'success');
  });

  it('keeps the current subscription when the replacement fails', async () => {
    const failure = { userMessage: 'Falhou' };
    subscriptionsApi.assignPlanToStudent.mockRejectedValue(failure);
    const { result, showToast } = await setup();
    await act(() => expect(result.current.replacePlan({ planId: 'plan-1' })).rejects.toBe(failure));
    expect(subscriptionsApi.cancelSubscription).not.toHaveBeenCalled();
    expect(result.current.subscription).toEqual({ id: 'sub-1', planId: 'plan-1' });
    expect(result.current.nextPayment.id).toBe('pay-open');
    expect(showToast).not.toHaveBeenCalledWith('Plano atribuído.', 'success');
  });

  it('creates a plan and assigns it', async () => {
    subscriptionsApi.createSubscriptionPlan.mockResolvedValue({ id: 'plan-3', name: 'Novo', isArchived: false });
    subscriptionsApi.assignPlanToStudent.mockResolvedValue({ id: 'sub-3', planId: 'plan-3' });
    const { result } = await setup();
    await act(() => result.current.createPlanAndAssign({ planPayload: { name: 'Novo' }, assignPayload: { startDate: '2026-10-04' } }));
    expect(subscriptionsApi.assignPlanToStudent).toHaveBeenCalledWith('student-1', { startDate: '2026-10-04', planId: 'plan-3' });
    expect(result.current.planName).toBe('Novo');
  });

  it('reports a failed cancellation and keeps the subscription', async () => {
    subscriptionsApi.cancelSubscription.mockRejectedValue({ userMessage: 'Falhou' });
    const { result, showToast } = await setup();
    await act(() => result.current.cancel());
    expect(showToast).toHaveBeenCalledWith('Falhou', 'error');
    expect(result.current.subscription).not.toBeNull();
  });

  it('reports a failed load', async () => {
    subscriptionsApi.getActiveSubscriptionForStudent.mockRejectedValue({ userMessage: 'Erro ao carregar' });
    const { showToast } = await setup();
    expect(showToast).toHaveBeenCalledWith('Erro ao carregar', 'error');
  });

  describe('when the student changes', () => {
    const deferred = () => {
      let resolve;
      const promise = new Promise((res) => { resolve = res; });
      return { promise, resolve };
    };

    it('resets the subscription and ignores a late response for the previous student', async () => {
      const lateA = deferred();
      subscriptionsApi.getActiveSubscriptionForStudent.mockImplementation((studentId) => (
        studentId === 'student-a' ? lateA.promise : Promise.resolve({ id: 'sub-b', planId: 'plan-1' })
      ));
      const showToast = vi.fn();
      const { result, rerender } = renderHook(
        ({ studentId }) => useStudentSubscription(studentId, showToast),
        { initialProps: { studentId: 'student-a' } },
      );

      rerender({ studentId: 'student-b' });
      await waitFor(() => expect(result.current.subscription).toEqual({ id: 'sub-b', planId: 'plan-1' }));

      await act(async () => { lateA.resolve({ id: 'sub-a', planId: 'plan-1' }); });
      expect(result.current.subscription).toEqual({ id: 'sub-b', planId: 'plan-1' });
      expect(subscriptionsApi.listPaymentsForSubscription).not.toHaveBeenCalledWith('sub-a');
    });

    it('clears the previous student subscription while the next one loads', async () => {
      const { result, rerender } = renderHook(
        ({ studentId }) => useStudentSubscription(studentId, vi.fn()),
        { initialProps: { studentId: 'student-a' } },
      );
      await waitFor(() => expect(result.current.subscription).toEqual({ id: 'sub-1', planId: 'plan-1' }));

      subscriptionsApi.getActiveSubscriptionForStudent.mockReturnValue(new Promise(() => {}));
      rerender({ studentId: 'student-b' });
      await waitFor(() => expect(result.current.loading).toBe(true));
      expect(result.current.subscription).toBeNull();
      expect(result.current.nextPayment).toBeNull();
      expect(result.current.planName).toBeNull();
    });

    it('ignores a late load error for the previous student', async () => {
      const lateA = deferred();
      subscriptionsApi.getActiveSubscriptionForStudent.mockImplementation((studentId) => (
        studentId === 'student-a' ? lateA.promise : Promise.resolve(null)
      ));
      const showToast = vi.fn();
      const { result, rerender } = renderHook(
        ({ studentId }) => useStudentSubscription(studentId, showToast),
        { initialProps: { studentId: 'student-a' } },
      );
      rerender({ studentId: 'student-b' });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => { lateA.resolve(Promise.reject({ userMessage: 'Erro do aluno A' })); });
      expect(showToast).not.toHaveBeenCalledWith('Erro do aluno A', 'error');
      expect(result.current.subscription).toBeNull();
    });
  });
});
