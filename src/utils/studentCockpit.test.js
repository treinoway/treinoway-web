import {
  daysUntil,
  formatMonthName,
  formatAdherenceDelta,
  formatExpiryHint,
  getRenewalInfo,
  sortProtocolsForDisplay,
  findLatestNoteSession,
} from './studentCockpit';

const TODAY = '2026-10-04';

describe('daysUntil', () => {
  it('counts whole days between date-only strings', () => {
    expect(daysUntil('2026-10-13', TODAY)).toBe(9);
    expect(daysUntil('2026-10-04', TODAY)).toBe(0);
    expect(daysUntil('2026-10-01', TODAY)).toBe(-3);
  });

  it('crosses month and year boundaries', () => {
    expect(daysUntil('2027-01-01', '2026-12-31')).toBe(1);
  });

  it('returns null for missing or invalid dates', () => {
    expect(daysUntil(null, TODAY)).toBeNull();
    expect(daysUntil('ontem', TODAY)).toBeNull();
  });
});

describe('formatMonthName', () => {
  it('returns the pt-BR month of a month-start string', () => {
    expect(formatMonthName('2026-06-01')).toBe('junho');
  });

  it('returns null for invalid input', () => {
    expect(formatMonthName(undefined)).toBeNull();
    expect(formatMonthName('2026-13-01')).toBeNull();
  });
});

describe('formatAdherenceDelta', () => {
  it('formats a drop vs the previous month', () => {
    expect(formatAdherenceDelta(38, 85, '2026-06-01')).toBe('↓ 47 pts vs junho');
  });

  it('formats a gain and no change', () => {
    expect(formatAdherenceDelta(90, 80.4, '2026-06-01')).toBe('↑ 10 pts vs junho');
    expect(formatAdherenceDelta(80, 80, '2026-06-01')).toBe('Sem mudança vs junho');
  });

  it('returns null without both values or a valid month', () => {
    expect(formatAdherenceDelta(38, null, '2026-06-01')).toBeNull();
    expect(formatAdherenceDelta(null, 38, '2026-06-01')).toBeNull();
    expect(formatAdherenceDelta(38, 40, null)).toBeNull();
  });
});

describe('formatExpiryHint', () => {
  it('describes future, today and past expirations', () => {
    expect(formatExpiryHint('2026-10-13', TODAY)).toBe('vence em 9 dias');
    expect(formatExpiryHint('2026-10-05', TODAY)).toBe('vence em 1 dia');
    expect(formatExpiryHint('2026-10-04', TODAY)).toBe('vence hoje');
    expect(formatExpiryHint('2026-10-01', TODAY)).toBe('venceu há 3 dias');
  });

  it('returns null without an expiration date', () => {
    expect(formatExpiryHint(null, TODAY)).toBeNull();
  });
});

describe('getRenewalInfo', () => {
  it('uses the due date of an open charge as the renewal date', () => {
    expect(getRenewalInfo({ effectiveStatus: 'pending', cycleEndDate: '2026-11-15', dueDate: '2026-10-20' }, TODAY)).toEqual({
      label: 'Renova em', value: '16 dias', date: '20/10/2026', overdue: false,
    });
  });

  it('falls back to the due date', () => {
    expect(getRenewalInfo({ dueDate: '2026-10-04' }, TODAY)).toEqual({
      label: 'Renova', value: 'Hoje', date: '04/10/2026', overdue: false,
    });
  });

  it('flags overdue only when the API says so, with the API days overdue', () => {
    expect(getRenewalInfo({ effectiveStatus: 'overdue', daysOverdue: 4, dueDate: '2026-09-30', cycleEndDate: '2026-10-29' }, TODAY)).toEqual({
      label: 'Venceu há', value: '4 dias', date: '30/09/2026', overdue: true,
    });
  });

  it('never derives overdue from a past cycle end (grace window stays pending)', () => {
    expect(getRenewalInfo({ effectiveStatus: 'pending', cycleEndDate: '2026-10-03', dueDate: '2026-10-02' }, TODAY)).toEqual({
      label: 'Renova', value: 'Hoje', date: '02/10/2026', overdue: false,
    });
  });

  it('returns null without a payment or dates', () => {
    expect(getRenewalInfo(null, TODAY)).toBeNull();
    expect(getRenewalInfo({}, TODAY)).toBeNull();
  });
});

describe('sortProtocolsForDisplay', () => {
  it('puts active routines first, then the most recent', () => {
    const protocols = [
      { id: 'old', status: 'completed', startDate: '2025-01-01' },
      { id: 'active', status: 'active', startDate: '2024-01-01' },
      { id: 'recent', status: 'archived', startDate: '2026-01-01' },
    ];
    expect(sortProtocolsForDisplay(protocols).map((p) => p.id)).toEqual(['active', 'recent', 'old']);
  });

  it('does not mutate the input', () => {
    const protocols = [{ id: 'a', status: 'completed', startDate: '2025-01-01' }, { id: 'b', status: 'active', startDate: '2024-01-01' }];
    sortProtocolsForDisplay(protocols);
    expect(protocols[0].id).toBe('a');
  });
});

describe('findLatestNoteSession', () => {
  it('returns the newest session with a note', () => {
    const sessions = [{ id: '1', noteText: null }, { id: '2', noteText: 'Cansado' }, { id: '3', noteText: 'Antiga' }];
    expect(findLatestNoteSession(sessions)).toEqual({ id: '2', noteText: 'Cansado' });
  });

  it('returns null when no session has a note', () => {
    expect(findLatestNoteSession([{ id: '1', noteText: null }])).toBeNull();
    expect(findLatestNoteSession(undefined)).toBeNull();
  });
});
