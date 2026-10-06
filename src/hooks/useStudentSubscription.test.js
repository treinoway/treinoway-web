import { act, renderHook, waitFor } from '../test/test-utils';
import useStudentSubscription from './useStudentSubscription';
import * as subscriptionsApi from '../api/subscriptions';
import { makePayment, overduePayment } from '../test/financeFixtures';

vi.mock('../api/subscriptions', () => ({
  getActiveSubscriptionForStudent: vi.fn(),
  listStudentPayments: vi.fn(),
  listSubscriptionPlans: vi.fn(),
}));

const plans = [{ id: 'plan-1', name: 'Plano trimestral', isArchived: false }];
const activeSubscription = { id: 'sub-1', planId: 'plan-1' };

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

describe('useStudentSubscription', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    subscriptionsApi.listSubscriptionPlans.mockResolvedValue(plans);
    subscriptionsApi.getActiveSubscriptionForStudent.mockResolvedValue(activeSubscription);
    subscriptionsApi.listStudentPayments.mockResolvedValue({ payments: [overduePayment(), makePayment()] });
  });

  it('loads the active subscription and every payment of the student in parallel', async () => {
    const { result } = renderHook(() => useStudentSubscription('student-1'));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(subscriptionsApi.getActiveSubscriptionForStudent).toHaveBeenCalledWith('student-1');
    expect(subscriptionsApi.listStudentPayments).toHaveBeenCalledWith('student-1');
    expect(result.current.subscription).toEqual(activeSubscription);
    expect(result.current.payments.map((p) => p.id)).toEqual(['pay-overdue', 'pay-1']);
    await waitFor(() => expect(result.current.plans).toEqual(plans));
  });

  it('has no subscription for a student without plan, but keeps the debt payments', async () => {
    subscriptionsApi.getActiveSubscriptionForStudent.mockResolvedValue(null);
    const { result } = renderHook(() => useStudentSubscription('student-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.subscription).toBeNull();
    expect(result.current.payments).toHaveLength(2);
  });

  it('exposes a load error and keeps a plans failure from hiding the block', async () => {
    subscriptionsApi.listSubscriptionPlans.mockRejectedValue(new Error('x'));
    subscriptionsApi.listStudentPayments.mockRejectedValue({ userMessage: 'Erro ao carregar' });
    const { result } = renderHook(() => useStudentSubscription('student-1'));
    await waitFor(() => expect(result.current.error).toBe('Erro ao carregar'));
    expect(result.current.loading).toBe(false);
    expect(result.current.plans).toEqual([]);
  });

  it('reload() keeps the content on screen (no loading flash)', async () => {
    const { result } = renderHook(() => useStudentSubscription('student-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const next = deferred();
    subscriptionsApi.listStudentPayments.mockReturnValue(next.promise);
    act(() => { result.current.reload(); });
    expect(result.current.loading).toBe(false);
    expect(result.current.payments).toHaveLength(2);

    await act(async () => { next.resolve({ payments: [] }); });
    expect(result.current.payments).toEqual([]);
  });

  describe('when the student changes', () => {
    it('resets the state and ignores a late response for the previous student', async () => {
      const lateA = deferred();
      subscriptionsApi.getActiveSubscriptionForStudent.mockImplementation((studentId) => (
        studentId === 'student-a' ? lateA.promise : Promise.resolve({ id: 'sub-b', planId: 'plan-1' })
      ));
      const { result, rerender } = renderHook(
        ({ studentId }) => useStudentSubscription(studentId),
        { initialProps: { studentId: 'student-a' } },
      );

      rerender({ studentId: 'student-b' });
      await waitFor(() => expect(result.current.subscription).toEqual({ id: 'sub-b', planId: 'plan-1' }));

      await act(async () => { lateA.resolve({ id: 'sub-a', planId: 'plan-1' }); });
      expect(result.current.subscription).toEqual({ id: 'sub-b', planId: 'plan-1' });
    });

    it('clears the previous student while the next one loads', async () => {
      const { result, rerender } = renderHook(
        ({ studentId }) => useStudentSubscription(studentId),
        { initialProps: { studentId: 'student-a' } },
      );
      await waitFor(() => expect(result.current.subscription).toEqual(activeSubscription));

      subscriptionsApi.getActiveSubscriptionForStudent.mockReturnValue(new Promise(() => {}));
      rerender({ studentId: 'student-b' });
      await waitFor(() => expect(result.current.loading).toBe(true));
      expect(result.current.subscription).toBeNull();
      expect(result.current.payments).toEqual([]);
    });

    it('ignores a late load error for the previous student', async () => {
      const lateA = deferred();
      subscriptionsApi.getActiveSubscriptionForStudent.mockImplementation((studentId) => (
        studentId === 'student-a' ? lateA.promise : Promise.resolve(null)
      ));
      const { result, rerender } = renderHook(
        ({ studentId }) => useStudentSubscription(studentId),
        { initialProps: { studentId: 'student-a' } },
      );
      rerender({ studentId: 'student-b' });
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => { lateA.reject({ userMessage: 'Erro do aluno A' }); });
      expect(result.current.error).toBeNull();
      expect(result.current.subscription).toBeNull();
    });
  });
});
