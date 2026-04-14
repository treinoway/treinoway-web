export const TRAINING_CATEGORY_OPTIONS = [
  { value: 'strength', label: 'Força' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'functional', label: 'Funcional' },
  { value: 'mobility', label: 'Mobilidade' },
  { value: 'flexibility', label: 'Flexibilidade' },
  { value: 'rest', label: 'Descanso' },
];

export const TRAINING_CATEGORY_LABEL = Object.fromEntries(
  TRAINING_CATEGORY_OPTIONS.map(({ value, label }) => [value, label])
);
