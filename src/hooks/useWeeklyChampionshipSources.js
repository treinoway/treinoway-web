import { useEffect, useState } from 'react';
import api from '../api/axios';
import { getDeviceTimezone } from '../utils/timezone';
import { CONFIG_DEFAULTS } from '../constants/consistencyRanking';

const CONFIG_URL = '/trainer/consistency-ranking/config';
const STUDENTS_URL = '/trainer/students';

// Ranking time zone and podium minimum of the trainer, plus the students to choose from; falls back to the device zone and the default minimum
const useWeeklyChampionshipSources = (enabled) => {
  const [sources, setSources] = useState({ timeZone: getDeviceTimezone() ?? undefined, minPodiumWeeks: CONFIG_DEFAULTS.minPodiumWeeks, students: [] });

  useEffect(() => {
    if (!enabled) return undefined;
    let mounted = true;
    api.get(CONFIG_URL)
      .then((response) => {
        if (!mounted || !response.data) return;
        const { timeZone, minPodiumWeeks } = response.data;
        setSources((current) => ({ ...current, timeZone: timeZone ?? current.timeZone, minPodiumWeeks: minPodiumWeeks ?? current.minPodiumWeeks }));
      })
      .catch(() => {});
    api.get(STUDENTS_URL)
      .then((response) => {
        if (mounted) setSources((current) => ({ ...current, students: response.data || [] }));
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [enabled]);

  return sources;
};

export default useWeeklyChampionshipSources;
