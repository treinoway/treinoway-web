import { useCallback, useState } from 'react';
import api from '../api/axios';
import { t } from '../i18n';

/**
 * useBisetCreate — encapsulates the trainer-side "group selected exercises
 * into a bi-set" / dissolve flow via transactional backend endpoints.
 *
 * For protocol trainings (the common case) the hook calls:
 *   POST   /trainer/trainings/:trainingId/supersets   { exerciseIds }
 *   DELETE /trainer/trainings/:trainingId/supersets/:groupId
 *
 * Template support: pass `endpointBuilder` to override the URL construction
 * for template-context endpoints when that page is refactored.
 *
 * @param {object} [options]
 * @param {(trainingId: string) => ({ create: (ids: string[]) => Promise, dissolve: (groupId: string) => Promise })} [options.endpointBuilder]
 *   Override transport for non-standard contexts. The default wires the
 *   protocol endpoints. Template support is deferred.
 * @returns {{ createBiset, dissolveBiset, updateRest, saving, error }}
 */
const useBisetCreate = ({ endpointBuilder } = {}) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Create a new bi-set grouping from an ordered list of exercise IDs.
   *
   * @param {string[]} memberIds - Ordered list of exercise IDs (2–6)
   * @param {{ trainingId: string, restInterval?: number }} context
   * @returns {Promise<{ supersetGroupId: string, members: object[] }>}
   */
  const createBiset = useCallback(async (memberIds, { trainingId, restInterval } = {}) => {
    if (!Array.isArray(memberIds) || memberIds.length < 2) {
      const e = new Error(t('exerciseGroup.selectionInstruction'));
      setError(e);
      throw e;
    }
    if (memberIds.length > 6) {
      const e = new Error(t('exerciseGroup.selectionInstruction'));
      setError(e);
      throw e;
    }
    if (!trainingId) {
      const e = new Error('trainingId is required');
      setError(e);
      throw e;
    }

    setSaving(true);
    setError(null);

    try {
      let response;
      if (endpointBuilder) {
        response = await endpointBuilder(trainingId).create(memberIds);
      } else {
        response = await api.post(
          `/trainer/trainings/${trainingId}/supersets`,
          restInterval == null ? { exerciseIds: memberIds } : { exerciseIds: memberIds, restInterval },
        );
      }
      setSaving(false);
      return response.data;
    } catch (err) {
      setSaving(false);
      const wrapped = new Error(
        err.userMessage
          || t('exerciseGroup.bisetCreateFailed')
          || 'Não foi possível criar o bi-set. Tente novamente.',
      );
      wrapped.cause = err;
      setError(wrapped);
      throw wrapped;
    }
  }, [endpointBuilder]);

  /**
   * Dissolve an existing bi-set group.
   *
   * @param {string} groupId - The supersetGroupId to dissolve
   * @param {{ trainingId: string }} context
   * @returns {Promise<{ supersetGroupId: string, dissolvedCount: number }>}
   */
  const dissolveBiset = useCallback(async (groupId, { trainingId } = {}) => {
    if (!groupId) return;
    if (!trainingId) {
      const e = new Error('trainingId is required');
      setError(e);
      throw e;
    }

    setSaving(true);
    setError(null);

    try {
      let response;
      if (endpointBuilder) {
        response = await endpointBuilder(trainingId).dissolve(groupId);
      } else {
        response = await api.delete(
          `/trainer/trainings/${trainingId}/supersets/${groupId}`,
        );
      }
      setSaving(false);
      return response.data;
    } catch (err) {
      setSaving(false);
      const wrapped = new Error(
        err.userMessage || 'Não foi possível desfazer o bi-set. Tente novamente.',
      );
      wrapped.cause = err;
      setError(wrapped);
      throw wrapped;
    }
  }, [endpointBuilder]);

  const updateRest = useCallback(async (groupId, restInterval, { trainingId } = {}) => {
    if (!trainingId) {
      const e = new Error('trainingId is required');
      setError(e);
      throw e;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await api.patch(
        `/trainer/trainings/${trainingId}/supersets/${groupId}`,
        { restInterval },
      );
      setSaving(false);
      return response.data;
    } catch (err) {
      setSaving(false);
      const wrapped = new Error(
        err.userMessage || 'Não foi possível atualizar o descanso da rodada. Tente novamente.',
      );
      wrapped.cause = err;
      setError(wrapped);
      throw wrapped;
    }
  }, []);

  return { createBiset, dissolveBiset, updateRest, saving, error };
};

export default useBisetCreate;
