export const POINTS_FIELDS = Object.freeze([
  {
    key: 'ptsWorkoutCompleted',
    label: 'Treino completo',
    helper: 'Pontos por completar um treino',
  },
  {
    key: 'ptsStreak7Days',
    label: 'Sequencia semanal',
    helper: 'Pontos por manter 7 dias consecutivos treinando',
  },
  {
    key: 'ptsStreak30Days',
    label: 'Sequencia mensal',
    helper: 'Pontos por manter 30 dias consecutivos treinando',
  },
  {
    key: 'ptsDailyCheckin',
    label: 'Check-in diario',
    helper: 'Pontos por registrar presenca no treino',
  },
  {
    key: 'ptsEvolutionRecord',
    label: 'Registro de evolucao',
    helper: 'Pontos por registrar medidas corporais',
  },
  {
    key: 'ptsWorkoutFeedback',
    label: 'Feedback de treino',
    helper: 'Pontos por avaliar o treino realizado',
  },
  {
    key: 'dailyPointsCap',
    label: 'Limite diario',
    helper: 'Maximo de pontos por dia (vazio = sem limite)',
  },
]);

export const POINTS_FIELD_KEYS = POINTS_FIELDS.map((f) => f.key);
