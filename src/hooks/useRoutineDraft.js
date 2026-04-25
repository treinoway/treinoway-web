import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ROUTINE_DRAFT_KEY, ROUTINE_DRAFT_VERSION } from '../utils/routineDraft';

const DRAFT_KEY = ROUTINE_DRAFT_KEY;
const DRAFT_VERSION = ROUTINE_DRAFT_VERSION;
const DEBOUNCE_MS = 1500;
const LABEL_REFRESH_MS = 30000;

/**
 * useRoutineDraft
 *
 * Manages localStorage autosave for the RoutineBuilder in create mode.
 * Does nothing when enabled=false (edit mode or during initial load).
 *
 * @param {object} params
 * @param {boolean} params.enabled - Activates autosave + restore. False in edit mode or while loading.
 * @param {string} params.name - Current routine name (titleName).
 * @param {object|null} params.meta - Routine identity fields: { type, trainingLevel, defaultDurationWeeks, genderOrdination, description }.
 * @param {Array} params.trainings - Current trainings list (used to extract ids and weekDay overrides).
 * @param {Array} params.trainingTemplates - Available training templates (used to filter stale draft ids).
 * @param {string[]} params.createdTrainingIds - Session-created training template ids to persist.
 * @param {Array<{trainingId: string, junctionId: string}>} params.junctionsAddedToImported - Junction tracking for imported trainings.
 * @param {Function} params.onRestore - Called once on mount when a valid draft is found.
 *   Receives { name, meta, trainingIds, trainingOverrides, createdTrainingIds, junctionsAddedToImported }.
 *
 * @returns {{ lastSaved: string|null, clearDraft: Function }}
 */
const useRoutineDraft = ({
  enabled,
  name,
  meta,
  trainings,
  trainingTemplates,
  createdTrainingIds = [],
  junctionsAddedToImported = [],
  onRestore,
}) => {
  const [lastSaved, setLastSaved] = useState(null);
  // Tracks whether the one-time restore has run (or been skipped).
  const hasRestoredRef = useRef(false);
  // Always points to the latest computed payload for flush-on-unmount.
  const latestPayloadRef = useRef(null);
  // Tick counter to force label re-render every 30s.
  const [, setTick] = useState(0);

  // ── Restore on mount (runs once when enabled + trainingTemplates available) ──

  useEffect(() => {
    if (!enabled || hasRestoredRef.current) return;

    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) {
      hasRestoredRef.current = true;
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Malformed JSON — give up, don't try again.
      hasRestoredRef.current = true;
      return;
    }

    // Accept v2 or v3; everything else is dropped.
    if ((parsed.version !== 2 && parsed.version !== 3) || !parsed.data) {
      hasRestoredRef.current = true;
      return;
    }

    const draftIds = parsed.data.trainingIds || [];

    // If draft has trainingIds but trainingTemplates haven't loaded yet,
    // defer the restore. The effect re-runs when trainingTemplates changes.
    if (draftIds.length > 0 && trainingTemplates.length === 0) {
      return; // do NOT mark as restored — wait for next render
    }

    const validIds = draftIds.filter((id) =>
      trainingTemplates.some((t) => t.id === id)
    );

    // Filter createdTrainingIds to only those still in the library (validIds).
    const draftCreated = parsed.data.createdTrainingIds || [];
    const validCreatedIds = draftCreated.filter((id) => validIds.includes(id));

    // Filter junctions to those whose trainingId is still valid.
    // We keep the junctionId as-is — cleanup will attempt DELETE best-effort.
    const draftJunctions = parsed.data.junctionsAddedToImported || [];
    const validJunctions = draftJunctions.filter((j) => validIds.includes(j.trainingId));

    // Filter overrides to only those with valid training ids.
    const draftOverrides = parsed.data.trainingOverrides || {};
    const validOverrides = Object.fromEntries(
      Object.entries(draftOverrides).filter(([id]) => validIds.includes(id))
    );

    onRestore({
      name: parsed.data.name,
      meta: parsed.data.meta,
      trainingIds: validIds,
      trainingOverrides: validOverrides,
      createdTrainingIds: validCreatedIds,
      junctionsAddedToImported: validJunctions,
    });
    setLastSaved(parsed.savedAt || null);
    hasRestoredRef.current = true;
  }, [enabled, trainingTemplates, onRestore]);

  // ── Keep latestPayloadRef in sync with current inputs ────────────────────────

  const metaKey = JSON.stringify(meta);
  const createdKey = JSON.stringify(createdTrainingIds);
  const junctionsKey = JSON.stringify(junctionsAddedToImported);

  // Derive per-training weekDay overrides from the trainings list.
  const trainingOverrides = useMemo(() => {
    const overrides = {};
    trainings.forEach((t) => {
      if (t.weekDay) {
        overrides[t.id] = { weekDay: t.weekDay };
      }
    });
    return overrides;
  }, [trainings]);

  const overridesKey = JSON.stringify(trainingOverrides);

  useEffect(() => {
    latestPayloadRef.current = {
      name,
      meta,
      trainingIds: trainings.map((t) => t.id),
      trainingOverrides,
      createdTrainingIds,
      junctionsAddedToImported,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, metaKey, trainings, overridesKey, createdKey, junctionsKey]);

  // ── Autosave with debounce (only after restore has completed) ────────────────

  useEffect(() => {
    if (!enabled || !hasRestoredRef.current) return;

    const timer = setTimeout(() => {
      const payload = latestPayloadRef.current;
      if (!payload) return;
      const savedAt = new Date().toISOString();
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ version: DRAFT_VERSION, savedAt, data: payload })
        );
        setLastSaved(savedAt);
      } catch {
        // Storage quota exceeded or private browsing — fail silently.
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [enabled, name, metaKey, trainings, overridesKey, createdKey, junctionsKey]);

  // ── Flush to localStorage on unmount (catches sub-debounce navigations) ──────

  useEffect(() => {
    if (!enabled) return undefined;

    return () => {
      if (!hasRestoredRef.current) return;
      const payload = latestPayloadRef.current;
      if (!payload) return;

      const hasName = !!payload.name?.trim();
      const hasTrainings = payload.trainingIds.length > 0;
      const hasMeta =
        payload.meta &&
        Object.values(payload.meta).some((v) => v !== null && v !== '' && v !== undefined);

      if (!hasName && !hasTrainings && !hasMeta) return;

      try {
        const savedAt = new Date().toISOString();
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ version: DRAFT_VERSION, savedAt, data: payload })
        );
      } catch {
        // Ignore.
      }
    };
  }, [enabled]);

  // ── Periodic label refresh (every 30s while a saved timestamp exists) ────────

  useEffect(() => {
    if (!enabled || !lastSaved) return;

    const interval = setInterval(() => {
      setTick((n) => n + 1);
    }, LABEL_REFRESH_MS);

    return () => clearInterval(interval);
  }, [enabled, lastSaved]);

  // ── clearDraft ───────────────────────────────────────────────────────────────

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Ignore.
    }
    setLastSaved(null);
    latestPayloadRef.current = null;
  }, []);

  return { lastSaved, clearDraft };
};

export default useRoutineDraft;
