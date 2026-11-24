import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const STORAGE_KEY = 'treinoway:gamificationTrainerId';

const readStored = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
};

const writeStored = (value) => {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};

const trainerFullName = (t) => {
  const full = [t?.firstName, t?.lastName].filter(Boolean).join(' ');
  return full || t?.name || t?.email || 'Treinador';
};

/**
 * Resolves the list of trainers a student has from their protocols,
 * and persists the selected trainer across pages via localStorage.
 * Returns the trainer's userId (what backend gamification routes expect)
 * and profileId, the Trainer.id that championships carry as trainerId.
 */
const useTrainerContext = () => {
  const [trainers, setTrainers] = useState([]);
  const [trainerId, setTrainerIdState] = useState(readStored());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    api.get('/my/protocols')
      .then((r) => {
        if (!mounted) return;
        const protocols = r.data || [];
        const seen = new Set();
        const list = [];
        protocols.forEach((p) => {
          const t = p.trainer;
          if (!t) return;
          // Prefer userId — backend gamification endpoints expect trainer userId
          const id = t.userId || t.id;
          if (!id || seen.has(id)) return;
          seen.add(id);
          list.push({ id, profileId: p.trainerId ?? null, name: trainerFullName(t) });
        });
        setTrainers(list);
        setTrainerIdState((current) => {
          if (current && list.some((t) => t.id === current)) return current;
          const firstId = list[0]?.id || '';
          if (firstId) writeStored(firstId);
          return firstId;
        });
      })
      .catch((err) => { if (mounted) setError(err); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const setTrainerId = useCallback((value) => {
    setTrainerIdState(value);
    writeStored(value);
  }, []);

  return { trainers, trainerId, setTrainerId, loading, error };
};

export default useTrainerContext;
