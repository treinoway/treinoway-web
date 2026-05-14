import { useState, useEffect, useCallback, useMemo } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';
import buildExerciseRenderEntries from '../utils/exerciseRenderEntries';

/**
 * Manages optimistic reordering of exercise render-entries within a training.
 *
 * Drag unit = a render entry (a single exercise OR an entire bi-set block).
 * The hook:
 *   1. Derives render entries from `exercises` via buildExerciseRenderEntries.
 *   2. On dragEnd: reorders entries optimistically, flattens back to exercises
 *      (keeping bi-set members contiguous), fires
 *      PATCH /trainer/trainings/:trainingId/exercises/order.
 *   3. Rolls back local state and shows an error toast on failure.
 *   4. Resets local state whenever the canonical `exercises` prop changes
 *      (e.g. after a refetch from the parent).
 *
 * @param {object}   params
 * @param {string}   params.trainingId        - Training UUID.
 * @param {object[]} params.exercises         - Canonical flat exercise array.
 * @param {boolean}  params.readOnly          - When true, all drag handlers are no-ops.
 * @param {Function} [params.onRefetchTraining] - Called after a successful PATCH.
 *
 * @returns {{
 *   localExercises: object[],
 *   localEntries:   Array,
 *   entryIds:       string[],
 *   activeEntry:    object|null,
 *   handleDragStart: Function,
 *   handleDragEnd:   Function,
 *   handleDragCancel:Function,
 * }}
 */
const useExerciseReorder = ({ trainingId, exercises, readOnly, onRefetchTraining }) => {
  const { showToast } = useToast();

  // localExercises shadows training.exercises during a drag.
  // Resets whenever the canonical prop changes (e.g. after server refetch).
  const [localExercises, setLocalExercises] = useState(exercises);
  const [activeEntry, setActiveEntry] = useState(null);

  useEffect(() => {
    setLocalExercises(exercises);
  }, [exercises]);

  const localEntries = useMemo(
    () => buildExerciseRenderEntries(localExercises),
    [localExercises]
  );

  // One stable id per drag unit.
  // Single exercise → ex.id ; Bi-set group → first member's id.
  const entryIds = useMemo(
    () => localEntries.map((e) => (e.kind === 'single' ? e.ex.id : e.members[0].id)),
    [localEntries]
  );

  const handleDragStart = useCallback(
    ({ active }) => {
      if (readOnly) return;
      const entry = localEntries.find(
        (e) => (e.kind === 'single' ? e.ex.id : e.members[0].id) === active.id
      );
      setActiveEntry(entry ?? null);
    },
    [localEntries, readOnly]
  );

  const handleDragEnd = useCallback(
    async ({ active, over }) => {
      setActiveEntry(null);
      if (readOnly || !over || active.id === over.id) return;

      const fromIdx = entryIds.indexOf(active.id);
      const toIdx = entryIds.indexOf(over.id);
      if (fromIdx === -1 || toIdx === -1) return;

      // Reorder entries, then flatten — bi-set members stay contiguous.
      const reorderedEntries = arrayMove(localEntries, fromIdx, toIdx);
      const reorderedExercises = reorderedEntries.flatMap((entry) =>
        entry.kind === 'single' ? [entry.ex] : entry.members
      );

      // Optimistic update.
      const previousExercises = localExercises;
      setLocalExercises(reorderedExercises);

      // Build the payload: non-substitute IDs in the new order.
      // Substitute exercises are children of a principal and are excluded
      // from the order endpoint (the backend enforces this).
      const exerciseIds = reorderedExercises
        .filter((ex) => !ex.isSubstitute)
        .map((ex) => ex.id);

      try {
        await api.patch(`/trainer/trainings/${trainingId}/exercises/order`, {
          exerciseIds,
        });
        if (onRefetchTraining) await onRefetchTraining();
      } catch (err) {
        // Rollback on failure.
        setLocalExercises(previousExercises);
        showToast(
          err.userMessage || 'Não foi possível reordenar os exercícios.',
          'error'
        );
      }
    },
    [
      readOnly,
      entryIds,
      localEntries,
      localExercises,
      trainingId,
      onRefetchTraining,
      showToast,
    ]
  );

  const handleDragCancel = useCallback(() => {
    setActiveEntry(null);
  }, []);

  return {
    localExercises,
    localEntries,
    entryIds,
    activeEntry,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  };
};

export default useExerciseReorder;
