import { describe, it, expect } from 'vitest';
import {
  countChargesByFilter,
  countHistoryByFilter,
  filterChargesByStudent,
  filterHistoryPayments,
  groupChargesByStatus,
  groupPaymentsByYear,
  pickCurrentCharge,
  sortOpenCharges,
} from './financeCharges';
import { makePayment, overduePayment, paidPayment, voidPayment } from '../test/financeFixtures';

describe('financeCharges', () => {
  const rows = [
    makePayment({ id: 'p2', dueDate: '2026-10-20' }),
    makePayment({ id: 'p1', dueDate: '2026-10-05' }),
    overduePayment({ id: 'o1', daysOverdue: 4, student: { name: 'Bia' } }),
    overduePayment({ id: 'o2', daysOverdue: 9, student: { name: 'Zé' } }),
    paidPayment({ id: 'x1', paidAt: '2026-10-01T10:00:00Z' }),
    paidPayment({ id: 'x2', paidAt: '2026-10-03T10:00:00Z' }),
  ];

  it('groups and sorts each section with its fixed order', () => {
    const groups = groupChargesByStatus(rows);
    expect(groups.overdue.map((p) => p.id)).toEqual(['o2', 'o1']);
    expect(groups.pending.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(groups.paid.map((p) => p.id)).toEqual(['x2', 'x1']);
    expect(countChargesByFilter(groups)).toEqual({ all: 6, overdue: 2, pending: 2, paid: 2 });
  });

  it('searches by student name without accents', () => {
    expect(filterChargesByStudent(rows, 'ze').map((p) => p.id)).toEqual(['o2']);
    expect(filterChargesByStudent(rows, '  ')).toHaveLength(6);
  });

  it('filters and counts history, grouping by year newest first', () => {
    const history = [overduePayment(), voidPayment(), paidPayment({ cycleStartDate: '2025-05-01' })];
    expect(countHistoryByFilter(history)).toEqual({ all: 3, open: 1, paid: 1, void: 1 });
    expect(filterHistoryPayments(history, 'void')).toHaveLength(1);
    expect(groupPaymentsByYear(history).map(([year]) => year)).toEqual(['2026', '2025']);
  });
});

describe('sortOpenCharges / pickCurrentCharge', () => {
  const overdueOld = { id: 'o1', subscriptionId: 's1', effectiveStatus: 'overdue', daysOverdue: 9, dueDate: '2026-09-01', cycleStartDate: '2026-09-01' };
  const overdueNew = { id: 'o2', subscriptionId: 's1', effectiveStatus: 'overdue', daysOverdue: 4, dueDate: '2026-10-01', cycleStartDate: '2026-10-01' };
  const pending = { id: 'p1', subscriptionId: 's1', effectiveStatus: 'pending', daysOverdue: 0, dueDate: '2026-10-10', cycleStartDate: '2026-10-10' };
  const paid = { id: 'x1', subscriptionId: 's1', effectiveStatus: 'paid', dueDate: '2026-08-01', cycleStartDate: '2026-08-01' };
  const otherSub = { id: 'z1', subscriptionId: 's2', effectiveStatus: 'overdue', daysOverdue: 30, dueDate: '2026-07-01', cycleStartDate: '2026-07-01' };

  it('orders overdue (most days first) before pending and drops closed charges', () => {
    expect(sortOpenCharges([pending, paid, overdueNew, overdueOld]).map((p) => p.id)).toEqual(['o1', 'o2', 'p1']);
  });

  it('picks the most urgent open charge of the given subscription only', () => {
    expect(pickCurrentCharge([otherSub, pending, overdueNew], 's1').id).toBe('o2');
  });

  it('falls back to the most recent cycle when nothing is open, and to null without a subscription', () => {
    expect(pickCurrentCharge([paid, { ...paid, id: 'x2', cycleStartDate: '2026-09-01' }], 's1').id).toBe('x2');
    expect(pickCurrentCharge([paid], null)).toBeNull();
  });
});
