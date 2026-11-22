export const CHALLENGE_STATUS = Object.freeze({
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

export const CHALLENGE_STATUS_VALUES = Object.values(CHALLENGE_STATUS);

export const CHALLENGE_STATUS_LABEL = {
  [CHALLENGE_STATUS.SCHEDULED]: 'Agendado',
  [CHALLENGE_STATUS.ACTIVE]: 'Ativo',
  [CHALLENGE_STATUS.COMPLETED]: 'Concluído',
  [CHALLENGE_STATUS.CANCELLED]: 'Cancelado',
};

export const CHALLENGE_STATUS_BADGE = {
  [CHALLENGE_STATUS.SCHEDULED]: 'badge-gray',
  [CHALLENGE_STATUS.ACTIVE]: 'badge-green',
  [CHALLENGE_STATUS.COMPLETED]: 'badge-blue',
  [CHALLENGE_STATUS.CANCELLED]: 'badge-red',
};

export const PARTICIPANT_MODE = Object.freeze({
  EXPLICIT: 'explicit',
  FILTER: 'filter',
  ALL: 'all',
});

export const PARTICIPANT_MODE_VALUES = Object.values(PARTICIPANT_MODE);

export const PARTICIPANT_MODE_LABEL = {
  [PARTICIPANT_MODE.EXPLICIT]: 'Selecionar alunos',
  [PARTICIPANT_MODE.FILTER]: 'Por filtro',
  [PARTICIPANT_MODE.ALL]: 'Todos os alunos',
};

export const CHALLENGE_NAME_MAX_LENGTH = 100;
export const CHALLENGE_MAX_DURATION_DAYS = 365;

// Quick-create presets: time-boxed challenges for all active students.
export const CHALLENGE_PRESETS = Object.freeze([
  {
    key: 'sprint-7',
    title: 'Sprint de 7 dias',
    description: 'Competição rápida de uma semana para manter o engajamento.',
    durationDays: 7,
    defaultName: 'Sprint Semanal',
  },
  {
    key: 'bi-weekly',
    title: 'Desafio quinzenal',
    description: 'Duas semanas focadas em consistência e metas de treino.',
    durationDays: 14,
    defaultName: 'Desafio 14 Dias',
  },
  {
    key: 'monthly',
    title: 'Campeonato mensal',
    description: 'Competição de um mês com ranking acumulado.',
    durationDays: 30,
    defaultName: 'Campeonato do Mês',
  },
]);

export const CHALLENGE_FORMAT = Object.freeze({
  DATES: 'dates',
  WEEKS: 'weeks',
});

export const CHALLENGE_MIN_WEEKS = 1;
export const CHALLENGE_MAX_WEEKS = 12;
export const CHALLENGE_START_MONDAY_COUNT = 12;
export const CHALLENGE_DESCRIPTION_MAX_LENGTH = 280;
