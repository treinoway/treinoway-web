import {
  formatRepetitions,
  formatRestInterval,
  formatExerciseMeta,
  formatSnapshotSummary,
  formatSnapshotSummaryTokens,
} from './exerciseMeta';

describe('formatRepetitions', () => {
  it('returns null for null input', () => {
    expect(formatRepetitions(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(formatRepetitions(undefined)).toBeNull();
  });

  it('returns single number when min equals max', () => {
    expect(formatRepetitions({ min: 10, max: 10 })).toBe('10');
  });

  it('returns range when min differs from max', () => {
    expect(formatRepetitions({ min: 8, max: 12 })).toBe('8\u201312');
  });
});

describe('formatRestInterval', () => {
  it('returns null for null or undefined', () => {
    expect(formatRestInterval(null)).toBeNull();
    expect(formatRestInterval(undefined)).toBeNull();
  });

  it('returns null for 0', () => {
    expect(formatRestInterval(0)).toBeNull();
  });

  it('returns null for negative values', () => {
    expect(formatRestInterval(-10)).toBeNull();
  });

  it('formats seconds only when less than 60', () => {
    expect(formatRestInterval(30)).toBe('Descanso: 30s');
  });

  it('formats exact minutes', () => {
    expect(formatRestInterval(60)).toBe('Descanso: 1min');
    expect(formatRestInterval(120)).toBe('Descanso: 2min');
  });

  it('formats minutes and seconds', () => {
    expect(formatRestInterval(90)).toBe('Descanso: 1min 30s');
    expect(formatRestInterval(150)).toBe('Descanso: 2min 30s');
  });
});

describe('formatExerciseMeta', () => {
  it('returns null for null input', () => {
    expect(formatExerciseMeta(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(formatExerciseMeta(undefined)).toBeNull();
  });

  it('returns null for exercise with no fields', () => {
    expect(formatExerciseMeta({})).toBeNull();
  });

  it('returns type label only when no other fields', () => {
    expect(formatExerciseMeta({ type: 'strength' })).toBe('Força');
  });

  it('returns type and sets x reps when min equals max', () => {
    const exercise = { type: 'strength', sets: 4, repetitions: { min: 10, max: 10 } };
    expect(formatExerciseMeta(exercise)).toBe('Força · 4x10');
  });

  it('returns type and sets x reps range when min differs from max', () => {
    const exercise = { type: 'cardio', sets: 3, repetitions: { min: 8, max: 12 } };
    expect(formatExerciseMeta(exercise)).toBe('Cardio · 3x8\u201312');
  });

  it('returns duration when prescriptionMode is "duration"', () => {
    const exercise = { type: 'cardio', prescriptionMode: 'duration', duration: 600 };
    expect(formatExerciseMeta(exercise)).toBe('Cardio · 600 seg');
  });

  it('returns duration with sets when prescriptionMode is "duration" and sets present', () => {
    const exercise = { type: 'strength', prescriptionMode: 'duration', sets: 3, duration: 45 };
    expect(formatExerciseMeta(exercise)).toBe('Força · 3x45 seg');
  });

  it('falls back to duration heuristic when prescriptionMode is absent and duration is set without reps', () => {
    const exercise = { type: 'cardio', duration: 600 };
    expect(formatExerciseMeta(exercise)).toBe('Cardio · 600 seg');
  });

  it('uses reps when prescriptionMode is "reps" even if duration is also present', () => {
    const exercise = { type: 'strength', prescriptionMode: 'reps', sets: 3, repetitions: { min: 10, max: 10 }, duration: 60 };
    expect(formatExerciseMeta(exercise)).toBe('Força · 3x10');
  });

  it('includes load when hasLoad is true and suggestedLoad is set', () => {
    const exercise = { type: 'strength', sets: 4, repetitions: { min: 10, max: 12 }, hasLoad: true, suggestedLoad: 60 };
    expect(formatExerciseMeta(exercise)).toBe('Força · 4x10\u201312 · 60 kg');
  });

  it('omits load when hasLoad is false', () => {
    const exercise = { type: 'strength', sets: 3, repetitions: { min: 10, max: 10 }, hasLoad: false, suggestedLoad: 40 };
    expect(formatExerciseMeta(exercise)).toBe('Força · 3x10');
  });

  it('omits load when suggestedLoad is null', () => {
    const exercise = { type: 'strength', sets: 3, repetitions: { min: 10, max: 10 }, hasLoad: true, suggestedLoad: null };
    expect(formatExerciseMeta(exercise)).toBe('Força · 3x10');
  });

  it('returns full meta string with all fields', () => {
    const exercise = {
      type: 'mobility',
      sets: 2,
      repetitions: { min: 15, max: 20 },
      hasLoad: true,
      suggestedLoad: 5,
    };
    expect(formatExerciseMeta(exercise)).toBe('Mobilidade · 2x15\u201320 · 5 kg');
  });

  it('includes rest interval when greater than 0', () => {
    const exercise = {
      type: 'strength',
      sets: 4,
      repetitions: { min: 8, max: 10 },
      hasLoad: true,
      suggestedLoad: 60,
      restInterval: 90,
    };
    expect(formatExerciseMeta(exercise)).toBe('Força · 4x8\u201310 · 60 kg · Descanso: 1min 30s');
  });

  it('does not include rest interval when null', () => {
    const exercise = {
      type: 'strength',
      sets: 4,
      repetitions: { min: 8, max: 10 },
      restInterval: null,
    };
    expect(formatExerciseMeta(exercise)).toBe('Força · 4x8\u201310');
  });

  it('does not include rest interval when 0', () => {
    const exercise = {
      type: 'strength',
      sets: 4,
      repetitions: { min: 8, max: 10 },
      restInterval: 0,
    };
    expect(formatExerciseMeta(exercise)).toBe('Força · 4x8\u201310');
  });
});

describe('formatSnapshotSummary', () => {
  it('returns null for null input', () => {
    expect(formatSnapshotSummary(null)).toBeNull();
  });

  it('formats sets × reps with rest and load', () => {
    const snapshot = {
      sets: 4,
      repetitions: { min: 10, max: 10 },
      restInterval: 60,
      hasLoad: true,
      suggestedLoad: 20,
    };
    expect(formatSnapshotSummary(snapshot)).toBe('4\u00d710 · 60s · 20kg');
  });

  it('shows "Carga a definir" when hasLoad is true but load is missing', () => {
    const snapshot = {
      sets: 4,
      repetitions: { min: 10, max: 10 },
      restInterval: 60,
      hasLoad: true,
      suggestedLoad: null,
    };
    expect(formatSnapshotSummary(snapshot)).toBe('4\u00d710 · 60s · Carga a definir');
  });

  it('omits load section when hasLoad is false', () => {
    const snapshot = {
      sets: 4,
      repetitions: { min: 10, max: 10 },
      restInterval: 60,
      hasLoad: false,
    };
    expect(formatSnapshotSummary(snapshot)).toBe('4\u00d710 · 60s');
  });

  it('uses duration mode when duration is set and repetitions are missing', () => {
    const snapshot = {
      sets: 4,
      duration: 45,
      restInterval: 60,
      hasLoad: true,
      suggestedLoad: 20,
    };
    expect(formatSnapshotSummary(snapshot)).toBe('4 × 45s · 60s desc · 20kg');
  });
});

describe('formatSnapshotSummaryTokens', () => {
  it('returns null for null input', () => {
    expect(formatSnapshotSummaryTokens(null)).toBeNull();
  });

  it('returns null for empty snapshot with no data', () => {
    expect(formatSnapshotSummaryTokens({})).toBeNull();
  });

  it('returns sets and reps tokens in reps mode (rest not included in summary)', () => {
    const snapshot = {
      sets: 4,
      repetitions: { min: 10, max: 10 },
      restInterval: 60,
      hasLoad: false,
    };
    const tokens = formatSnapshotSummaryTokens(snapshot);
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({ value: '4', unit: 'séries' });
    expect(tokens[1]).toEqual({ value: '10', unit: 'reps' });
  });

  it('returns reps range token when min differs from max', () => {
    const snapshot = {
      sets: 3,
      repetitions: { min: 8, max: 12 },
      restInterval: null,
      hasLoad: false,
    };
    const tokens = formatSnapshotSummaryTokens(snapshot);
    expect(tokens).toHaveLength(2);
    expect(tokens[1]).toEqual({ value: '8\u201312', unit: 'reps' });
  });

  it('appends load token when hasLoad is true with suggestedLoad', () => {
    const snapshot = {
      sets: 4,
      repetitions: { min: 10, max: 10 },
      restInterval: 60,
      hasLoad: true,
      suggestedLoad: 20,
    };
    const tokens = formatSnapshotSummaryTokens(snapshot);
    expect(tokens).toHaveLength(3);
    expect(tokens[2]).toEqual({ value: '20', unit: 'kg' });
  });

  it('appends placeholder load token when hasLoad is true but load is null', () => {
    const snapshot = {
      sets: 4,
      repetitions: { min: 10, max: 10 },
      restInterval: null,
      hasLoad: true,
      suggestedLoad: null,
    };
    const tokens = formatSnapshotSummaryTokens(snapshot);
    const loadToken = tokens[tokens.length - 1];
    expect(loadToken).toEqual({ value: '?', unit: 'kg' });
  });

  it('returns duration tokens in duration mode (rest not included in summary)', () => {
    const snapshot = {
      sets: 4,
      duration: 45,
      restInterval: 60,
      hasLoad: false,
    };
    const tokens = formatSnapshotSummaryTokens(snapshot);
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({ value: '4', unit: 'séries' });
    expect(tokens[1]).toEqual({ value: '45', unit: 's' });
  });
});
