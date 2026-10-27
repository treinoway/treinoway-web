// Keys of the from-template overrides that are local-only: the resolved template and the display technique list.
const LOCAL_ONLY_KEYS = ['template', 'advancedTechniques'];

// Prescription overrides for an exercise added from a template: drops local-only keys and undefined values.
export const toApiOverrides = (overrides = {}) =>
  Object.fromEntries(
    Object.entries(overrides).filter(([key, value]) => !LOCAL_ONLY_KEYS.includes(key) && value !== undefined)
  );
