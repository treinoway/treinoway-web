import { describe, it, expect } from 'vitest';
import {
  applyFeedbackRead,
  bandToneOf,
  buildOverallCells,
  buildPillarRows,
  deltaToneOf,
  formatDelta,
  formatRate,
  formatScore,
  isAnsweredFeedback,
  isUnreadFeedback,
  milestoneLabelOf,
} from './studentFeedback';

const READ_AT = '2026-11-13T15:00:00.000Z';

// Pillar score with the fields of the trainer API
const pillar = (name, pillarLabel, score) => ({ pillar: name, pillarLabel, score });

// Answered feedback of the history holding the given pillars and overall index
const answeredWith = (pillars, overallIndex = 50) => ({ status: 'answered', overallIndex, pillars });

// Inbox item with the fields the read logic looks at; overrides replace any of them
const buildItem = (overrides = {}) => ({ id: 'fb-1', status: 'answered', readAt: null, overallIndex: 42, ...overrides });

// Inbox payload with the given items and unread count
const buildInbox = (items, unreadCount) => ({
  summary: { responseRate30d: 82, averageIndex: 64, unansweredCount: 1, unreadCount },
  items,
});

describe('isAnsweredFeedback', () => {
  it('is true only for the answered status', () => {
    expect(isAnsweredFeedback({ status: 'answered' })).toBe(true);
    expect(isAnsweredFeedback({ status: 'pending' })).toBe(false);
    expect(isAnsweredFeedback({ status: 'expired' })).toBe(false);
  });
});

describe('isUnreadFeedback', () => {
  it('is true for an answered feedback without a read date', () => {
    expect(isUnreadFeedback({ status: 'answered', readAt: null })).toBe(true);
    expect(isUnreadFeedback({ status: 'answered' })).toBe(true);
  });

  it('is false once the feedback has a read date', () => {
    expect(isUnreadFeedback({ status: 'answered', readAt: READ_AT })).toBe(false);
  });

  it('is false for a feedback that was not answered, even without a read date', () => {
    expect(isUnreadFeedback({ status: 'pending', readAt: null })).toBe(false);
    expect(isUnreadFeedback({ status: 'expired', readAt: null })).toBe(false);
  });
});

describe('milestoneLabelOf', () => {
  it('names a known milestone with the web label, whatever label the service sent', () => {
    expect(milestoneLabelOf({ milestone: 'D7', milestoneLabel: 'D7' })).toBe('7 dias');
    expect(milestoneLabelOf({ milestone: 'D15', milestoneLabel: 'D15' })).toBe('15 dias');
    expect(milestoneLabelOf({ milestone: 'D21', milestoneLabel: 'D21' })).toBe('21 dias');
    expect(milestoneLabelOf({ milestone: 'D30', milestoneLabel: 'D30' })).toBe('30 dias');
    expect(milestoneLabelOf({ milestone: 'RECURRING', milestoneLabel: 'Recorrente' })).toBe('A cada 30 dias');
    expect(milestoneLabelOf({ milestone: 'ADHOC', milestoneLabel: 'Avulso' })).toBe('Envio manual');
  });

  it('names a known milestone with the web label when the service sent no label', () => {
    expect(milestoneLabelOf({ milestone: 'ADHOC' })).toBe('Envio manual');
    expect(milestoneLabelOf({ milestone: 'D7', milestoneLabel: null })).toBe('7 dias');
  });

  it('falls back to the label of the service for a milestone the app does not know', () => {
    expect(milestoneLabelOf({ milestone: 'D60', milestoneLabel: '60 dias' })).toBe('60 dias');
    expect(milestoneLabelOf({ milestone: 'D90', milestoneLabel: 'D90' })).toBe('D90');
  });
});

describe('bandToneOf', () => {
  it('maps attention to error, stable to warning and good to success', () => {
    expect(bandToneOf('attention')).toBe('error');
    expect(bandToneOf('stable')).toBe('warning');
    expect(bandToneOf('good')).toBe('success');
  });

  it('falls back to neutral for a band the app does not know or a missing one', () => {
    expect(bandToneOf('excellent')).toBe('neutral');
    expect(bandToneOf(null)).toBe('neutral');
    expect(bandToneOf(undefined)).toBe('neutral');
  });
});

describe('formatScore', () => {
  it('shows a number as text, zero included', () => {
    expect(formatScore(77)).toBe('77');
    expect(formatScore(0)).toBe('0');
  });

  it('shows a dash when the value is not a number', () => {
    expect(formatScore(null)).toBe('-');
    expect(formatScore(undefined)).toBe('-');
    expect(formatScore('77')).toBe('-');
  });
});

describe('formatRate', () => {
  it('shows a number as a percentage, zero included', () => {
    expect(formatRate(82)).toBe('82%');
    expect(formatRate(0)).toBe('0%');
  });

  it('shows a dash when the value is not a number', () => {
    expect(formatRate(null)).toBe('-');
    expect(formatRate(undefined)).toBe('-');
  });
});

describe('formatDelta', () => {
  it('prefixes a gain with a plus sign', () => {
    expect(formatDelta(20)).toBe('+20');
  });

  it('prefixes a loss with the typographic minus sign', () => {
    expect(formatDelta(-10)).toBe('−10');
  });

  it('shows an unchanged score as a bare zero', () => {
    expect(formatDelta(0)).toBe('0');
  });
});

describe('deltaToneOf', () => {
  it('is success for a gain, error for a loss and neutral when unchanged', () => {
    expect(deltaToneOf(5)).toBe('success');
    expect(deltaToneOf(-5)).toBe('error');
    expect(deltaToneOf(0)).toBe('neutral');
  });
});

describe('buildPillarRows', () => {
  it('returns no row when nothing was answered', () => {
    expect(buildPillarRows([])).toEqual([]);
  });

  it('orders the pillars by the fixed display order, whatever order the service sends', () => {
    const rows = buildPillarRows([
      answeredWith([
        pillar('other', 'Outro', 10),
        pillar('report', 'Relato', 20),
        pillar('hydration', 'Hidratação', 30),
        pillar('sleep', 'Sono', 40),
        pillar('routine', 'Rotina', 50),
        pillar('evolution', 'Evolução', 60),
        pillar('diet_adherence', 'Adesão (plano alimentar)', 70),
        pillar('training_adherence', 'Adesão (treino)', 80),
      ]),
    ]);

    expect(rows.map((row) => row.pillar)).toEqual([
      'training_adherence',
      'diet_adherence',
      'evolution',
      'routine',
      'sleep',
      'hydration',
      'report',
      'other',
    ]);
  });

  it('puts pillars the app does not know after the known ones, in the order they first appear', () => {
    const rows = buildPillarRows([
      answeredWith([pillar('mood', 'Humor', 90), pillar('other', 'Outro', 10), pillar('stress', 'Estresse', 30), pillar('sleep', 'Sono', 40)]),
    ]);

    expect(rows.map((row) => row.pillar)).toEqual(['sleep', 'other', 'mood', 'stress']);
    expect(rows.map((row) => row.label)).toEqual(['Sono', 'Outro', 'Humor', 'Estresse']);
  });

  it('lists a pillar once even when several feedbacks scored it, with the label of the first one', () => {
    const rows = buildPillarRows([
      answeredWith([pillar('sleep', 'Sono', 50)]),
      answeredWith([pillar('sleep', 'Sono (novo nome)', 40)]),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].label).toBe('Sono');
  });

  it('gives one cell per answered feedback with the variation against the one right before it', () => {
    const rows = buildPillarRows([
      answeredWith([pillar('sleep', 'Sono', 50)]),
      answeredWith([pillar('sleep', 'Sono', 40)]),
      answeredWith([pillar('sleep', 'Sono', 65)]),
    ]);

    expect(rows[0].cells).toEqual([
      { score: 50, delta: null },
      { score: 40, delta: -10 },
      { score: 65, delta: 25 },
    ]);
  });

  it('gives a variation of zero, not a missing one, when the score did not change', () => {
    const rows = buildPillarRows([
      answeredWith([pillar('sleep', 'Sono', 50)]),
      answeredWith([pillar('sleep', 'Sono', 50)]),
    ]);

    expect(rows[0].cells[1]).toEqual({ score: 50, delta: 0 });
  });

  it('treats a score of zero as a value: it shows and it is compared', () => {
    const rows = buildPillarRows([
      answeredWith([pillar('sleep', 'Sono', 0)]),
      answeredWith([pillar('sleep', 'Sono', 30)]),
      answeredWith([pillar('sleep', 'Sono', 0)]),
    ]);

    expect(rows[0].cells).toEqual([
      { score: 0, delta: null },
      { score: 30, delta: 30 },
      { score: 0, delta: -30 },
    ]);
  });

  it('leaves the score and both neighbouring variations empty where a feedback did not score the pillar', () => {
    const rows = buildPillarRows([
      answeredWith([pillar('sleep', 'Sono', 50), pillar('diet_adherence', 'Adesão (plano alimentar)', 60)]),
      answeredWith([pillar('sleep', 'Sono', 40)]),
      answeredWith([pillar('sleep', 'Sono', 45), pillar('diet_adherence', 'Adesão (plano alimentar)', 70)]),
    ]);

    const diet = rows.find((row) => row.pillar === 'diet_adherence');
    expect(diet.cells).toEqual([
      { score: 60, delta: null },
      { score: null, delta: null },
      { score: 70, delta: null },
    ]);
  });

  it('treats a pillar sent with a null score as not scored', () => {
    const rows = buildPillarRows([
      answeredWith([pillar('sleep', 'Sono', null)]),
      answeredWith([pillar('sleep', 'Sono', 40)]),
    ]);

    expect(rows[0].cells).toEqual([
      { score: null, delta: null },
      { score: 40, delta: null },
    ]);
  });
});

describe('buildOverallCells', () => {
  it('returns no cell when nothing was answered', () => {
    expect(buildOverallCells([])).toEqual([]);
  });

  it('gives the overall index of each feedback with the variation against the previous one', () => {
    expect(buildOverallCells([answeredWith([], 55), answeredWith([], 77), answeredWith([], 30)])).toEqual([
      { score: 55, delta: null },
      { score: 77, delta: 22 },
      { score: 30, delta: -47 },
    ]);
  });

  it('gives a variation of zero when the index repeats', () => {
    expect(buildOverallCells([answeredWith([], 55), answeredWith([], 55)])[1]).toEqual({ score: 55, delta: 0 });
  });

  it('leaves the score and the variations around it empty where the index is missing', () => {
    expect(buildOverallCells([answeredWith([], 55), answeredWith([], null), answeredWith([], 77)])).toEqual([
      { score: 55, delta: null },
      { score: null, delta: null },
      { score: 77, delta: null },
    ]);
  });
});

describe('applyFeedbackRead', () => {
  it('flags the feedback as read and takes one off the unread count under the "all" filter', () => {
    const other = buildItem({ id: 'fb-2' });
    const inbox = buildInbox([buildItem(), other], 2);

    const next = applyFeedbackRead(inbox, 'fb-1', READ_AT, 'all');

    expect(next.items).toHaveLength(2);
    expect(next.items[0]).toEqual({ ...buildItem(), readAt: READ_AT });
    expect(next.items[1]).toBe(other);
    expect(next.summary).toEqual({ responseRate30d: 82, averageIndex: 64, unansweredCount: 1, unreadCount: 1 });
  });

  it('drops the feedback from the list under the "unread" filter and still takes one off the count', () => {
    const other = buildItem({ id: 'fb-2' });
    const inbox = buildInbox([buildItem(), other], 2);

    const next = applyFeedbackRead(inbox, 'fb-1', READ_AT, 'unread');

    expect(next.items).toEqual([other]);
    expect(next.summary.unreadCount).toBe(1);
  });

  it('keeps the row in the list under the "unanswered" filter', () => {
    const inbox = buildInbox([buildItem()], 1);

    const next = applyFeedbackRead(inbox, 'fb-1', READ_AT, 'unanswered');

    expect(next.items).toEqual([{ ...buildItem(), readAt: READ_AT }]);
  });

  it('does not change the payload it was given', () => {
    const item = buildItem();
    const inbox = buildInbox([item], 1);

    applyFeedbackRead(inbox, 'fb-1', READ_AT, 'all');

    expect(item.readAt).toBeNull();
    expect(inbox.items).toEqual([item]);
    expect(inbox.summary.unreadCount).toBe(1);
  });

  it('never takes the unread count below zero', () => {
    const next = applyFeedbackRead(buildInbox([buildItem()], 0), 'fb-1', READ_AT, 'all');

    expect(next.summary.unreadCount).toBe(0);
  });

  it('counts a summary without an unread count as zero', () => {
    const inbox = { summary: {}, items: [buildItem()] };

    expect(applyFeedbackRead(inbox, 'fb-1', READ_AT, 'all').summary.unreadCount).toBe(0);
  });

  it('returns the same payload when the feedback is not in the list', () => {
    const inbox = buildInbox([buildItem()], 1);

    expect(applyFeedbackRead(inbox, 'fb-9', READ_AT, 'all')).toBe(inbox);
  });

  it('returns the same payload when the service stamped no read date', () => {
    const inbox = buildInbox([buildItem()], 1);

    expect(applyFeedbackRead(inbox, 'fb-1', null, 'all')).toBe(inbox);
    expect(applyFeedbackRead(inbox, 'fb-1', undefined, 'unread')).toBe(inbox);
  });

  it('returns the same payload when the feedback was already read, so the count is not taken twice', () => {
    const inbox = buildInbox([buildItem({ readAt: '2026-11-10T10:00:00.000Z' })], 1);

    expect(applyFeedbackRead(inbox, 'fb-1', READ_AT, 'all')).toBe(inbox);
  });

  it('returns the same payload when the feedback was not answered', () => {
    const inbox = buildInbox([buildItem({ status: 'expired' })], 1);

    expect(applyFeedbackRead(inbox, 'fb-1', READ_AT, 'unread')).toBe(inbox);
  });

  it('returns the payload untouched when there is none yet', () => {
    expect(applyFeedbackRead(null, 'fb-1', READ_AT, 'all')).toBeNull();
  });
});
