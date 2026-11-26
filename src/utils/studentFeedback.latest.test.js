import { describe, it, expect } from 'vitest';
import {
  buildLatestPillars,
  firstNameOf,
  formatAnswerValue,
  hasAnswerValue,
  hasScore,
  latestAnsweredPair,
  meterToneOf,
  overallDeltaOf,
  overallDeltasById,
  scoreOutOf100,
  studentCallNameOf,
} from './studentFeedback';

// Pillar score with the fields of the trainer API
const pillar = (name, pillarLabel, score, extra = {}) => ({ pillar: name, pillarLabel, score, ...extra });

// Feedback of the history in the given status; overrides replace any field
const feedback = (id, status, overrides = {}) => ({ id, status, overallIndex: null, pillars: [], ...overrides });

// Answered feedback of the history with the given overall index and pillars
const answered = (id, overallIndex, pillars = []) => feedback(id, 'answered', { overallIndex, pillars });

describe('meterToneOf', () => {
  it('maps each band to the tone of the meter', () => {
    expect(meterToneOf('attention')).toBe('danger');
    expect(meterToneOf('stable')).toBe('warning');
    expect(meterToneOf('good')).toBe('success');
  });

  it('is neutral without a band or for a band the app does not know', () => {
    expect(meterToneOf(null)).toBe('neutral');
    expect(meterToneOf(undefined)).toBe('neutral');
    expect(meterToneOf('excellent')).toBe('neutral');
  });
});

describe('scoreOutOf100', () => {
  it('writes the score with its scale', () => {
    expect(scoreOutOf100(58)).toBe('58 de 100');
    expect(scoreOutOf100(100)).toBe('100 de 100');
  });

  it('keeps a score of zero as a value', () => {
    expect(scoreOutOf100(0)).toBe('0 de 100');
  });

  it('is null, never "null de 100" or a dash with a scale, when the service has no score', () => {
    expect(scoreOutOf100(null)).toBeNull();
    expect(scoreOutOf100(undefined)).toBeNull();
  });

  it('is null for a score that is not a number', () => {
    expect(scoreOutOf100('58')).toBeNull();
    expect(scoreOutOf100('')).toBeNull();
  });
});

describe('hasScore', () => {
  it('is true for a number, zero included', () => {
    expect(hasScore(58)).toBe(true);
    expect(hasScore(0)).toBe(true);
    expect(hasScore(100)).toBe(true);
  });

  it('is false when the service sent no score', () => {
    expect(hasScore(null)).toBe(false);
    expect(hasScore(undefined)).toBe(false);
    expect(hasScore('58')).toBe(false);
  });
});

describe('hasAnswerValue', () => {
  it('is true for a number or a numeric string, zero included', () => {
    expect(hasAnswerValue({ value: 2 })).toBe(true);
    expect(hasAnswerValue({ value: 0 })).toBe(true);
    expect(hasAnswerValue({ value: '5.5' })).toBe(true);
    expect(hasAnswerValue({ value: '0' })).toBe(true);
  });

  it('is false without a value or with one that is not a number', () => {
    expect(hasAnswerValue({ value: null })).toBe(false);
    expect(hasAnswerValue({ value: undefined })).toBe(false);
    expect(hasAnswerValue({})).toBe(false);
    expect(hasAnswerValue({ value: '' })).toBe(false);
    expect(hasAnswerValue({ value: 'abc' })).toBe(false);
    expect(hasAnswerValue({ value: NaN })).toBe(false);
  });
});

describe('formatAnswerValue', () => {
  it('writes the raw answer with the top of its scale', () => {
    expect(formatAnswerValue({ value: 2, max: 5 })).toBe('2 de 5');
    expect(formatAnswerValue({ value: 8, max: 10 })).toBe('8 de 10');
  });

  it('writes a decimal answer with a comma', () => {
    expect(formatAnswerValue({ value: 5.5, max: 10 })).toBe('5,5 de 10');
    expect(formatAnswerValue({ value: 2.5, max: 5 })).toBe('2,5 de 5');
  });

  it('keeps the bounds of the scale as values', () => {
    expect(formatAnswerValue({ value: 0, max: 10 })).toBe('0 de 10');
    expect(formatAnswerValue({ value: 10, max: 10 })).toBe('10 de 10');
  });

  it('reads a numeric string the same way as the number', () => {
    expect(formatAnswerValue({ value: '5.5', max: 10 })).toBe('5,5 de 10');
  });

  it('is a dash, never "0 de 5" or "NaN de 5", when the student gave no value', () => {
    expect(formatAnswerValue({ value: null, max: 5 })).toBe('-');
    expect(formatAnswerValue({ value: undefined, max: 5 })).toBe('-');
    expect(formatAnswerValue({ max: 10 })).toBe('-');
    expect(formatAnswerValue({ value: '', max: 10 })).toBe('-');
  });

  it('is a dash for a value that is not a number', () => {
    expect(formatAnswerValue({ value: 'abc', max: 10 })).toBe('-');
    expect(formatAnswerValue({ value: NaN, max: 10 })).toBe('-');
  });
});

describe('firstNameOf', () => {
  it('takes the first word of the name', () => {
    expect(firstNameOf('Ana Souza')).toBe('Ana');
    expect(firstNameOf('Ana')).toBe('Ana');
    expect(firstNameOf('Maria Clara de Souza')).toBe('Maria');
  });

  it('ignores spaces around and between the words', () => {
    expect(firstNameOf('  Ana   Souza ')).toBe('Ana');
    expect(firstNameOf('Ana\tSouza')).toBe('Ana');
  });

  it('is null when the service has no name', () => {
    expect(firstNameOf(null)).toBeNull();
    expect(firstNameOf(undefined)).toBeNull();
    expect(firstNameOf('')).toBeNull();
    expect(firstNameOf('   ')).toBeNull();
  });
});

describe('studentCallNameOf', () => {
  it('calls the student by the first name, the same in the middle and at the start of a sentence', () => {
    expect(studentCallNameOf('Ana Souza')).toEqual({ inSentence: 'Ana', atStart: 'Ana' });
  });

  it('falls back to "o aluno", capitalised at the start of a sentence, when there is no name', () => {
    expect(studentCallNameOf(null)).toEqual({ inSentence: 'o aluno', atStart: 'O aluno' });
    expect(studentCallNameOf(undefined)).toEqual({ inSentence: 'o aluno', atStart: 'O aluno' });
    expect(studentCallNameOf('')).toEqual({ inSentence: 'o aluno', atStart: 'O aluno' });
    expect(studentCallNameOf('   ')).toEqual({ inSentence: 'o aluno', atStart: 'O aluno' });
  });

  it('opens the sentence with a capital even when the name was saved in lower case, accents included', () => {
    expect(studentCallNameOf('érica lima').atStart).toBe('Érica');
    expect(studentCallNameOf('ana').atStart).toBe('Ana');
  });
});

describe('latestAnsweredPair', () => {
  it('has neither a latest nor a previous for an empty history', () => {
    expect(latestAnsweredPair([])).toEqual({ latest: null, previous: null });
  });

  it('has neither when no feedback was answered', () => {
    expect(latestAnsweredPair([feedback('fb-1', 'expired'), feedback('fb-2', 'pending')])).toEqual({ latest: null, previous: null });
  });

  it('has only a latest when a single feedback was answered', () => {
    const only = answered('fb-1', 62);

    expect(latestAnsweredPair([only])).toEqual({ latest: only, previous: null });
  });

  it('takes the last two answered ones of a history ordered oldest first', () => {
    const first = answered('fb-1', 40);
    const second = answered('fb-2', 62);
    const third = answered('fb-3', 58);

    const pair = latestAnsweredPair([first, second, third]);

    expect(pair.latest).toBe(third);
    expect(pair.previous).toBe(second);
  });

  it('skips expired and pending feedbacks, wherever they sit', () => {
    const first = answered('fb-1', 62);
    const second = answered('fb-3', 58);

    const pair = latestAnsweredPair([first, feedback('fb-2', 'expired'), second, feedback('fb-4', 'pending')]);

    expect(pair.latest).toBe(second);
    expect(pair.previous).toBe(first);
  });
});

describe('overallDeltasById', () => {
  it('is empty for an empty history', () => {
    expect(overallDeltasById([]).size).toBe(0);
  });

  it('gives null to the first answered feedback and the variation to the ones after it', () => {
    const deltas = overallDeltasById([answered('fb-1', 62), answered('fb-2', 58), answered('fb-3', 80)]);

    expect([...deltas]).toEqual([['fb-1', null], ['fb-2', -4], ['fb-3', 22]]);
  });

  it('compares with the previous answered one, skipping the unanswered in between, and leaves these out', () => {
    const deltas = overallDeltasById([
      answered('fb-1', 62),
      feedback('fb-2', 'expired'),
      answered('fb-3', 58),
      feedback('fb-4', 'pending'),
    ]);

    expect([...deltas]).toEqual([['fb-1', null], ['fb-3', -4]]);
    expect(deltas.has('fb-2')).toBe(false);
    expect(deltas.has('fb-4')).toBe(false);
  });

  it('reports an unchanged index as zero, not as a missing variation', () => {
    const deltas = overallDeltasById([answered('fb-1', 62), answered('fb-2', 62)]);

    expect(deltas.get('fb-2')).toBe(0);
  });

  it('gives no variation next to an answered feedback without an index', () => {
    const deltas = overallDeltasById([answered('fb-1', 62), answered('fb-2', null), answered('fb-3', 70)]);

    expect([...deltas]).toEqual([['fb-1', null], ['fb-2', null], ['fb-3', null]]);
  });
});

describe('overallDeltaOf', () => {
  it('is the index of the latest minus the index of the previous', () => {
    expect(overallDeltaOf(answered('fb-2', 58), answered('fb-1', 62))).toBe(-4);
    expect(overallDeltaOf(answered('fb-2', 80), answered('fb-1', 62))).toBe(18);
    expect(overallDeltaOf(answered('fb-2', 62), answered('fb-1', 62))).toBe(0);
  });

  it('counts an index of zero as a value on either side', () => {
    expect(overallDeltaOf(answered('fb-2', 0), answered('fb-1', 50))).toBe(-50);
    expect(overallDeltaOf(answered('fb-2', 50), answered('fb-1', 0))).toBe(50);
  });

  it('is null without a previous feedback', () => {
    expect(overallDeltaOf(answered('fb-1', 62), null)).toBeNull();
    expect(overallDeltaOf(answered('fb-1', 62), undefined)).toBeNull();
  });

  it('is null when either index is missing', () => {
    expect(overallDeltaOf(answered('fb-2', null), answered('fb-1', 62))).toBeNull();
    expect(overallDeltaOf(answered('fb-2', 62), answered('fb-1', null))).toBeNull();
  });
});

describe('buildLatestPillars', () => {
  it('puts the pillars in the fixed display order, whatever order the service sent', () => {
    const latest = answered('fb-1', 60, [
      pillar('hydration', 'Hidratação', 55),
      pillar('sleep', 'Sono', 25),
      pillar('training_adherence', 'Adesão ao treino', 90),
      pillar('routine', 'Rotina', 60),
    ]);

    expect(buildLatestPillars(latest, null).map((item) => item.pillar)).toEqual(['training_adherence', 'routine', 'sleep', 'hydration']);
  });

  it('puts pillars the app does not know last, in the order the service sent them', () => {
    const latest = answered('fb-1', 60, [
      pillar('mood', 'Humor', 70),
      pillar('sleep', 'Sono', 25),
      pillar('energy', 'Energia', 40),
      pillar('other', 'Outro', 10),
    ]);

    expect(buildLatestPillars(latest, null).map((item) => item.pillar)).toEqual(['sleep', 'other', 'mood', 'energy']);
  });

  it('keeps every field of the pillar and adds the variation', () => {
    const answers = [{ questionId: 'q-2', question: 'Como foi o sono?', type: 'stars', value: 2, max: 5, inverted: false }];
    const latest = answered('fb-2', 58, [pillar('sleep', 'Sono', 25, { band: 'attention', bandLabel: 'Atenção', answers })]);
    const previous = answered('fb-1', 62, [pillar('sleep', 'Sono', 50)]);

    expect(buildLatestPillars(latest, previous)).toEqual([
      { pillar: 'sleep', pillarLabel: 'Sono', score: 25, band: 'attention', bandLabel: 'Atenção', answers, delta: -25 },
    ]);
  });

  it('gives every pillar a null variation when there is no previous feedback', () => {
    const latest = answered('fb-1', 60, [pillar('sleep', 'Sono', 25), pillar('routine', 'Rotina', 60)]);

    expect(buildLatestPillars(latest, null).map((item) => item.delta)).toEqual([null, null]);
  });

  it('compares each pillar with the same pillar of the previous feedback: up, down and unchanged', () => {
    const latest = answered('fb-2', 58, [
      pillar('training_adherence', 'Adesão ao treino', 90),
      pillar('routine', 'Rotina', 60),
      pillar('sleep', 'Sono', 25),
    ]);
    const previous = answered('fb-1', 62, [
      pillar('sleep', 'Sono', 50),
      pillar('training_adherence', 'Adesão ao treino', 80),
      pillar('routine', 'Rotina', 60),
    ]);

    expect(buildLatestPillars(latest, previous).map((item) => [item.pillar, item.delta])).toEqual([
      ['training_adherence', 10],
      ['routine', 0],
      ['sleep', -25],
    ]);
  });

  it('gives a null variation to a pillar the previous feedback did not score', () => {
    const latest = answered('fb-2', 58, [pillar('sleep', 'Sono', 25), pillar('hydration', 'Hidratação', 55)]);
    const previous = answered('fb-1', 62, [pillar('sleep', 'Sono', 50)]);

    expect(buildLatestPillars(latest, previous).map((item) => [item.pillar, item.delta])).toEqual([
      ['sleep', -25],
      ['hydration', null],
    ]);
  });

  it('gives a null variation when the score is missing on either side, and counts zero as a score', () => {
    const latest = answered('fb-2', 58, [
      pillar('training_adherence', 'Adesão ao treino', null),
      pillar('routine', 'Rotina', 60),
      pillar('sleep', 'Sono', 0),
    ]);
    const previous = answered('fb-1', 62, [
      pillar('training_adherence', 'Adesão ao treino', 80),
      pillar('routine', 'Rotina', null),
      pillar('sleep', 'Sono', 50),
    ]);

    expect(buildLatestPillars(latest, previous).map((item) => item.delta)).toEqual([null, null, -50]);
  });

  it('leaves out pillars only the previous feedback scored', () => {
    const latest = answered('fb-2', 58, [pillar('sleep', 'Sono', 25)]);
    const previous = answered('fb-1', 62, [pillar('sleep', 'Sono', 50), pillar('routine', 'Rotina', 60)]);

    expect(buildLatestPillars(latest, previous).map((item) => item.pillar)).toEqual(['sleep']);
  });

  it('is empty for a feedback without pillars', () => {
    expect(buildLatestPillars(answered('fb-1', 60, []), null)).toEqual([]);
  });

  it('does not reorder or change the pillars of the feedback it was given', () => {
    const pillars = [pillar('sleep', 'Sono', 25), pillar('training_adherence', 'Adesão ao treino', 90)];
    const latest = answered('fb-1', 60, pillars);

    buildLatestPillars(latest, null);

    expect(latest.pillars).toEqual([pillar('sleep', 'Sono', 25), pillar('training_adherence', 'Adesão ao treino', 90)]);
  });
});
