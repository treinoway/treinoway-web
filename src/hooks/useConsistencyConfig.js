import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { translateError } from '../i18n';
import { CONFIG_DEFAULTS, WEIGHT_TOTAL } from '../constants/consistencyRanking';

const CONFIG_URL = '/trainer/consistency-ranking/config';

// Sum of the weights of all five pillars, the figure the service validates against 100
const sumWeights = (weights) => Object.values(weights).reduce((total, weight) => total + weight, 0);

// Fields of the draft whose value differs from the saved configuration
const changedFields = (draft, saved) =>
  Object.fromEntries(Object.entries(draft).filter(([field, value]) => JSON.stringify(value) !== JSON.stringify(saved[field])));

// Ranking configuration: local draft, weight sum check, defaults restore, unsaved-change flag and save of only the changed fields
const useConsistencyConfig = () => {
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(CONFIG_URL);
      setSaved(response.data);
      setDraft(response.data);
    } catch (err) {
      setError(err.userMessage || translateError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setField = useCallback((field, value) => setDraft((current) => ({ ...current, [field]: value })), []);

  const setWeight = useCallback(
    (pillar, value) => setDraft((current) => ({ ...current, weights: { ...current.weights, [pillar]: value } })),
    [],
  );

  const setPillarActive = useCallback(
    (pillar, active) =>
      setDraft((current) => {
        const others = current.activePillars.filter((item) => item !== pillar);
        return { ...current, activePillars: active ? [...others, pillar] : others };
      }),
    [],
  );

  const restoreDefaults = useCallback(() => setDraft((current) => ({ ...current, ...CONFIG_DEFAULTS })), []);

  const weightSum = draft ? sumWeights(draft.weights) : 0;
  const isDirty = useMemo(() => Boolean(draft) && Object.keys(changedFields(draft, saved)).length > 0, [draft, saved]);
  const canSave = isDirty && weightSum === WEIGHT_TOTAL && !saving;

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const response = await api.put(CONFIG_URL, changedFields(draft, saved));
      setSaved(draft);
      setEffectiveFrom(response.data.effectiveFrom ?? null);
      return response.data;
    } finally {
      setSaving(false);
    }
  }, [draft, saved]);

  return { config: draft, loading, error, saving, weightSum, isDirty, canSave, effectiveFrom, setField, setWeight, setPillarActive, restoreDefaults, save, reload: load };
};

export default useConsistencyConfig;
