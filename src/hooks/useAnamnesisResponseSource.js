import { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import api from '../api/axios';

export const ANAMNESIS_SOURCE_MODE = { STUDENT: 'student', TRAINER: 'trainer' };

const STATUS = { IDLE: 'idle', LOADING: 'loading', READY: 'ready', NOT_FOUND: 'notFound', ERROR: 'error' };
const EMPTY = { anamnesis: null, previousResponse: null, canFinalize: true };

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

/**
 * Loads an anamnesis plus the existing response for the wizard, either as the
 * student (own link) or as the trainer filling on the student's behalf.
 * `enabled` defers the request (the trainer flow waits for the presence gate).
 */
const useAnamnesisResponseSource = ({ mode, anamnesisId, studentId, enabled = true }) => {
  const { showToast } = useToast();
  const [state, setState] = useState({ ...EMPTY, status: enabled ? STATUS.LOADING : STATUS.IDLE });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    const load = async () => {
      setState({ ...EMPTY, status: STATUS.LOADING });
      try {
        const data = await LOADERS[mode]({ anamnesisId, studentId });
        if (!cancelled) setState({ ...data, status: data.anamnesis ? STATUS.READY : STATUS.NOT_FOUND });
      } catch (error) {
        if (cancelled) return;
        showToast(error.userMessage || translateError(error), 'error');
        setState({ ...EMPTY, status: STATUS.ERROR });
      }
    };
    load();
    return () => { cancelled = true; };
  }, [mode, anamnesisId, studentId, enabled, reloadKey, showToast]);

  return {
    ...state,
    reload: () => setReloadKey((key) => key + 1),
    submit: (payload) => SUBMITTERS[mode]({ anamnesisId, studentId }, payload),
  };
};

export default useAnamnesisResponseSource;
