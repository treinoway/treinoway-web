import { suggestedWaterMl } from './waterTarget';

describe('waterTarget', () => {
  it('suggests 35 ml/kg rounded to 100 ml', () => {
    expect(suggestedWaterMl(66)).toBe(2300);
  });

  it('is null without weight', () => {
    expect(suggestedWaterMl(null)).toBeNull();
  });
});
