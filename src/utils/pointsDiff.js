import { POINTS_FIELDS } from '../constants/points-fields';

const toIntOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const countDiffs = (values, template) => {
  if (!template) return 0;
  return POINTS_FIELDS.reduce((count, { key }) => {
    const a = toIntOrNull(values[key]);
    const b = toIntOrNull(template[key]);
    return a !== b ? count + 1 : count;
  }, 0);
};
