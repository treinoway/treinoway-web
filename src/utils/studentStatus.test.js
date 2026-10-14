import {
  BillingStatus,
  StudentStatus,
  STUDENT_STATUSES,
  countStudentsByStatus,
  getStudentStatus,
} from './studentStatus';

describe('getStudentStatus', () => {
  it.each([
    [BillingStatus.OVERDUE, 'vencido'],
    [BillingStatus.DUE_SOON, 'pendente'],
    [BillingStatus.OK, 'ativo'],
    [BillingStatus.NONE, 'ativo'],
  ])('maps billingStatus %s to %s', (billingStatus, expected) => {
    expect(getStudentStatus({ billingStatus })).toBe(expected);
  });

  it('falls back to ativo when billingStatus is missing (old cached payloads)', () => {
    expect(getStudentStatus({ id: 's1' })).toBe(StudentStatus.ACTIVE);
  });

  it('falls back to ativo for unknown values and nullish students', () => {
    expect(getStudentStatus({ billingStatus: 'bogus' })).toBe('ativo');
    expect(getStudentStatus(null)).toBe('ativo');
    expect(getStudentStatus(undefined)).toBe('ativo');
  });

  it('ignores the legacy (never-returned) status field', () => {
    expect(getStudentStatus({ status: 'vencido' })).toBe('ativo');
  });
});

describe('countStudentsByStatus', () => {
  it('returns zeros for an empty roster', () => {
    expect(countStudentsByStatus([])).toEqual({ ativo: 0, pendente: 0, vencido: 0 });
  });

  it('buckets students by their mapped billing status', () => {
    const students = [
      { billingStatus: 'overdue' },
      { billingStatus: 'overdue' },
      { billingStatus: 'due_soon' },
      { billingStatus: 'ok' },
      { billingStatus: 'none' },
      {},
    ];
    expect(countStudentsByStatus(students)).toEqual({ ativo: 3, pendente: 1, vencido: 2 });
  });
});

describe('STUDENT_STATUSES', () => {
  it('keeps the URL values used by ControlTower deep-links', () => {
    expect(STUDENT_STATUSES).toEqual(['ativo', 'pendente', 'vencido']);
  });
});
