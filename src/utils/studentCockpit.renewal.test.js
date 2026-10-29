import { describe, it, expect } from 'vitest';
import { getRenewalInfo } from './studentCockpit';

const TODAY = '2026-10-29';

describe('getRenewalInfo with due date at cycle start', () => {
  it('uses the due date of an open charge (screenshot case)', () => {
    const charge = { effectiveStatus: 'pending', cycleStartDate: '2026-11-01', cycleEndDate: '2026-11-30', dueDate: '2026-11-01' };
    expect(getRenewalInfo(charge, TODAY)).toEqual({
      label: 'Renova em', value: '3 dias', date: '01/11/2026', overdue: false,
    });
  });

  it('falls back to the cycle start when an open charge has no due date', () => {
    const charge = { effectiveStatus: 'pending', cycleStartDate: '2026-11-01', cycleEndDate: '2026-11-30' };
    expect(getRenewalInfo(charge, TODAY)?.date).toBe('01/11/2026');
  });

  it('uses the day after the cycle end when the latest charge is paid', () => {
    const charge = { effectiveStatus: 'paid', cycleStartDate: '2026-10-01', cycleEndDate: '2026-10-31', dueDate: '2026-10-01' };
    expect(getRenewalInfo(charge, TODAY)).toEqual({
      label: 'Renova em', value: '3 dias', date: '01/11/2026', overdue: false,
    });
  });

  it('rolls the next cycle start over month and year boundaries', () => {
    const charge = { effectiveStatus: 'paid', cycleEndDate: '2026-12-31' };
    expect(getRenewalInfo(charge, '2026-12-30')?.date).toBe('01/01/2027');
  });

  it('shows "Renova hoje" when the charge is due today', () => {
    const charge = { effectiveStatus: 'pending', cycleStartDate: '2026-10-29', cycleEndDate: '2026-11-28', dueDate: '2026-10-29' };
    expect(getRenewalInfo(charge, TODAY)).toEqual({
      label: 'Renova', value: 'Hoje', date: '29/10/2026', overdue: false,
    });
  });

  it('keeps overdue driven by the API', () => {
    const charge = { effectiveStatus: 'overdue', daysOverdue: 5, dueDate: '2026-10-24', cycleEndDate: '2026-11-23' };
    expect(getRenewalInfo(charge, TODAY)).toEqual({
      label: 'Venceu há', value: '5 dias', date: '24/10/2026', overdue: true,
    });
  });

  it('returns null for a cancelled charge with nothing open', () => {
    const charge = { effectiveStatus: 'cancelled', cycleEndDate: '2026-10-31', dueDate: '2026-10-01' };
    expect(getRenewalInfo(charge, TODAY)).toBeNull();
  });

  it('returns null for a paid charge without a cycle end', () => {
    expect(getRenewalInfo({ effectiveStatus: 'paid', dueDate: '2026-10-01' }, TODAY)).toBeNull();
  });
});
