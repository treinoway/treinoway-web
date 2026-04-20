export const MEAL_TYPE = {
  BREAKFAST: 'breakfast',
  MORNING_SNACK: 'morning_snack',
  LUNCH: 'lunch',
  AFTERNOON_SNACK: 'afternoon_snack',
  DINNER: 'dinner',
  SUPPER: 'supper',
};

export const MEAL_TYPE_OPTIONS = [
  { value: MEAL_TYPE.BREAKFAST, label: 'Café da manhã' },
  { value: MEAL_TYPE.MORNING_SNACK, label: 'Lanche da manhã' },
  { value: MEAL_TYPE.LUNCH, label: 'Almoço' },
  { value: MEAL_TYPE.AFTERNOON_SNACK, label: 'Lanche da tarde' },
  { value: MEAL_TYPE.DINNER, label: 'Jantar' },
  { value: MEAL_TYPE.SUPPER, label: 'Ceia' },
];

export const MEAL_TYPE_LABEL = {
  [MEAL_TYPE.BREAKFAST]: 'Café da manhã',
  [MEAL_TYPE.MORNING_SNACK]: 'Lanche da manhã',
  [MEAL_TYPE.LUNCH]: 'Almoço',
  [MEAL_TYPE.AFTERNOON_SNACK]: 'Lanche da tarde',
  [MEAL_TYPE.DINNER]: 'Jantar',
  [MEAL_TYPE.SUPPER]: 'Ceia',
};

export const DIET_TYPE = {
  STANDARD: 'standard',
  LOW_CARB: 'low_carb',
  HIGH_PROTEIN: 'high_protein',
  MEDITERRANEAN: 'mediterranean',
  VEGETARIAN: 'vegetarian',
  VEGAN: 'vegan',
};

export const DIET_TYPE_OPTIONS = [
  { value: DIET_TYPE.STANDARD, label: 'Padrão' },
  { value: DIET_TYPE.LOW_CARB, label: 'Low Carb' },
  { value: DIET_TYPE.HIGH_PROTEIN, label: 'Alta proteína' },
  { value: DIET_TYPE.MEDITERRANEAN, label: 'Mediterrânea' },
  { value: DIET_TYPE.VEGETARIAN, label: 'Vegetariana' },
  { value: DIET_TYPE.VEGAN, label: 'Vegana' },
];

export const DIET_TYPE_LABEL = {
  [DIET_TYPE.STANDARD]: 'Padrão',
  [DIET_TYPE.LOW_CARB]: 'Low Carb',
  [DIET_TYPE.HIGH_PROTEIN]: 'Alta proteína',
  [DIET_TYPE.MEDITERRANEAN]: 'Mediterrânea',
  [DIET_TYPE.VEGETARIAN]: 'Vegetariana',
  [DIET_TYPE.VEGAN]: 'Vegana',
};

export const GOAL_TYPE = {
  WEIGHT_LOSS: 'weight_loss',
  MUSCLE_GAIN: 'muscle_gain',
  MAINTENANCE: 'maintenance',
  HEALTH: 'health',
};

export const GOAL_TYPE_OPTIONS = [
  { value: GOAL_TYPE.WEIGHT_LOSS, label: 'Emagrecimento' },
  { value: GOAL_TYPE.MUSCLE_GAIN, label: 'Ganho de massa' },
  { value: GOAL_TYPE.MAINTENANCE, label: 'Manutenção' },
  { value: GOAL_TYPE.HEALTH, label: 'Saúde' },
];

export const GOAL_TYPE_LABEL = {
  [GOAL_TYPE.WEIGHT_LOSS]: 'Emagrecimento',
  [GOAL_TYPE.MUSCLE_GAIN]: 'Ganho de massa',
  [GOAL_TYPE.MAINTENANCE]: 'Manutenção',
  [GOAL_TYPE.HEALTH]: 'Saúde',
};

export const ACTIVITY_LEVEL = {
  SEDENTARIO: 'sedentario',
  LEVEMENTE_ATIVO: 'levemente_ativo',
  MODERADAMENTE_ATIVO: 'moderadamente_ativo',
  MUITO_ATIVO: 'muito_ativo',
  EXTREMAMENTE_ATIVO: 'extremamente_ativo',
};

export const ACTIVITY_LEVEL_OPTIONS = [
  { value: ACTIVITY_LEVEL.SEDENTARIO, label: 'Sedentário' },
  { value: ACTIVITY_LEVEL.LEVEMENTE_ATIVO, label: 'Levemente ativo' },
  { value: ACTIVITY_LEVEL.MODERADAMENTE_ATIVO, label: 'Moderadamente ativo' },
  { value: ACTIVITY_LEVEL.MUITO_ATIVO, label: 'Muito ativo' },
  { value: ACTIVITY_LEVEL.EXTREMAMENTE_ATIVO, label: 'Extremamente ativo' },
];

export const ACTIVITY_LEVEL_LABEL = {
  [ACTIVITY_LEVEL.SEDENTARIO]: 'Sedentário',
  [ACTIVITY_LEVEL.LEVEMENTE_ATIVO]: 'Levemente ativo',
  [ACTIVITY_LEVEL.MODERADAMENTE_ATIVO]: 'Moderadamente ativo',
  [ACTIVITY_LEVEL.MUITO_ATIVO]: 'Muito ativo',
  [ACTIVITY_LEVEL.EXTREMAMENTE_ATIVO]: 'Extremamente ativo',
};

export const DIET_PROTOCOL_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
};

export const DIET_PROTOCOL_STATUS_LABEL = {
  [DIET_PROTOCOL_STATUS.DRAFT]: 'Rascunho',
  [DIET_PROTOCOL_STATUS.ACTIVE]: 'Ativo',
  [DIET_PROTOCOL_STATUS.COMPLETED]: 'Concluído',
  [DIET_PROTOCOL_STATUS.ARCHIVED]: 'Arquivado',
};

export const DIET_PROTOCOL_STATUS_BADGE_CLASS = {
  [DIET_PROTOCOL_STATUS.DRAFT]: 'badge badge-gray',
  [DIET_PROTOCOL_STATUS.ACTIVE]: 'badge badge-green',
  [DIET_PROTOCOL_STATUS.COMPLETED]: 'badge badge-blue',
  [DIET_PROTOCOL_STATUS.ARCHIVED]: 'badge badge-gray',
};

export const TMB_FORMULA = {
  HARRIS_BENEDICT: 'harris_benedict',
  MIFFLIN_ST_JEOR: 'mifflin_st_jeor',
};

export const TMB_FORMULA_OPTIONS = [
  { value: TMB_FORMULA.HARRIS_BENEDICT, label: 'Harris-Benedict' },
  { value: TMB_FORMULA.MIFFLIN_ST_JEOR, label: 'Mifflin-St Jeor' },
];

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Feminino' },
];
