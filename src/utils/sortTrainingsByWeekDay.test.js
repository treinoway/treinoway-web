import { describe, it, expect } from 'vitest';
import { sortTrainingsByWeekDay } from './sortTrainingsByWeekDay';

describe('sortTrainingsByWeekDay', () => {
  it('sorts assigned trainings in canonical weekday order (monday first)', () => {
    const trainings = [
      { id: 1, weekDay: 'friday', order: 1 },
      { id: 2, weekDay: 'monday', order: 2 },
      { id: 3, weekDay: 'wednesday', order: 3 },
    ];

    const result = sortTrainingsByWeekDay(trainings);

    expect(result.map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it('places unassigned trainings (null weekDay) after assigned ones', () => {
    const trainings = [
      { id: 1, weekDay: null, order: 1 },
      { id: 2, weekDay: 'tuesday', order: 2 },
    ];

    const result = sortTrainingsByWeekDay(trainings);

    expect(result.map((t) => t.id)).toEqual([2, 1]);
  });

  it('places unassigned trainings (undefined weekDay) after assigned ones', () => {
    const trainings = [
      { id: 1, order: 1 },
      { id: 2, weekDay: 'sunday', order: 2 },
    ];

    const result = sortTrainingsByWeekDay(trainings);

    expect(result.map((t) => t.id)).toEqual([2, 1]);
  });

  it('is case-insensitive — uppercase MONDAY sorts the same as lowercase monday', () => {
    const trainings = [
      { id: 1, weekDay: 'FRIDAY', order: 1 },
      { id: 2, weekDay: 'MONDAY', order: 2 },
    ];

    const result = sortTrainingsByWeekDay(trainings);

    expect(result.map((t) => t.id)).toEqual([2, 1]);
  });

  it('is case-insensitive with mixed case', () => {
    const trainings = [
      { id: 1, weekDay: 'Wednesday', order: 1 },
      { id: 2, weekDay: 'monday', order: 2 },
    ];

    const result = sortTrainingsByWeekDay(trainings);

    expect(result.map((t) => t.id)).toEqual([2, 1]);
  });

  it('preserves relative order of unassigned trainings by their order field', () => {
    const trainings = [
      { id: 1, weekDay: null, order: 3 },
      { id: 2, weekDay: null, order: 1 },
      { id: 3, weekDay: null, order: 2 },
    ];

    const result = sortTrainingsByWeekDay(trainings);

    expect(result.map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it('preserves original index as stable tiebreaker when order is equal', () => {
    const trainings = [
      { id: 1, weekDay: null, order: 1 },
      { id: 2, weekDay: null, order: 1 },
    ];

    const result = sortTrainingsByWeekDay(trainings);

    expect(result.map((t) => t.id)).toEqual([1, 2]);
  });

  it('handles a full week in reverse order', () => {
    const trainings = [
      { id: 7, weekDay: 'sunday', order: 7 },
      { id: 6, weekDay: 'saturday', order: 6 },
      { id: 5, weekDay: 'friday', order: 5 },
      { id: 4, weekDay: 'thursday', order: 4 },
      { id: 3, weekDay: 'wednesday', order: 3 },
      { id: 2, weekDay: 'tuesday', order: 2 },
      { id: 1, weekDay: 'monday', order: 1 },
    ];

    const result = sortTrainingsByWeekDay(trainings);

    expect(result.map((t) => t.id)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('returns an empty array when given an empty array', () => {
    expect(sortTrainingsByWeekDay([])).toEqual([]);
  });

  it('does not mutate the original array', () => {
    const trainings = [
      { id: 1, weekDay: 'friday', order: 1 },
      { id: 2, weekDay: 'monday', order: 2 },
    ];
    const original = [...trainings];

    sortTrainingsByWeekDay(trainings);

    expect(trainings).toEqual(original);
  });

  it('handles all trainings having the same weekDay — stable by order', () => {
    const trainings = [
      { id: 1, weekDay: 'monday', order: 3 },
      { id: 2, weekDay: 'monday', order: 1 },
      { id: 3, weekDay: 'monday', order: 2 },
    ];

    const result = sortTrainingsByWeekDay(trainings);

    expect(result.map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it('treats unknown weekDay values as unassigned (go last)', () => {
    const trainings = [
      { id: 1, weekDay: 'notaday', order: 1 },
      { id: 2, weekDay: 'monday', order: 2 },
    ];

    const result = sortTrainingsByWeekDay(trainings);

    expect(result.map((t) => t.id)).toEqual([2, 1]);
  });
});
