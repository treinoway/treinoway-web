import { vi } from 'vitest';

/** 2026-10-06 12:00 in São Paulo. */
export const FINANCE_NOW = new Date('2026-10-06T15:00:00Z');

/** Pin only `Date` so userEvent/setTimeout keep working. */
export const pinFinanceClock = () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(FINANCE_NOW);
};

export const makePayment = (overrides = {}) => ({
  id: 'pay-1',
  subscriptionId: 'sub-1',
  cycleIndex: 0,
  cycleStartDate: '2026-10-01',
  cycleEndDate: '2026-10-31',
  dueDate: '2026-10-01',
  amount: '99.90',
  status: 'pending',
  effectiveStatus: 'pending',
  daysOverdue: 0,
  paidAt: null,
  voidedAt: null,
  notes: null,
  subscriptionStatus: 'active',
  student: { id: 'student-1', name: 'Maria Silva', avatarUrl: null },
  plan: { id: 'plan-1', name: 'Consultoria Mensal', recurrence: 'monthly' },
  ...overrides,
});

export const overduePayment = (overrides = {}) => makePayment({
  id: 'pay-overdue',
  status: 'pending',
  effectiveStatus: 'overdue',
  daysOverdue: 5,
  ...overrides,
});

export const paidPayment = (overrides = {}) => makePayment({
  id: 'pay-paid',
  status: 'paid',
  effectiveStatus: 'paid',
  paidAt: '2026-10-03T13:00:00.000Z',
  student: { id: 'student-3', name: 'Ana Costa', avatarUrl: null },
  ...overrides,
});

export const voidPayment = (overrides = {}) => makePayment({
  id: 'pay-void',
  status: 'cancelled',
  effectiveStatus: 'cancelled',
  voidedAt: '2026-09-20T13:00:00.000Z',
  ...overrides,
});

export const makePlan = (overrides = {}) => ({
  id: 'plan-1',
  name: 'Consultoria Mensal',
  recurrence: 'monthly',
  recurrenceLabel: 'Mensal',
  price: '99.90',
  discountPercent: null,
  discountAmount: null,
  isArchived: false,
  activeSubscriptionCount: 4,
  ...overrides,
});

export const makeKpis = (overrides = {}) => ({
  receivedAmount: '1200.00',
  receivedCount: 12,
  pendingAmount: '300.00',
  pendingCount: 3,
  overdueAmount: '199.80',
  overdueCount: 2,
  overdueStudents: 2,
  billedStudents: 15,
  delinquencyRate: 13.33,
  ...overrides,
});

/** Axios-like error with the backend error contract. */
export const apiError = (status, error, messageCode, message = 'API message') => {
  const err = new Error(message);
  err.response = { status, data: { error, messageCode, message } };
  err.userMessage = message;
  return err;
};
