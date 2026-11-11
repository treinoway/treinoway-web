import { buildEnergyPanel, isSheetComplete } from './energyPanel';
import { buildGoals, buildSheet } from '../test/nutritionFixtures';

describe('energyPanel', () => {
  it('breaks down BMR, base, activities, TEE, adjustment and suggestion', () => {
    const panel = buildEnergyPanel(buildGoals(), buildSheet());
    expect(panel.bmr).toBeCloseTo(1385.25, 2);
    expect(panel.base).toBeCloseTo(1662.3, 1);
    expect(panel.activityKcal).toBeCloseTo(254.57, 1);
    expect(panel.tee).toBeCloseTo(1916.87, 1);
    expect(panel.suggestion).toBeCloseTo(1533.5, 0);
    expect(panel.adjustment).toBeCloseTo(-383.37, 1);
  });

  it('ignores activities that are not included', () => {
    const goals = buildGoals();
    goals.activities = goals.activities.map((activity) => ({ ...activity, included: false }));
    expect(buildEnergyPanel(goals, buildSheet()).activityKcal).toBe(0);
  });

  it('is null when the sheet lacks data for the formula', () => {
    expect(buildEnergyPanel(buildGoals(), buildSheet({ weightKg: null }))).toBeNull();
    expect(buildEnergyPanel(buildGoals({ bmrFormula: 'katch_mcardle' }), buildSheet({ bodyFatPct: null }))).toBeNull();
  });

  it('detects an incomplete sheet', () => {
    expect(isSheetComplete(buildSheet())).toBe(true);
    expect(isSheetComplete(buildSheet({ heightCm: null }))).toBe(false);
  });
});
