export const BODY_SEGMENT_OPTIONS = [
  { value: 'upper', label: 'Superior' },
  { value: 'lower', label: 'Inferior' },
  { value: 'core', label: 'Core' },
  { value: 'full_body', label: 'Corpo inteiro' },
];

export const BODY_SEGMENT_LABEL = Object.fromEntries(
  BODY_SEGMENT_OPTIONS.map(({ value, label }) => [value, label])
);
