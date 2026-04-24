import { describe, it, expect } from 'vitest';
import {
  ANAMNESIS_CONDITION_OPERATOR,
  ANAMNESIS_PARENT_ELIGIBLE_TYPES,
  ANAMNESIS_QUESTION_TYPE,
  defaultQuestionForm,
  isQuestionVisible,
} from './anamnesis';

describe('isQuestionVisible', () => {
  it('returns true when question has no parentQuestionId', () => {
    const q = { id: 'q1', parentQuestionId: null, condition: null };
    expect(isQuestionVisible(q, {})).toBe(true);
  });

  it('returns true when parentQuestionId is undefined', () => {
    const q = { id: 'q1' };
    expect(isQuestionVisible(q, { q1: 'yes' })).toBe(true);
  });

  it('returns false when parent answer is undefined (unanswered)', () => {
    const q = {
      id: 'child',
      parentQuestionId: 'parent',
      condition: { operator: 'equals', value: 'yes' },
    };
    expect(isQuestionVisible(q, {})).toBe(false);
  });

  it('returns false when parent answer is empty string', () => {
    const q = {
      id: 'child',
      parentQuestionId: 'parent',
      condition: { operator: 'equals', value: 'yes' },
    };
    expect(isQuestionVisible(q, { parent: '' })).toBe(false);
  });

  it('returns false when parent answer is an empty array', () => {
    const q = {
      id: 'child',
      parentQuestionId: 'parent',
      condition: { operator: 'includesAny', optionIds: ['opt-1'] },
    };
    expect(isQuestionVisible(q, { parent: [] })).toBe(false);
  });

  it('returns false when condition is null despite having parentQuestionId', () => {
    const q = { id: 'child', parentQuestionId: 'parent', condition: null };
    expect(isQuestionVisible(q, { parent: 'yes' })).toBe(false);
  });

  // ── EQUALS with value (dichotomous) ───────────────────────

  it('returns true for dichotomous parent when answer equals value "yes"', () => {
    const q = {
      id: 'child',
      parentQuestionId: 'parent',
      condition: { operator: 'equals', value: 'yes' },
    };
    expect(isQuestionVisible(q, { parent: 'yes' })).toBe(true);
  });

  it('returns false for dichotomous parent when answer mismatches value', () => {
    const q = {
      id: 'child',
      parentQuestionId: 'parent',
      condition: { operator: 'equals', value: 'yes' },
    };
    expect(isQuestionVisible(q, { parent: 'no' })).toBe(false);
  });

  // ── EQUALS with optionId (single choice) ──────────────────

  it('returns true for single-choice parent when answer equals optionId', () => {
    const q = {
      id: 'child',
      parentQuestionId: 'parent',
      condition: { operator: 'equals', optionId: 'opt-a' },
    };
    expect(isQuestionVisible(q, { parent: 'opt-a' })).toBe(true);
  });

  it('returns false for single-choice parent when answer mismatches optionId', () => {
    const q = {
      id: 'child',
      parentQuestionId: 'parent',
      condition: { operator: 'equals', optionId: 'opt-a' },
    };
    expect(isQuestionVisible(q, { parent: 'opt-b' })).toBe(false);
  });

  // ── INCLUDES_ANY (multiple choice) ────────────────────────

  it('returns true when any optionId is included in multi-choice answer', () => {
    const q = {
      id: 'child',
      parentQuestionId: 'parent',
      condition: { operator: 'includesAny', optionIds: ['opt-1', 'opt-2'] },
    };
    expect(isQuestionVisible(q, { parent: ['opt-2', 'opt-3'] })).toBe(true);
  });

  it('returns false when no optionIds intersect the multi-choice answer', () => {
    const q = {
      id: 'child',
      parentQuestionId: 'parent',
      condition: { operator: 'includesAny', optionIds: ['opt-1', 'opt-2'] },
    };
    expect(isQuestionVisible(q, { parent: ['opt-3'] })).toBe(false);
  });

  it('returns false when parent answer is a string but operator is includesAny', () => {
    const q = {
      id: 'child',
      parentQuestionId: 'parent',
      condition: { operator: 'includesAny', optionIds: ['opt-1'] },
    };
    expect(isQuestionVisible(q, { parent: 'opt-1' })).toBe(false);
  });

  it('returns false when optionIds is missing from includesAny condition', () => {
    const q = {
      id: 'child',
      parentQuestionId: 'parent',
      condition: { operator: 'includesAny' },
    };
    expect(isQuestionVisible(q, { parent: ['opt-1'] })).toBe(false);
  });

  // ── Malformed / unknown operator ──────────────────────────

  it('returns false when operator is unknown', () => {
    const q = {
      id: 'child',
      parentQuestionId: 'parent',
      condition: { operator: 'weird', value: 'yes' },
    };
    expect(isQuestionVisible(q, { parent: 'yes' })).toBe(false);
  });

  it('returns false when equals condition has neither value nor optionId', () => {
    const q = {
      id: 'child',
      parentQuestionId: 'parent',
      condition: { operator: 'equals' },
    };
    expect(isQuestionVisible(q, { parent: 'anything' })).toBe(false);
  });
});

describe('defaultQuestionForm', () => {
  it('includes parentQuestionId and condition as null', () => {
    const form = defaultQuestionForm();
    expect(form.parentQuestionId).toBeNull();
    expect(form.condition).toBeNull();
  });
});

describe('anamnesis constants', () => {
  it('ANAMNESIS_CONDITION_OPERATOR exposes the two backend operators', () => {
    expect(ANAMNESIS_CONDITION_OPERATOR.EQUALS).toBe('equals');
    expect(ANAMNESIS_CONDITION_OPERATOR.INCLUDES_ANY).toBe('includesAny');
  });

  it('ANAMNESIS_PARENT_ELIGIBLE_TYPES includes only dichotomous / single / multiple choice', () => {
    expect(ANAMNESIS_PARENT_ELIGIBLE_TYPES).toEqual([
      ANAMNESIS_QUESTION_TYPE.DICHOTOMOUS,
      ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE,
      ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE,
    ]);
  });
});
