import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import useUnsavedChangesWarning from './useUnsavedChangesWarning';
import { DRAFT_SAVE_STATUS } from '../constants/anamnesis';
import { isAnswerEmpty } from '../utils/anamnesisAnswers';

export const DRAFT_DEBOUNCE_MS = 1500;
export const DRAFT_RETRY_DELAYS_MS = [2000, 5000, 10000];

const MAX_ANSWERS_PER_REQUEST = 300;
const HTTP_CONFLICT = 409;
const RETRYABLE_CLIENT_STATUSES = [408, 429];
const EMPTY_SERIALIZED = JSON.stringify(null);
const INITIAL_SAVE_STATE = { status: DRAFT_SAVE_STATUS.IDLE, savedAt: null };

// Cleared answers are sent as null; the draft endpoint treats null/""/[] as "clear".
const toDraftValue = (value) => (isAnswerEmpty(value) ? null : value);
const serialize = (value) => JSON.stringify(toDraftValue(value));

const snapshotOf = (answers) =>
  Object.fromEntries(Object.entries(answers).map(([questionId, value]) => [questionId, serialize(value)]));

const findDirtyIds = (answers, saved) => {
  const ids = new Set([...Object.keys(answers), ...Object.keys(saved)]);
  return [...ids].filter((id) => serialize(answers[id]) !== (saved[id] ?? EMPTY_SERIALIZED));
};

// Network failures, 5xx and throttling are worth retrying; other 4xx would fail again.
const isRetryable = (error) => {
  const status = error?.response?.status;
  return !status || status >= 500 || RETRYABLE_CLIENT_STATUSES.includes(status);
};

const parseSavedAt = (response) => {
  const raw = response?.data?.updatedAt;
  const parsed = raw ? new Date(raw) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const cancelRetry = (retry) => {
  clearTimeout(retry.timer);
  retry.timer = null;
};

/**
 * Autosaves the wizard answers as a draft. Only answers that differ from the
 * last successful save are sent, one request at a time (later edits ride the
 * next flush). Flushes on step change, 1.5 s after an answer change, when the
 * tab is hidden and on unmount (best effort, never retried); failures retry
 * with backoff without blocking the wizard. A 409 (already submitted) stops
 * autosave, toasts and calls `onConflict` so the caller can reload.
 *
 * While `enabled` is false nothing is sent and the unload warning falls back to
 * `hasChanges` (the full submit is then the only way to persist).
 * `prepareForSubmit()` flushes and pauses autosave so no PATCH lands after the
 * POST; call `resume()` when the submit fails.
 */
const useAnamnesisDraft = ({ enabled, answers, stepIndex, hasChanges, save, onConflict }) => {
  const { showToast } = useToast();
  const [saveState, setSaveState] = useState(INITIAL_SAVE_STATE);
  const [saved, setSaved] = useState(() => snapshotOf(answers));
  const savedRef = useRef(saved);
  const latest = useRef({ enabled, answers, save, onConflict, showToast });
  const control = useRef({ paused: false, stopped: false, unmounted: false });
  const chain = useRef(null);
  const retry = useRef({ timer: null, attempt: 0 });
  const flushRef = useRef(null);

  const hasDirty = enabled && findDirtyIds(answers, saved).length > 0;
  const hasUnsaved = hasDirty || saveState.status === DRAFT_SAVE_STATUS.SAVING;

  const saveOnce = useCallback(async (force = false) => {
    const current = latest.current;
    const state = control.current;
    if (!current.enabled || state.stopped || (state.paused && !force)) return true;

    cancelRetry(retry.current);
    const dirtyIds = findDirtyIds(current.answers, savedRef.current);
    if (dirtyIds.length === 0) {
      setSaveState((prev) =>
        prev.status === DRAFT_SAVE_STATUS.ERROR ? { ...prev, status: DRAFT_SAVE_STATUS.IDLE } : prev,
      );
      return true;
    }

    const batch = dirtyIds.slice(0, MAX_ANSWERS_PER_REQUEST).map((questionId) => ({
      questionId,
      value: toDraftValue(current.answers[questionId]),
    }));
    setSaveState((prev) => ({ ...prev, status: DRAFT_SAVE_STATUS.SAVING }));
    try {
      const response = await current.save(batch);
      const sent = batch.map(({ questionId, value }) => [questionId, JSON.stringify(value)]);
      savedRef.current = { ...savedRef.current, ...Object.fromEntries(sent) };
      setSaved(savedRef.current);
      retry.current.attempt = 0;
      setSaveState({ status: DRAFT_SAVE_STATUS.SAVED, savedAt: parseSavedAt(response) });
      return true;
    } catch (error) {
      if (error?.response?.status === HTTP_CONFLICT) {
        state.stopped = true;
        setSaveState(INITIAL_SAVE_STATE);
        current.showToast(error.userMessage || translateError(error), 'error');
        current.onConflict?.(error);
        return false;
      }
      setSaveState((prev) => ({ ...prev, status: DRAFT_SAVE_STATUS.ERROR }));
      if (isRetryable(error) && !state.unmounted) {
        const delays = DRAFT_RETRY_DELAYS_MS;
        const delay = delays[Math.min(retry.current.attempt, delays.length - 1)];
        retry.current.attempt += 1;
        retry.current.timer = setTimeout(() => {
          retry.current.timer = null;
          flushRef.current?.();
        }, delay);
      }
      return false;
    }
  }, []);

  // Serializes saves: a call made during a flight waits for it, then sends whatever is dirty.
  const enqueue = useCallback((force) => {
    const previous = chain.current ?? Promise.resolve(true);
    const next = previous.then(() => saveOnce(force)).catch(() => false);
    chain.current = next;
    next.then(() => {
      if (chain.current === next) chain.current = null;
    });
    return next;
  }, [saveOnce]);

  const flush = useCallback(() => enqueue(false), [enqueue]);

  const prepareForSubmit = useCallback(async () => {
    if (!latest.current.enabled) return true;
    control.current.paused = true;
    cancelRetry(retry.current);
    await enqueue(true);
    return !control.current.stopped;
  }, [enqueue]);

  const resume = useCallback(() => {
    control.current.paused = false;
    flush();
  }, [flush]);

  useEffect(() => {
    latest.current = { enabled, answers, save, onConflict, showToast };
    flushRef.current = flush;
  });

  useEffect(() => {
    if (!hasDirty) return undefined;
    const timer = setTimeout(flush, DRAFT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [hasDirty, answers, saved, flush]);

  const previousStep = useRef(stepIndex);
  useEffect(() => {
    if (previousStep.current === stepIndex) return;
    previousStep.current = stepIndex;
    flush();
  }, [stepIndex, flush]);

  useEffect(() => {
    if (!enabled) return undefined;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, flush]);

  useEffect(() => {
    const retryState = retry.current;
    const controlState = control.current;
    controlState.unmounted = false;
    return () => {
      controlState.unmounted = true;
      flush();
      cancelRetry(retryState);
    };
  }, [flush]);

  useUnsavedChangesWarning(enabled ? hasUnsaved : hasChanges);

  return { enabled, saveState, hasUnsaved, flush, prepareForSubmit, resume };
};

export default useAnamnesisDraft;
