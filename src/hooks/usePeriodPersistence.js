import { useCallback, useState } from 'react';
import {
  DASHBOARD_PERIOD_PRESETS,
  DEFAULT_DASHBOARD_PERIOD_KEY,
  buildPeriod,
} from '../constants/dashboardPeriod';

const STORAGE_KEY_PREFIX = 'treinoway.studentDashboard.period';

const VALID_PRESETS = new Set(Object.values(DASHBOARD_PERIOD_PRESETS));

const buildStorageKey = (trainerId) => `${STORAGE_KEY_PREFIX}.${trainerId ?? 'anon'}`;

const readStoredPeriod = (trainerId, now) => {
  try {
    const raw = localStorage.getItem(buildStorageKey(trainerId));
    if (!raw) return buildPeriod({ presetKey: DEFAULT_DASHBOARD_PERIOD_KEY, now });
    const parsed = JSON.parse(raw);
    if (!parsed || !VALID_PRESETS.has(parsed.presetKey)) {
      return buildPeriod({ presetKey: DEFAULT_DASHBOARD_PERIOD_KEY, now });
    }
    if (parsed.presetKey === DASHBOARD_PERIOD_PRESETS.CUSTOM) {
      if (!parsed.from || !parsed.to) {
        return buildPeriod({ presetKey: DEFAULT_DASHBOARD_PERIOD_KEY, now });
      }
      return { presetKey: parsed.presetKey, from: parsed.from, to: parsed.to };
    }
    // Recompute window from "now" to keep "Últimos 30 dias" accurate.
    return buildPeriod({ presetKey: parsed.presetKey, now });
  } catch {
    return buildPeriod({ presetKey: DEFAULT_DASHBOARD_PERIOD_KEY, now });
  }
};

/**
 * Persists the trainer's preferred student-dashboard period in localStorage.
 * Only the presetKey + custom range are stored — preset windows are recomputed
 * relative to "now" on every read so that "Últimos 30 dias" stays accurate.
 *
 * Scoped to trainer (NOT per student), per the refined design.
 *
 * @param {string} trainerId
 * @param {{ now?: Date, initialOverride?: { presetKey, from, to } }} [options]
 *   `initialOverride` lets pages seed the initial period from URL params (used by
 *   the exercise-detail drilldown, which gets dateFrom/dateTo through the URL so
 *   deep links and back-navigation work without router state).
 */
const usePeriodPersistence = (trainerId, { now, initialOverride } = {}) => {
  const [period, setPeriodState] = useState(() => initialOverride ?? readStoredPeriod(trainerId, now));

  const setPeriod = useCallback((next) => {
    setPeriodState(next);
    try {
      const payload = {
        presetKey: next.presetKey,
        from: next.presetKey === DASHBOARD_PERIOD_PRESETS.CUSTOM ? next.from : null,
        to: next.presetKey === DASHBOARD_PERIOD_PRESETS.CUSTOM ? next.to : null,
      };
      localStorage.setItem(buildStorageKey(trainerId), JSON.stringify(payload));
    } catch {
      // Storage quota/access denied — keep in-memory state.
    }
  }, [trainerId]);

  return [period, setPeriod];
};

export default usePeriodPersistence;
