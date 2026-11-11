import { useCallback, useEffect, useRef, useState } from 'react';
import { translateError } from '../i18n';

export const AUTOSAVE_DEBOUNCE_MS = 1500;
export const AUTOSAVE_STATUS = Object.freeze({ IDLE: 'idle', SAVING: 'saving', SAVED: 'saved', ERROR: 'error' });

const INITIAL_STATE = { status: AUTOSAVE_STATUS.IDLE, savedAt: null, reason: null };
const ERROR_PREFIX = 'Não foi possível salvar.';
const TIME_FORMAT = { hour: '2-digit', minute: '2-digit', hour12: false };

// Formats a Date as HH:MM in the user's locale.
const formatTime = (date) => date.toLocaleTimeString('pt-BR', TIME_FORMAT);

// Status line shown next to the form ('' while nothing happened yet).
const buildStatusText = ({ status, savedAt, reason }) => {
  if (status === AUTOSAVE_STATUS.SAVING) return 'Salvando…';
  if (status === AUTOSAVE_STATUS.SAVED) return `Salvo automaticamente às ${formatTime(savedAt)}`;
  if (status === AUTOSAVE_STATUS.ERROR) return `${ERROR_PREFIX} ${reason ? `${reason} ` : ''}As alterações continuam na tela.`;
  return '';
};

// Debounced autosave of one serializable value; flush()/retry() resolve true when nothing is left unsaved.
const usePlanAutosave = ({ value, save }) => {
  const [state, setState] = useState(INITIAL_STATE);
  const serialized = JSON.stringify(value);
  const savedRef = useRef(serialized);
  const latest = useRef({ value, serialized, save });
  const inFlight = useRef(null);
  const timer = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    latest.current = { value, serialized, save };
  });

  const saveLatest = useCallback(async () => {
    const { value: current, serialized: currentSerialized, save: send } = latest.current;
    if (currentSerialized === savedRef.current) return true;
    if (mounted.current) setState((prev) => ({ ...prev, status: AUTOSAVE_STATUS.SAVING }));
    try {
      await send(current);
      savedRef.current = currentSerialized;
      if (mounted.current) setState({ status: AUTOSAVE_STATUS.SAVED, savedAt: new Date(), reason: null });
      return true;
    } catch (error) {
      const reason = error?.userMessage || translateError(error);
      if (mounted.current) setState((prev) => ({ ...prev, status: AUTOSAVE_STATUS.ERROR, reason }));
      return false;
    }
  }, []);

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    const previous = inFlight.current ?? Promise.resolve();
    const next = previous.then(saveLatest);
    inFlight.current = next;
    next.then(() => {
      if (inFlight.current === next) inFlight.current = null;
    });
    return next;
  }, [saveLatest]);

  useEffect(() => {
    if (serialized === savedRef.current) return undefined;
    timer.current = setTimeout(flush, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer.current);
  }, [serialized, flush]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      flush();
    };
  }, [flush]);

  return { status: state.status, statusText: buildStatusText(state), savedAt: state.savedAt, retry: flush, flush };
};

export default usePlanAutosave;
