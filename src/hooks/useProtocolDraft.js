import { useState, useEffect, useRef, useCallback } from 'react';
import { getProtocolDraftKey, PROTOCOL_DRAFT_VERSION } from '../utils/protocolDraft';

const DEBOUNCE_MS = 1500;
const LABEL_REFRESH_MS = 30000;

/**
 * useProtocolDraft
 *
 * Manages localStorage autosave for the RoutineBuilder in protocol CREATE
 * mode (a trainer building a new routine for a student). Protects against
 * the trainer losing in-memory work on a failed save or an accidental
 * reload/navigation — protocol create mode is fully deferred (nothing is
 * persisted server-side until the final POST), so without this the only
 * copy of the work lives in React state.
 *
 * Unlike useRoutineDraft (template mode, which only needs to persist
 * training-template ids because imported trainings are re-hydrated from the
 * library), protocol trainings are local-only objects — many created from
 * scratch, with inline-edited exercises and temp ids (`tmp_...`) — so the
 * FULL trainings array (including nested exercises) is persisted verbatim
 * and restored directly into hook state via useProtocolBuilder's
 * hydrateFromDraft.
 *
 * The draft key is scoped per studentId (see utils/protocolDraft.js) so
 * drafts for different students never mix.
 *
 * Does nothing when enabled=false (edit/view mode, template mode, no
 * studentId, or while the initial protocol data is still loading).
 *
 * @param {object} params
 * @param {boolean} params.enabled - Activates autosave + restore.
 * @param {string|null} params.studentId - Student (assignee) id. Draft is a no-op without one.
 * @param {string} params.name - Current routine name (titleName).
 * @param {object|null} params.meta - Protocol identity fields: { type, trainingLevel, genderOrdination, description, startDate, expirationDate, assigneeId }.
 * @param {Array} params.trainings - Current trainings list (full local objects, incl. nested exercises).
 * @param {Function} params.onRestore - Called once on mount when a valid draft is found.
 *   Receives { name, meta, trainings }.
 *
 * @returns {{ lastSaved: string|null, clearDraft: Function }}
 */
const useProtocolDraft = ({ enabled, studentId, name, meta, trainings, onRestore }) => {
  const [lastSaved, setLastSaved] = useState(null);
  const hasRestoredRef = useRef(false);
  const latestPayloadRef = useRef(null);
  const lastSavedTrainingsKeyRef = useRef(null);
  const [, setTick] = useState(0);

  // Reset the restore-guard when the target student changes, so navigating
  // between two students' "new routine" flows without a full remount still
  // restores the correct (or no) draft for the newly selected student.
  useEffect(() => {
    hasRestoredRef.current = false;
    lastSavedTrainingsKeyRef.current = null;
  }, [studentId]);

  // ── Restore on mount (runs once when enabled + studentId available) ──────

  useEffect(() => {
    if (!enabled || !studentId || hasRestoredRef.current) return;

    let parsed;
    try {
      const raw = localStorage.getItem(getProtocolDraftKey(studentId));
      if (!raw) {
        hasRestoredRef.current = true;
        return;
      }
      parsed = JSON.parse(raw);
    } catch {
      hasRestoredRef.current = true;
      return;
    }

    if (parsed.version !== PROTOCOL_DRAFT_VERSION || !parsed.data) {
      hasRestoredRef.current = true;
      return;
    }

    onRestore({
      name: parsed.data.name,
      meta: parsed.data.meta,
      trainings: parsed.data.trainings || [],
    });
    setLastSaved(parsed.savedAt || null);
    hasRestoredRef.current = true;
  }, [enabled, studentId, onRestore]);

  // ── Keep latestPayloadRef in sync with current inputs ─────────────────────

  const metaKey = JSON.stringify(meta);
  const trainingsKey = JSON.stringify(trainings);

  useEffect(() => {
    latestPayloadRef.current = { name, meta, trainings };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, metaKey, trainingsKey]);

  // ── Autosave: immediate on trainings changes, debounced for name/meta ─────

  useEffect(() => {
    if (!enabled || !studentId || !hasRestoredRef.current) return;

    const payload = latestPayloadRef.current;
    if (!payload) return;

    const isStructuralChange = trainingsKey !== lastSavedTrainingsKeyRef.current;

    const persist = () => {
      const p = latestPayloadRef.current;
      if (!p) return;
      const savedAt = new Date().toISOString();
      try {
        localStorage.setItem(
          getProtocolDraftKey(studentId),
          JSON.stringify({ version: PROTOCOL_DRAFT_VERSION, savedAt, studentId, data: p })
        );
        lastSavedTrainingsKeyRef.current = trainingsKey;
        setLastSaved(savedAt);
      } catch {
        // Storage quota exceeded or private browsing — fail silently.
      }
    };

    if (isStructuralChange) {
      persist();
      return;
    }

    const timer = setTimeout(persist, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [enabled, studentId, name, metaKey, trainingsKey]);

  // ── Flush to localStorage on unmount (catches sub-debounce navigations) ───

  useEffect(() => {
    if (!enabled || !studentId) return undefined;

    return () => {
      if (!hasRestoredRef.current) return;
      const payload = latestPayloadRef.current;
      if (!payload) return;

      const hasName = !!payload.name?.trim();
      const hasTrainings = payload.trainings.length > 0;
      const hasMeta =
        payload.meta &&
        Object.values(payload.meta).some((v) => v !== null && v !== '' && v !== undefined);

      if (!hasName && !hasTrainings && !hasMeta) return;

      try {
        const savedAt = new Date().toISOString();
        localStorage.setItem(
          getProtocolDraftKey(studentId),
          JSON.stringify({ version: PROTOCOL_DRAFT_VERSION, savedAt, studentId, data: payload })
        );
      } catch {
        // Ignore.
      }
    };
  }, [enabled, studentId]);

  // ── Synchronous flush on hard browser close (beforeunload) ────────────────

  useEffect(() => {
    if (!enabled || !studentId) return;

    const handleBeforeUnload = () => {
      if (!hasRestoredRef.current) return;
      const payload = latestPayloadRef.current;
      if (!payload) return;

      const hasName = !!payload.name?.trim();
      const hasTrainings = payload.trainings.length > 0;
      const hasMeta =
        payload.meta &&
        Object.values(payload.meta).some((v) => v !== null && v !== '' && v !== undefined);

      if (!hasName && !hasTrainings && !hasMeta) return;

      try {
        const savedAt = new Date().toISOString();
        localStorage.setItem(
          getProtocolDraftKey(studentId),
          JSON.stringify({ version: PROTOCOL_DRAFT_VERSION, savedAt, studentId, data: payload })
        );
      } catch {
        // Ignore — private browsing or quota exhausted.
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled, studentId]);

  // ── Periodic label refresh (every 30s while a saved timestamp exists) ─────

  useEffect(() => {
    if (!enabled || !lastSaved) return;

    const interval = setInterval(() => {
      setTick((n) => n + 1);
    }, LABEL_REFRESH_MS);

    return () => clearInterval(interval);
  }, [enabled, lastSaved]);

  // ── clearDraft ──────────────────────────────────────────────────────────

  const clearDraft = useCallback(() => {
    if (!studentId) return;
    try {
      localStorage.removeItem(getProtocolDraftKey(studentId));
    } catch {
      // Ignore.
    }
    setLastSaved(null);
    latestPayloadRef.current = null;
  }, [studentId]);

  return { lastSaved, clearDraft };
};

export default useProtocolDraft;
