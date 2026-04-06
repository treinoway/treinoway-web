export const RANKING_MODE = Object.freeze({
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  ALL_TIME: 'all_time',
});

export const RANKING_MODE_VALUES = Object.values(RANKING_MODE);

export const RANKING_MODE_LABEL = {
  [RANKING_MODE.WEEKLY]: 'Semanal',
  [RANKING_MODE.MONTHLY]: 'Mensal',
  [RANKING_MODE.ALL_TIME]: 'Geral',
};

export const POINT_ACTION = Object.freeze({
  WORKOUT_COMPLETED: 'workout_completed',
  STREAK_7_DAYS: 'streak_7_days',
  STREAK_30_DAYS: 'streak_30_days',
  DAILY_CHECKIN: 'daily_checkin',
  EVOLUTION_RECORD: 'evolution_record',
  WORKOUT_FEEDBACK: 'workout_feedback',
  TRAINER_BONUS: 'trainer_bonus',
});

export const POINT_ACTION_LABEL = {
  [POINT_ACTION.WORKOUT_COMPLETED]: 'Treino concluído',
  [POINT_ACTION.STREAK_7_DAYS]: 'Sequência de 7 dias',
  [POINT_ACTION.STREAK_30_DAYS]: 'Sequência de 30 dias',
  [POINT_ACTION.DAILY_CHECKIN]: 'Check-in diário',
  [POINT_ACTION.EVOLUTION_RECORD]: 'Registro de evolução',
  [POINT_ACTION.WORKOUT_FEEDBACK]: 'Feedback de treino',
  [POINT_ACTION.TRAINER_BONUS]: 'Bônus do treinador',
};

// Mapping used in the config form: UI field → label
export const CONFIG_ACTION_FIELDS = [
  { field: 'ptsWorkoutCompleted', action: POINT_ACTION.WORKOUT_COMPLETED },
  { field: 'ptsStreak7Days', action: POINT_ACTION.STREAK_7_DAYS },
  { field: 'ptsStreak30Days', action: POINT_ACTION.STREAK_30_DAYS },
  { field: 'ptsDailyCheckin', action: POINT_ACTION.DAILY_CHECKIN },
  { field: 'ptsEvolutionRecord', action: POINT_ACTION.EVOLUTION_RECORD },
  { field: 'ptsWorkoutFeedback', action: POINT_ACTION.WORKOUT_FEEDBACK },
];

export const DEFAULT_CONFIG = Object.freeze({
  enabled: true,
  ptsWorkoutCompleted: 10,
  ptsStreak7Days: 50,
  ptsStreak30Days: 250,
  ptsDailyCheckin: 2,
  ptsEvolutionRecord: 15,
  ptsWorkoutFeedback: 5,
  dailyPointsCap: null,
  streakToleranceHours: 24,
  rankingMode: RANKING_MODE.WEEKLY,
  anonymousRanking: false,
});

export const RANKING_MIN_STUDENTS = 3;
