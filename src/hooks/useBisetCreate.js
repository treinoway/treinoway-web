import { useCallback, useState } from 'react';
import api from '../api/axios';
import { t } from '../i18n';

const defaultEndpointBuilder = (id) => `/trainer/exercises/${id}`;

/**
 * useBisetCreate — encapsulates the trainer-side "group selected exercises
 * into a bi-set" flow.
 *
 * IMPORTANT BACKEND LIMITATION
 * ----------------------------
 * The backend currently exposes NO transactional `POST /supersets`
 * endpoint. We must therefore call `PATCH /trainer/exercises/:id`
 * (or the configured per-context endpoint) sequentially for each member,
 * attaching a shared `supersetGroupId` (UUID generated client-side) plus
 * a consecutive `supersetOrder`.
 *
 * Failure handling (all-or-nothing semantics best we can):
 *   1. Walk the selection in order, PATCH each member.
 *   2. If a PATCH rejects mid-sequence, attempt to ROLL BACK every
 *      previously-mutated member by PATCH-ing it back to its
 *      pre-change state (`supersetGroupId: previousGroupId, supersetOrder: previousOrder`).
 *   3. If ANY rollback request also rejects, surface
 *      `exerciseGroup.bisetCreateInconsistent` ("Estado inconsistente —
 *      recarregue") so the trainer can refresh and recover deterministically.
 *      We surface this via the `inconsistent` flag on the resolved value
 *      (and reject the promise so callers can show the toast).
 *
 * TODO(backend): replace this client-side dance with a single transactional
 * `POST /trainer/trainings/:trainingId/supersets` endpoint that accepts
 * `{ exerciseIds: [uuid] }` and atomically writes `supersetGroupId` +
 * `supersetOrder` server-side. That removes the rollback failure mode entirely.
 *
 * @param {object} [options]
 * @param {(id: string) => string} [options.endpointBuilder] — Builds the PATCH
 *   URL per member id. Defaults to `/trainer/exercises/:id` (real exercises).
 *   For TrainingTemplate junctions pass
 *   `(id) => `/trainer/training-templates/${trainingId}/exercises/${id}``.
 * @returns {{ createBiset, dissolveBiset, saving, error }}
 */
const useBisetCreate = ({ endpointBuilder = defaultEndpointBuilder } = {}) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const createBiset = useCallback(async (selectedMembers) => {
    if (!Array.isArray(selectedMembers) || selectedMembers.length < 2) {
      const e = new Error(t('exerciseGroup.selectionInstruction'));
      setError(e);
      throw e;
    }
    if (selectedMembers.length > 6) {
      const e = new Error(t('exerciseGroup.selectionInstruction'));
      setError(e);
      throw e;
    }

    setSaving(true);
    setError(null);

    const groupId =
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : `biset-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Snapshot pre-change state per member so we can roll back faithfully.
    const snapshots = selectedMembers.map((m) => ({
      id: m.id,
      previousGroupId: m.supersetGroupId ?? null,
      previousOrder: m.supersetOrder ?? null,
    }));
    const applied = [];

    try {
      for (let i = 0; i < selectedMembers.length; i += 1) {
        const member = selectedMembers[i];
        await api.patch(endpointBuilder(member.id), {
          supersetGroupId: groupId,
          supersetOrder: i,
        });
        applied.push(member.id);
      }
      setSaving(false);
      return { groupId, members: selectedMembers };
    } catch (err) {
      // Roll back every PATCH we successfully applied (in reverse order).
      const rollbackFailures = [];
      for (let i = applied.length - 1; i >= 0; i -= 1) {
        const id = applied[i];
        const snap = snapshots.find((s) => s.id === id);
        try {
          await api.patch(endpointBuilder(id), {
            supersetGroupId: snap?.previousGroupId ?? null,
            supersetOrder: snap?.previousOrder ?? null,
          });
        } catch (rollbackErr) {
          rollbackFailures.push({ id, rollbackErr });
        }
      }
      setSaving(false);
      if (rollbackFailures.length > 0) {
        const fatal = new Error(
          t('exerciseGroup.bisetCreateInconsistent') || 'Estado inconsistente — recarregue.'
        );
        fatal.inconsistent = true;
        fatal.cause = err;
        fatal.rollbackFailures = rollbackFailures;
        setError(fatal);
        throw fatal;
      }
      const wrapped = new Error(
        err.userMessage
          || t('exerciseGroup.bisetCreateFailed')
          || 'Não foi possível criar o bi-set. Tente novamente.'
      );
      wrapped.cause = err;
      setError(wrapped);
      throw wrapped;
    }
  }, [endpointBuilder]);

  /**
   * dissolveBiset — sequential PATCH that clears `supersetGroupId` on each
   * exercise in a group. Same fragility caveat as createBiset; same TODO
   * applies (a transactional dissolve endpoint would remove the rollback path).
   */
  const dissolveBiset = useCallback(async (members) => {
    if (!Array.isArray(members) || members.length === 0) return;
    setSaving(true);
    setError(null);
    const snapshots = members.map((m) => ({
      id: m.id,
      previousGroupId: m.supersetGroupId ?? null,
      previousOrder: m.supersetOrder ?? null,
    }));
    const applied = [];
    try {
      for (const m of members) {
        await api.patch(endpointBuilder(m.id), {
          supersetGroupId: null,
          supersetOrder: null,
        });
        applied.push(m.id);
      }
      setSaving(false);
    } catch (err) {
      const rollbackFailures = [];
      for (let i = applied.length - 1; i >= 0; i -= 1) {
        const id = applied[i];
        const snap = snapshots.find((s) => s.id === id);
        try {
          await api.patch(endpointBuilder(id), {
            supersetGroupId: snap?.previousGroupId ?? null,
            supersetOrder: snap?.previousOrder ?? null,
          });
        } catch (rollbackErr) {
          rollbackFailures.push({ id, rollbackErr });
        }
      }
      setSaving(false);
      if (rollbackFailures.length > 0) {
        const fatal = new Error(
          t('exerciseGroup.bisetCreateInconsistent') || 'Estado inconsistente — recarregue.'
        );
        fatal.inconsistent = true;
        fatal.cause = err;
        setError(fatal);
        throw fatal;
      }
      const wrapped = new Error(
        err.userMessage || 'Não foi possível desfazer o bi-set. Tente novamente.'
      );
      wrapped.cause = err;
      setError(wrapped);
      throw wrapped;
    }
  }, [endpointBuilder]);

  return { createBiset, dissolveBiset, saving, error };
};

export default useBisetCreate;
