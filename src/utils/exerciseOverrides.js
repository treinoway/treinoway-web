// Prescription overrides for an exercise added from a template: drops the resolved `template` object and undefined values.
export const toApiOverrides = (overrides = {}) =>
  Object.fromEntries(
    Object.entries(overrides).filter(([key, value]) => key !== 'template' && value !== undefined)
  );
