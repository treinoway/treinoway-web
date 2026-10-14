import { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import api from '../api/axios';

export const ANAMNESIS_SOURCE_MODE = { STUDENT: 'student', TRAINER: 'trainer' };

const STATUS = { IDLE: 'idle', LOADING: 'loading', READY: 'ready', NOT_FOUND: 'notFound', ERROR: 'error' };
const EMPTY = { anamnesis: null, previousResponse: null, canFinalize: true, version: 0 };

const isNotFound = (error) => error?.response?.status === 404;

// The student response endpoint answers 404 when the student has not answered yet.
const loadStudentData = async ({ anamnesisId }) => {
  const [linksResult, responseResult] = await Promise.allSettled([
    api.get('/my/anamneses'),
    api.get(`/my/anamneses/${anamnesisId}/response`),
  ]);
  if (linksResult.status === 'rejected') throw linksResult.reason;
  const link = linksResult.value.data.find(
    (item) => item.anamnesisId === anamnesisId || item.anamnesis?.id === anamnesisId,
  );
  if (!link) return EMPTY;
  const base = { ...EMPTY, anamnesis: link.anamnesis };
  if (responseResult.status === 'fulfilled') return { ...base, previousResponse: responseResult.value.data };
  if (isNotFound(responseResult.reason)) return base;
  throw responseResult.reason;
};

const loadTrainerData = async ({ anamnesisId, studentId }) => {
  try {
    const { data } = await api.get(`/trainer/students/${studentId}/anamneses/${anamnesisId}/fill`, {
      params: { studentPresent: true },
    });
    return { anamnesis: data.anamnesis, previousResponse: data.response ?? null, canFinalize: data.canFinalize !== false };
  } catch (error) {
    if (isNotFound(error)) return EMPTY;
    throw error;
  }
};

const LOADERS = {
  [ANAMNESIS_SOURCE_MODE.STUDENT]: loadStudentData,
  [ANAMNESIS_SOURCE_MODE.TRAINER]: loadTrainerData,
};

const submitStudent = ({ anamnesisId }, payload) =>
  api.post(`/my/anamneses/${anamnesisId}/response`, payload);

const submitTrainer = ({ anamnesisId, studentId }, payload) =>
  api.post(`/trainer/students/${studentId}/anamneses/${anamnesisId}/response`, {
    ...payload,
    attestation: { studentPresent: true },
  });

const SUBMITTERS = {
  [ANAMNESIS_SOURCE_MODE.STUDENT]: submitStudent,
  [ANAMNESIS_SOURCE_MODE.TRAINER]: submitTrainer,
};

const saveDraftStudent = ({ anamnesisId }, answers) =>
  api.patch(`/my/anamneses/${anamnesisId}/response/draft`, { answers });

const saveDraftTrainer = ({ anamnesisId, studentId }, answers) =>
  api.patch(`/trainer/students/${studentId}/anamneses/${anamnesisId}/response/draft`, { answers });

// The trainer draft endpoint reopens a response the same trainer already saved, so
// only the student flow stops autosaving once submitted.
const AUTOSAVE_RULES = {
  [ANAMNESIS_SOURCE_MODE.STUDENT]: ({ canFinalize, previousResponse }) =>
    canFinalize && !previousResponse?.submittedAt,
  [ANAMNESIS_SOURCE_MODE.TRAINER]: ({ canFinalize }) => canFinalize,
};

const DRAFT_SAVERS = {
  [ANAMNESIS_SOURCE_MODE.STUDENT]: saveDraftStudent,
  [ANAMNESIS_SOURCE_MODE.TRAINER]: saveDraftTrainer,
};

/**
 * Loads an anamnesis plus the existing response for the wizard, either as the
 * student (own link) or as the trainer filling on the student's behalf.
 * `enabled` defers the request (the trainer flow waits for the presence gate).
 * `version` changes with every completed load so callers can remount on fresh data.
 * `canAutosave` is false when the caller cannot finalize the response and, for
 * the student, once it was submitted (the student draft endpoint answers 409).
 * The trainer keeps autosave on an already-saved response: the first edit
 * reopens it as a draft.
 */
const useAnamnesisResponseSource = ({ mode, anamnesisId, studentId, enabled = true }) => {
  const { showToast } = useToast();
  const [state, setState] = useState({ ...EMPTY, status: enabled ? STATUS.LOADING : STATUS.IDLE });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    const load = async () => {
      setState((prev) => ({ ...EMPTY, version: prev.version, status: STATUS.LOADING }));
      try {
        const data = await LOADERS[mode]({ anamnesisId, studentId });
        if (cancelled) return;
        const status = data.anamnesis ? STATUS.READY : STATUS.NOT_FOUND;
        setState((prev) => ({ ...data, version: prev.version + 1, status }));
      } catch (error) {
        if (cancelled) return;
        showToast(error.userMessage || translateError(error), 'error');
        setState((prev) => ({ ...EMPTY, version: prev.version, status: STATUS.ERROR }));
      }
    };
    load();
    return () => { cancelled = true; };
  }, [mode, anamnesisId, studentId, enabled, reloadKey, showToast]);

  return {
    ...state,
    reload: () => setReloadKey((key) => key + 1),
    canAutosave: AUTOSAVE_RULES[mode](state),
    submit: (payload) => SUBMITTERS[mode]({ anamnesisId, studentId }, payload),
    saveDraft: (answers) => DRAFT_SAVERS[mode]({ anamnesisId, studentId }, answers),
  };
};

export default useAnamnesisResponseSource;
