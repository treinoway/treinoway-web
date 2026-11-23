import { useEffect, useState } from 'react';
import api from '../api/axios';
import { getDeviceTimezone } from '../utils/timezone';
import { CONFIG_DEFAULTS } from '../constants/consistencyRanking';

const CONFIG_URL = '/trainer/consistency-ranking/config';
const STUDENTS_URL = '/trainer/students';

export const SCORING_SOURCE = Object.freeze({ RANKING: 'ranking', DEFAULT: 'default' });

const DEFAULT_SCORING = Object.freeze({
  weights: { ...CONFIG_DEFAULTS.weights },
  activePillars: [...CONFIG_DEFAULTS.activePillars],
  scoringSource: SCORING_SOURCE.DEFAULT,
});

// Sources after the ranking config loads: its time zone, podium minimum and scoring rule, keeping the current values it lacks
const withConfig = (current, config) => {
  const hasRule = Boolean(config.weights && config.activePillars);
  return {
    ...current,
    timeZone: config.timeZone ?? current.timeZone,
    minPodiumWeeks: config.minPodiumWeeks ?? current.minPodiumWeeks,
    weights: hasRule ? config.weights : current.weights,
    activePillars: hasRule ? config.activePillars : current.activePillars,
    scoringSource: hasRule ? SCORING_SOURCE.RANKING : SCORING_SOURCE.DEFAULT,
    configLoaded: true,
  };
};

// Ranking time zone, podium minimum and scoring rule of the trainer, plus (unless `withStudents` is false) the students to choose from; falls back to the device zone and the defaults
const useWeeklyChampionshipSources = (enabled, { withStudents = true } = {}) => {
  const [sources, setSources] = useState({
    timeZone: getDeviceTimezone() ?? undefined,
    minPodiumWeeks: CONFIG_DEFAULTS.minPodiumWeeks,
    ...DEFAULT_SCORING,
    configLoaded: false,
    students: [],
  });

  useEffect(() => {
    if (!enabled) return undefined;
    let mounted = true;
    api.get(CONFIG_URL)
      .then((response) => {
        if (mounted) setSources((current) => withConfig(current, response.data || {}));
      })
      .catch(() => {
        if (mounted) setSources((current) => ({ ...current, ...DEFAULT_SCORING, configLoaded: true }));
      });
    if (withStudents) {
      api.get(STUDENTS_URL)
        .then((response) => {
          if (mounted) setSources((current) => ({ ...current, students: response.data || [] }));
        })
        .catch(() => {});
    }
    return () => { mounted = false; };
  }, [enabled, withStudents]);

  return sources;
};

export default useWeeklyChampionshipSources;
