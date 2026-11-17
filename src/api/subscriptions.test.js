import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from './axios';
import {
  archiveSubscriptionPlan,
  assignPlanToStudent,
  cancelSubscription,
  createSubscriptionPlan,
  getActiveSubscriptionForStudent,
  getFinanceOverview,
  listStudentPayments,
  listSubscriptionPlans,
  markPaymentAsPaid,
  markPaymentAsPending,
  unarchiveSubscriptionPlan,
  updatePayment,
  updateSubscriptionPlan,
  voidPayment,
} from './subscriptions';

vi.mock('./axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe('api/subscriptions (any professional: /professional/*)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: 'get-data' });
    api.post.mockResolvedValue({ data: 'post-data' });
    api.patch.mockResolvedValue({ data: 'patch-data' });
  });

  it('lists, creates, updates, archives and unarchives plans on /professional/subscription-plans', async () => {
    expect(await listSubscriptionPlans({ includeArchived: true })).toBe('get-data');
    expect(api.get).toHaveBeenCalledWith('/professional/subscription-plans', { params: { includeArchived: true } });

    await createSubscriptionPlan({ name: 'Plano', serviceType: 'nutrition' });
    expect(api.post).toHaveBeenCalledWith('/professional/subscription-plans', { name: 'Plano', serviceType: 'nutrition' });

    await updateSubscriptionPlan('plan-1', { name: 'Novo' });
    expect(api.patch).toHaveBeenCalledWith('/professional/subscription-plans/plan-1', { name: 'Novo' });

    await archiveSubscriptionPlan('plan-1');
    expect(api.post).toHaveBeenCalledWith('/professional/subscription-plans/plan-1/archive');

    await unarchiveSubscriptionPlan('plan-1');
    expect(api.post).toHaveBeenCalledWith('/professional/subscription-plans/plan-1/unarchive');
  });

  it('reads, assigns and cancels subscriptions on /professional/*', async () => {
    await getActiveSubscriptionForStudent('student-1');
    expect(api.get).toHaveBeenCalledWith('/professional/students/student-1/subscriptions/active');

    await assignPlanToStudent('student-1', { planId: 'plan-1', startDate: '2026-10-06' });
    expect(api.post).toHaveBeenCalledWith('/professional/students/student-1/subscriptions', { planId: 'plan-1', startDate: '2026-10-06' });

    await cancelSubscription('sub-1');
    expect(api.post).toHaveBeenCalledWith('/professional/subscriptions/sub-1/cancel', {});

    await cancelSubscription('sub-1', { reason: 'other' });
    expect(api.post).toHaveBeenLastCalledWith('/professional/subscriptions/sub-1/cancel', { reason: 'other' });
  });

  it('loads the overview and the person history on /professional/*', async () => {
    const signal = new AbortController().signal;
    await getFinanceOverview('2026-10', { signal });
    expect(api.get).toHaveBeenCalledWith('/professional/finance/overview', { params: { month: '2026-10' }, signal });

    await listStudentPayments('student-1');
    expect(api.get).toHaveBeenCalledWith('/professional/students/student-1/payments');
  });

  it('runs every payment action on /professional/payments/:id', async () => {
    await markPaymentAsPaid('pay-1');
    expect(api.post).toHaveBeenCalledWith('/professional/payments/pay-1/mark-paid', {});

    await markPaymentAsPaid('pay-1', { paidAt: '2026-10-03' });
    expect(api.post).toHaveBeenLastCalledWith('/professional/payments/pay-1/mark-paid', { paidAt: '2026-10-03' });

    await markPaymentAsPending('pay-1');
    expect(api.post).toHaveBeenCalledWith('/professional/payments/pay-1/mark-pending');

    await voidPayment('pay-1');
    expect(api.post).toHaveBeenCalledWith('/professional/payments/pay-1/void');

    await updatePayment('pay-1', { notes: 'ok' });
    expect(api.patch).toHaveBeenCalledWith('/professional/payments/pay-1', { notes: 'ok' });
  });

  it('never calls a /trainer/* billing route', async () => {
    await listSubscriptionPlans();
    await getFinanceOverview('2026-10');
    await markPaymentAsPaid('pay-1');
    const urls = [...api.get.mock.calls, ...api.post.mock.calls].map(([url]) => url);
    expect(urls.every((url) => url.startsWith('/professional/'))).toBe(true);
  });
});
