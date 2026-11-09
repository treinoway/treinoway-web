import { PRESCRIPTION_STEPS } from './prescriptionSteps';

describe('PRESCRIPTION_STEPS', () => {
  it('lists the steps in order with their labels', () => {
    expect(PRESCRIPTION_STEPS.map(({ id, title, short }) => [id, title, short])).toEqual([
      ['goals', 'Metas e gasto energético', 'Metas'],
      ['menu', 'Cardápio', 'Cardápio'],
      ['guidance', 'Orientações', 'Orientações'],
    ]);
  });

  it('has unique ids that are safe as path segments', () => {
    const ids = PRESCRIPTION_STEPS.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(`/base/${id}`).toMatch(/^\/base\/[a-z-]+$/));
  });

  it('is frozen', () => {
    expect(Object.isFrozen(PRESCRIPTION_STEPS)).toBe(true);
  });
});
