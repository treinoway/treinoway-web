import api from '../api/axios';

export const ROUTINE_DRAFT_KEY = 'treinoway:routine-builder-draft';
export const ROUTINE_DRAFT_VERSION = 3;

/**
 * Reads the routine draft from localStorage.
 * Returns null if missing, malformed, or unsupported version.
 *
 * v1 drafts are silently dropped — they predate origin-tracking.
 * v2 drafts are forward-migrated in memory to v3 shape (trainingOverrides added as {}).
 * v3 is the current canonical format.
 *
 * @returns {{
 *   version: number,
 *   savedAt: string,
 *   data: {
 *     name: string,
 *     meta: object|null,
 *     trainingIds: string[],
 *     trainingOverrides: Record<string, { weekDay?: string }>,
 *     createdTrainingIds: string[],
 *     junctionsAddedToImported: Array<{ trainingId: string, junctionId: string }>
 *   }
 * } | null}
 */
export const getRoutineDraft = () => {
  try {
    const raw = localStorage.getItem(ROUTINE_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.data) return null;
    // Accept v2 or v3; drop everything else.
    if (parsed.version !== 2 && parsed.version !== 3) return null;
    // Forward-migrate v2 → v3 shape (in memory only).
    if (parsed.version === 2) {
      parsed.version = 3;
      parsed.data.trainingOverrides = parsed.data.trainingOverrides || {};
    } else if (!parsed.data.trainingOverrides) {
      parsed.data.trainingOverrides = {};
    }
    // Ensure arrays are always present even if draft was written without them.
    if (!Array.isArray(parsed.data.createdTrainingIds)) {
      parsed.data.createdTrainingIds = [];
    }
    if (!Array.isArray(parsed.data.junctionsAddedToImported)) {
      parsed.data.junctionsAddedToImported = [];
    }
    return parsed;
  } catch {
    return null;
  }
};

/**
 * Removes the routine draft from localStorage.
 */
export const clearRoutineDraft = () => {
  try {
    localStorage.removeItem(ROUTINE_DRAFT_KEY);
  } catch {
    // ignore — private browsing or quota issues
  }
};

/**
 * Best-effort cleanup of backend resources tracked in a draft.
 * Returns { successCount, failureCount, errors }.
 *
 * Order:
 * 1. DELETE junctions on imported trainings (don't touch their training-template).
 * 2. DELETE session-created trainings (cascade exercises server-side).
 *
 * Step 1 runs first. Junctions whose trainingId is already in createdTrainingIds
 * are skipped — the cascade from step 2 will remove them implicitly.
 *
 * Discard is best-effort: localStorage is always cleared by the caller even on
 * partial failures. The user is informed via toast if any items could not be removed.
 */
export const cleanupDraftResources = async (draft) => {
  if (!draft?.data) return { successCount: 0, failureCount: 0, errors: [] };

  const createdTrainingIds = draft.data.createdTrainingIds || [];
  const junctionsAddedToImported = draft.data.junctionsAddedToImported || [];
  const errors = [];
  let successCount = 0;
  let failureCount = 0;

  // Step 1: junctions on IMPORTED trainings — skip if training is session-created (cascade)
  const junctionsToDelete = junctionsAddedToImported.filter(
    (j) => !createdTrainingIds.includes(j.trainingId)
  );

  for (const { trainingId, junctionId } of junctionsToDelete) {
    try {
      await api.delete(`/trainer/training-templates/${trainingId}/exercises/${junctionId}`);
      successCount++;
    } catch (err) {
      failureCount++;
      errors.push(err);
    }
  }

  // Step 2: session-created trainings (cascade removes their exercises)
  for (const trainingId of createdTrainingIds) {
    try {
      await api.delete(`/trainer/training-templates/${trainingId}`);
      successCount++;
    } catch (err) {
      failureCount++;
      errors.push(err);
    }
  }

  return { successCount, failureCount, errors };
};
