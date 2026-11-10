/**
 * Consistency ranking enums, labels, ready messages and field limits.
 * Pillar and faixa values match the API.
 */

export const PILLAR = Object.freeze({
  WORKOUTS: 'workouts',
  CARDIO: 'cardio',
  FEEDBACK: 'feedback',
  HYDRATION: 'hydration',
  DIET: 'diet',
});

/** Display order of the pillars; also the tie-break order of the weakest pillar */
export const PILLAR_ORDER = Object.freeze([PILLAR.WORKOUTS, PILLAR.CARDIO, PILLAR.FEEDBACK, PILLAR.HYDRATION, PILLAR.DIET]);

export const PILLAR_LABELS = Object.freeze({
  [PILLAR.WORKOUTS]: 'Treinos',
  [PILLAR.CARDIO]: 'Cardio',
  [PILLAR.FEEDBACK]: 'Feedback',
  [PILLAR.HYDRATION]: 'Hidratação',
  [PILLAR.DIET]: 'Dieta',
});

export const PILLAR_ABBREVIATIONS = Object.freeze({
  [PILLAR.WORKOUTS]: 'TRE',
  [PILLAR.CARDIO]: 'CAR',
  [PILLAR.FEEDBACK]: 'FEE',
  [PILLAR.HYDRATION]: 'HID',
  [PILLAR.DIET]: 'DIE',
});

export const FAIXA = Object.freeze({
  FULL: 'full',
  CONSTANT: 'constant',
  STEADY: 'steady',
  RESTARTING: 'restarting',
  ENTERING: 'entering',
});

export const FAIXA_LABELS = Object.freeze({
  [FAIXA.FULL]: '100%',
  [FAIXA.CONSTANT]: 'Constante',
  [FAIXA.STEADY]: 'Em ritmo',
  [FAIXA.RESTARTING]: 'Retomando',
  [FAIXA.ENTERING]: 'Entrando',
});

export const STANDINGS_FILTER = Object.freeze({
  ALL: 'all',
  RISK: 'risk',
  SIGNAL: 'signal',
  ENTERING: 'entering',
  PAUSED: 'paused',
});

export const STANDINGS_FILTER_OPTIONS = Object.freeze([
  { value: STANDINGS_FILTER.ALL, label: 'Todos' },
  { value: STANDINGS_FILTER.RISK, label: 'Em risco' },
  { value: STANDINGS_FILTER.SIGNAL, label: 'Com sinal' },
  { value: STANDINGS_FILTER.ENTERING, label: 'Entrando' },
  { value: STANDINGS_FILTER.PAUSED, label: 'Com semana pausada' },
]);

export const STANDINGS_TAB = Object.freeze({
  CURRENT: 'current',
  HISTORY: 'history',
  SEASONS: 'seasons',
});

export const STANDINGS_TAB_OPTIONS = Object.freeze([
  { value: STANDINGS_TAB.CURRENT, label: 'Temporada atual' },
  { value: STANDINGS_TAB.HISTORY, label: 'Histórico geral' },
  { value: STANDINGS_TAB.SEASONS, label: 'Temporadas anteriores' },
]);

/** Ready WhatsApp message per weakest pillar; {nome} is the student's first name */
export const READY_MESSAGES = Object.freeze({
  [PILLAR.WORKOUTS]: 'Oi, {nome}! Vi que os treinos tão difíceis de encaixar. Quer que a gente ajuste os dias pra caber na tua semana?',
  [PILLAR.CARDIO]: 'Oi, {nome}! Vi que o cardio tá difícil de encaixar nessas últimas semanas. Bora ajustar pra caber na tua rotina? Me conta como tá sendo.',
  [PILLAR.FEEDBACK]: 'Oi, {nome}! Senti falta do teu check-in. Me manda como foi a semana, mesmo que curtinho?',
  [PILLAR.HYDRATION]: 'Oi, {nome}! A água ficou pra trás nos últimos dias. Quer que eu ajuste a meta ou te mande uma dica pra lembrar?',
  [PILLAR.DIET]: 'Oi, {nome}! Vi que as refeições do plano não tão sendo marcadas. Tá difícil seguir ou só esquecendo de marcar?',
});

export const WEIGHT_TOTAL = 100;
export const MAX_PAUSE_WEEKS_AHEAD = 12;
export const PAUSE_REASON_MAX_LENGTH = 40;
export const SEASON_WEEK_OPTIONS = Object.freeze([4, 8, 12]);
export const POLL_INTERVAL_MS = 60 * 1000;
export const SEARCH_DEBOUNCE_MS = 300;

/** Allowed range of each numeric rule field */
export const CONFIG_LIMITS = Object.freeze({
  minPodiumWeeks: { min: 1, max: 4 },
  closeHour: { min: 0, max: 23 },
  minWorkoutMinutes: { min: 0, max: 60 },
  riskLimit: { min: 50, max: 90 },
  riskWeeks: { min: 1, max: 4 },
  batchCount: { min: 2, max: 20 },
  batchMinutes: { min: 10, max: 120 },
});

/** Default configuration restored by "Restaurar padrões" (the time zone is kept as the trainer's) */
export const CONFIG_DEFAULTS = Object.freeze({
  weights: Object.freeze({ workouts: 30, diet: 30, cardio: 15, feedback: 15, hydration: 10 }),
  activePillars: Object.freeze([PILLAR.WORKOUTS, PILLAR.CARDIO, PILLAR.FEEDBACK, PILLAR.HYDRATION]),
  seasonWeeks: 4,
  minPodiumWeeks: 2,
  closeWeekday: 0,
  closeHour: 21,
  minWorkoutMinutes: 10,
  riskLimit: 70,
  riskWeeks: 2,
  batchCount: 5,
  batchMinutes: 30,
});

/** Scores and pillar adherences below this value are drawn with the warning color */
export const WARNING_SCORE_THRESHOLD = 70;
