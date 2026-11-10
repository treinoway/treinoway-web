export const BMR_FORMULA_OPTIONS = Object.freeze([
  { value: 'mifflin', label: 'Mifflin-St Jeor', short: 'Mifflin-St Jeor' },
  { value: 'harris_benedict', label: 'Harris-Benedict revisada (1984)', short: 'Harris-Benedict' },
  { value: 'fao_who', label: 'FAO/OMS (1985)', short: 'FAO/OMS' },
  { value: 'katch_mcardle', label: 'Katch-McArdle (usa massa magra)', short: 'Katch-McArdle' },
]);

export const ACTIVITY_FACTOR_OPTIONS = Object.freeze([
  { value: 1.2, label: 'Sedentária · fator 1,2' },
  { value: 1.375, label: 'Moderada · fator 1,375' },
  { value: 1.55, label: 'Ativa · fator 1,55' },
]);

export const OBJECTIVE_OPTIONS = Object.freeze([
  { value: 'maintain', label: 'Manter o peso · sem ajuste', name: 'Manter o peso' },
  { value: 'deficit_10', label: 'Déficit leve · −10%', name: 'Déficit leve' },
  { value: 'deficit_20', label: 'Déficit moderado · −20%', name: 'Déficit moderado' },
  { value: 'surplus_10', label: 'Superávit leve · +10%', name: 'Superávit leve' },
]);

export const SEX_LABEL = Object.freeze({ female: 'Feminino', male: 'Masculino' });

export const WATER_ML_PER_KG = 35;
export const WATER_CUP_ML = 250;
export const MAX_OPTIONS_PER_MEAL = 3;

// Pt-BR name of a plan objective ("Déficit moderado"), '' when unknown.
export const objectiveName = (objective) => OBJECTIVE_OPTIONS.find((option) => option.value === objective)?.name ?? '';
