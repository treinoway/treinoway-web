import { describe, it, expect } from 'vitest';
import { effectivePercents, effectiveWeightsPhrase, isScoringRuleValid, weightSumOf } from './consistencyWeights';

const WEIGHTS = { workouts: 30, cardio: 15, feedback: 15, hydration: 10, diet: 30 };
const ACTIVE_WITHOUT_DIET = ['workouts', 'cardio', 'feedback', 'hydration'];

describe('effectivePercents', () => {
  it('PAN-38 shares each active weight over the sum of the active weights, with one decimal', () => {
    expect(effectivePercents(WEIGHTS, ACTIVE_WITHOUT_DIET)).toEqual({
      workouts: 42.9,
      cardio: 21.4,
      feedback: 21.4,
      hydration: 14.3,
      diet: null,
    });
  });

  it('PAN-38 gives the plain weight when every pillar is active and the weights sum to 100', () => {
    expect(effectivePercents(WEIGHTS, ['workouts', 'cardio', 'feedback', 'hydration', 'diet'])).toEqual({
      workouts: 30,
      cardio: 15,
      feedback: 15,
      hydration: 10,
      diet: 30,
    });
  });

  it('PAN-38 gives zero to every active pillar when the active weights sum to zero', () => {
    expect(effectivePercents({ ...WEIGHTS, workouts: 0 }, ['workouts'])).toEqual({
      workouts: 0,
      cardio: null,
      feedback: null,
      hydration: null,
      diet: null,
    });
  });
});

describe('effectiveWeightsPhrase', () => {
  it('PAN-38 names the pillar that is off and lists the effective shares of the others', () => {
    expect(effectiveWeightsPhrase(WEIGHTS, ACTIVE_WITHOUT_DIET)).toBe(
      'Peso efetivo com Dieta desligada: Treinos 42,9% · Cardio 21,4% · Feedback 21,4% · Hidratação 14,3%',
    );
  });

  it('PAN-38 says every pillar is on when none is off', () => {
    expect(effectiveWeightsPhrase(WEIGHTS, ['workouts', 'cardio', 'feedback', 'hydration', 'diet'])).toBe(
      'Peso efetivo com todos os pilares ligados: Treinos 30,0% · Cardio 15,0% · Feedback 15,0% · Hidratação 10,0% · Dieta 30,0%',
    );
  });

  it('PAN-38 joins several pillars that are off', () => {
    expect(effectiveWeightsPhrase(WEIGHTS, ['workouts', 'cardio', 'feedback'])).toBe(
      'Peso efetivo com Hidratação e Dieta desligadas: Treinos 50,0% · Cardio 25,0% · Feedback 25,0%',
    );
  });

  it('PAN-38 uses the masculine form for a masculine pillar that is off', () => {
    expect(effectiveWeightsPhrase(WEIGHTS, ['cardio', 'feedback', 'hydration', 'diet'])).toBe(
      'Peso efetivo com Treinos desligado: Cardio 21,4% · Feedback 21,4% · Hidratação 14,3% · Dieta 42,9%',
    );
  });
});

describe('consistencyWeights rule checks', () => {
  it('sums the five pillar weights', () => {
    expect(weightSumOf(WEIGHTS)).toBe(100);
    expect(weightSumOf({ ...WEIGHTS, workouts: 45 })).toBe(115);
  });

  it('accepts a rule only with weights summing 100 and at least one active pillar', () => {
    expect(isScoringRuleValid(WEIGHTS, ACTIVE_WITHOUT_DIET)).toBe(true);
    expect(isScoringRuleValid({ ...WEIGHTS, workouts: 45 }, ACTIVE_WITHOUT_DIET)).toBe(false);
    expect(isScoringRuleValid(WEIGHTS, [])).toBe(false);
  });
});
