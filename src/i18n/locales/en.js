const en = {
  errors: {
    TRAINING_TEMPLATE_EXERCISE_NOT_FOUND: 'Exercise not found in this training template.',
    FORBIDDEN_NOT_TEMPLATE_OWNER: 'You do not have permission to edit this template.',
  },
  messageCodes: {
    'trainingTemplateExercise.notFound': 'Exercise not found in this training template.',
  },
  challenge: {
    create: {
      addParticipantsLater: 'You can add participants after creating the challenge.',
    },
  },
  gamification: {
    config: {
      defaultPreferences: 'Points preferences',
      defaultBanner: 'These values will be used as defaults when creating new challenges. You can customize each challenge individually.',
      usingDefaults: 'Using default preferences',
      customized: 'Customized ({count} changes)',
      restoreDefaults: 'Restore defaults',
      editRules: 'Edit',
      viewDetails: 'View details',
      viewPreview: 'View',
      readOnlyActive: 'Cannot change rules while the challenge is active.',
      readOnlyEnded: 'Challenge ended.',
      previewMessage: 'Your default values will be applied. You can edit after creating the challenge.',
      pointsRules: 'Points rules',
      defaultPoints: 'Points: default preferences',
    },
    field: {
      ptsWorkoutCompleted: 'Workout completed',
      'ptsWorkoutCompleted.helper': 'Points for completing a workout',
      ptsStreak7Days: 'Weekly streak',
      'ptsStreak7Days.helper': 'Points for keeping a 7-day training streak',
      ptsStreak30Days: 'Monthly streak',
      'ptsStreak30Days.helper': 'Points for keeping a 30-day training streak',
      ptsDailyCheckin: 'Daily check-in',
      'ptsDailyCheckin.helper': 'Points for checking in at training',
      ptsEvolutionRecord: 'Evolution record',
      'ptsEvolutionRecord.helper': 'Points for recording body measurements',
      ptsWorkoutFeedback: 'Workout feedback',
      'ptsWorkoutFeedback.helper': 'Points for rating the completed workout',
      dailyPointsCap: 'Daily cap',
      'dailyPointsCap.helper': 'Maximum points per day (empty = no limit)',
      anonymousRanking: 'Anonymous ranking',
      'anonymousRanking.helper': 'Hide other participants\' names in the ranking',
    },
  },
};

export default en;
