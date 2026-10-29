import { describe, it, expect } from 'vitest';
import buildSessionExerciseEntries from './sessionExerciseEntries';
import { formatRestDuration } from './exerciseMeta';

// Builds an exercise log fixture.
const log = (id, exerciseId, name, extra = {}, exercise = {}) => ({
  id,
  exerciseId,
  status: 'completed',
  substitutedByExerciseId: null,
  exercise: { id: exerciseId, name, ...exercise },
  ...extra,
});

describe('buildSessionExerciseEntries', () => {
  it('folds a swapped principal and its substitute log into one row at the principal position', () => {
    const principal = log('l1', 'e1', 'Supino', { status: 'substituted', substitutedByExerciseId: 'e2' });
    const substitute = log('l2', 'e2', 'Crucifixo');
    const other = log('l3', 'e3', 'Remada');

    const entries = buildSessionExerciseEntries([principal, other, substitute]);

    expect(entries).toHaveLength(2);
    expect(entries[0].ex.log).toBe(substitute);
    expect(entries[0].ex.replacedName).toBe('Supino');
    expect(entries[1].ex.log).toBe(other);
  });

  it('keeps a substituted principal as its own row when the substitute log is missing', () => {
    const principal = log('l1', 'e1', 'Supino', { status: 'substituted', substitutedByExerciseId: 'e9' });

    const [entry] = buildSessionExerciseEntries([principal]);

    expect(entry.ex.log).toBe(principal);
    expect(entry.ex.replacedName).toBeNull();
  });

  it('groups contiguous bi-set members sorted by supersetOrder and keeps the group on a swapped member', () => {
    const grouped = (extra, order) => ({ supersetGroupId: 'g', supersetOrder: order, ...extra });
    const b = log('lb', 'eb', 'B', {}, grouped({}, 1));
    const principalA = log('la', 'ea', 'A', { status: 'substituted', substitutedByExerciseId: 'es' }, grouped({}, 0));
    const substitute = log('ls', 'es', 'S');

    const [group] = buildSessionExerciseEntries([b, principalA, substitute]);

    expect(group.kind).toBe('group');
    expect(group.members.map((m) => m.log.id)).toEqual(['ls', 'lb']);
  });
});

describe('formatRestDuration', () => {
  it('formats seconds and minutes, null for non-positive values', () => {
    expect(formatRestDuration(45)).toBe('45s');
    expect(formatRestDuration(120)).toBe('2min');
    expect(formatRestDuration(90)).toBe('1min 30s');
    expect(formatRestDuration(0)).toBeNull();
    expect(formatRestDuration(null)).toBeNull();
  });
});
