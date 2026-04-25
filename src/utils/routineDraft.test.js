import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ROUTINE_DRAFT_KEY,
  ROUTINE_DRAFT_VERSION,
  getRoutineDraft,
  clearRoutineDraft,
  cleanupDraftResources,
} from './routineDraft';

vi.mock('../api/axios', () => ({
  default: { delete: vi.fn() },
}));

import api from '../api/axios';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_DRAFT_V3 = {
  version: 3,
  savedAt: '2024-01-15T10:30:00.000Z',
  data: {
    name: 'Minha Rotina',
    meta: { type: 'strength', trainingLevel: 'intermediate' },
    trainingIds: ['t1', 't2'],
    trainingOverrides: { t2: { weekDay: 'monday' } },
    createdTrainingIds: ['t1'],
    junctionsAddedToImported: [{ trainingId: 't2', junctionId: 'j1' }],
  },
};

const VALID_DRAFT_V2 = {
  version: 2,
  savedAt: '2024-01-15T10:30:00.000Z',
  data: {
    name: 'Minha Rotina',
    meta: { type: 'strength', trainingLevel: 'intermediate' },
    trainingIds: ['t1', 't2'],
    createdTrainingIds: ['t1'],
    junctionsAddedToImported: [{ trainingId: 't2', junctionId: 'j1' }],
  },
};

describe('routineDraft utils', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ── getRoutineDraft ──────────────────────────────────────────────────────

  describe('getRoutineDraft', () => {
    it('returns null when localStorage is empty', () => {
      expect(getRoutineDraft()).toBeNull();
    });

    it('returns null when JSON is malformed', () => {
      localStorage.setItem(ROUTINE_DRAFT_KEY, '{not valid json}');
      expect(getRoutineDraft()).toBeNull();
    });

    it('returns null when version is v1 (silently dropped)', () => {
      localStorage.setItem(
        ROUTINE_DRAFT_KEY,
        JSON.stringify({ version: 1, savedAt: '2024-01-01T00:00:00Z', data: { name: 'Old', meta: {}, trainingIds: [] } }),
      );
      expect(getRoutineDraft()).toBeNull();
    });

    it('returns null for any unsupported version (e.g. 99)', () => {
      localStorage.setItem(
        ROUTINE_DRAFT_KEY,
        JSON.stringify({ ...VALID_DRAFT_V3, version: 99 }),
      );
      expect(getRoutineDraft()).toBeNull();
    });

    it('returns null when data field is missing', () => {
      localStorage.setItem(
        ROUTINE_DRAFT_KEY,
        JSON.stringify({ version: ROUTINE_DRAFT_VERSION, savedAt: '2024-01-01T00:00:00Z' }),
      );
      expect(getRoutineDraft()).toBeNull();
    });

    it('parses a valid v3 draft correctly', () => {
      localStorage.setItem(ROUTINE_DRAFT_KEY, JSON.stringify(VALID_DRAFT_V3));
      const result = getRoutineDraft();
      expect(result).not.toBeNull();
      expect(result.version).toBe(3);
      expect(result.data.name).toBe('Minha Rotina');
      expect(result.data.trainingIds).toEqual(['t1', 't2']);
      expect(result.data.trainingOverrides).toEqual({ t2: { weekDay: 'monday' } });
      expect(result.data.createdTrainingIds).toEqual(['t1']);
      expect(result.data.junctionsAddedToImported).toEqual([{ trainingId: 't2', junctionId: 'j1' }]);
      expect(result.savedAt).toBe('2024-01-15T10:30:00.000Z');
    });

    it('forward-migrates v2 draft to v3 in memory (trainingOverrides added as {})', () => {
      localStorage.setItem(ROUTINE_DRAFT_KEY, JSON.stringify(VALID_DRAFT_V2));
      const result = getRoutineDraft();
      expect(result).not.toBeNull();
      expect(result.version).toBe(3);
      expect(result.data.trainingOverrides).toEqual({});
      expect(result.data.name).toBe('Minha Rotina');
      expect(result.data.trainingIds).toEqual(['t1', 't2']);
      expect(result.data.createdTrainingIds).toEqual(['t1']);
    });

    it('v2 migration does not write back to localStorage', () => {
      localStorage.setItem(ROUTINE_DRAFT_KEY, JSON.stringify(VALID_DRAFT_V2));
      getRoutineDraft();
      const stored = JSON.parse(localStorage.getItem(ROUTINE_DRAFT_KEY));
      // Original v2 must still be in storage
      expect(stored.version).toBe(2);
    });

    it('defaults trainingOverrides to {} when absent in v3 draft', () => {
      const draftWithoutOverrides = {
        version: 3,
        savedAt: '2024-01-15T10:30:00.000Z',
        data: { name: 'X', meta: {}, trainingIds: ['t1'], createdTrainingIds: [], junctionsAddedToImported: [] },
      };
      localStorage.setItem(ROUTINE_DRAFT_KEY, JSON.stringify(draftWithoutOverrides));
      const result = getRoutineDraft();
      expect(result.data.trainingOverrides).toEqual({});
    });

    it('defaults createdTrainingIds to [] when absent in stored data', () => {
      const draftWithoutTracking = {
        version: 3,
        savedAt: '2024-01-15T10:30:00.000Z',
        data: { name: 'X', meta: {}, trainingIds: ['t1'], trainingOverrides: {} },
      };
      localStorage.setItem(ROUTINE_DRAFT_KEY, JSON.stringify(draftWithoutTracking));
      const result = getRoutineDraft();
      expect(result.data.createdTrainingIds).toEqual([]);
      expect(result.data.junctionsAddedToImported).toEqual([]);
    });
  });

  // ── clearRoutineDraft ────────────────────────────────────────────────────

  describe('clearRoutineDraft', () => {
    it('removes the draft key from localStorage', () => {
      localStorage.setItem(ROUTINE_DRAFT_KEY, JSON.stringify(VALID_DRAFT_V3));
      expect(localStorage.getItem(ROUTINE_DRAFT_KEY)).not.toBeNull();

      clearRoutineDraft();

      expect(localStorage.getItem(ROUTINE_DRAFT_KEY)).toBeNull();
    });

    it('does not throw when key does not exist', () => {
      expect(() => clearRoutineDraft()).not.toThrow();
    });
  });

  // ── cleanupDraftResources ────────────────────────────────────────────────

  describe('cleanupDraftResources', () => {
    beforeEach(() => {
      api.delete.mockResolvedValue({});
    });

    it('returns {0, 0, []} for null draft', async () => {
      const result = await cleanupDraftResources(null);
      expect(result).toEqual({ successCount: 0, failureCount: 0, errors: [] });
    });

    it('returns {0, 0, []} for draft without data', async () => {
      const result = await cleanupDraftResources({});
      expect(result).toEqual({ successCount: 0, failureCount: 0, errors: [] });
    });

    it('returns {0, 0, []} for empty arrays', async () => {
      const result = await cleanupDraftResources({
        data: { createdTrainingIds: [], junctionsAddedToImported: [] },
      });
      expect(result).toEqual({ successCount: 0, failureCount: 0, errors: [] });
    });

    it('DELETEs junctions on imported trainings (step 1)', async () => {
      await cleanupDraftResources({
        data: {
          createdTrainingIds: [],
          junctionsAddedToImported: [
            { trainingId: 'imported-t1', junctionId: 'j1' },
            { trainingId: 'imported-t2', junctionId: 'j2' },
          ],
        },
      });

      expect(api.delete).toHaveBeenCalledWith('/trainer/training-templates/imported-t1/exercises/j1');
      expect(api.delete).toHaveBeenCalledWith('/trainer/training-templates/imported-t2/exercises/j2');
    });

    it('DELETEs session-created trainings (step 2)', async () => {
      await cleanupDraftResources({
        data: {
          createdTrainingIds: ['tx', 'ty'],
          junctionsAddedToImported: [],
        },
      });

      expect(api.delete).toHaveBeenCalledWith('/trainer/training-templates/tx');
      expect(api.delete).toHaveBeenCalledWith('/trainer/training-templates/ty');
    });

    it('skips junctions whose trainingId is in createdTrainingIds (cascade handles them)', async () => {
      await cleanupDraftResources({
        data: {
          createdTrainingIds: ['session-t1'],
          junctionsAddedToImported: [
            // This junction's training is session-created — must NOT be explicitly deleted.
            { trainingId: 'session-t1', junctionId: 'j-cascade' },
            // This one is on an imported training — must be deleted.
            { trainingId: 'imported-t2', junctionId: 'j-real' },
          ],
        },
      });

      expect(api.delete).not.toHaveBeenCalledWith(
        '/trainer/training-templates/session-t1/exercises/j-cascade'
      );
      expect(api.delete).toHaveBeenCalledWith(
        '/trainer/training-templates/imported-t2/exercises/j-real'
      );
      expect(api.delete).toHaveBeenCalledWith('/trainer/training-templates/session-t1');
    });

    it('returns correct successCount and failureCount on partial failures', async () => {
      const err = new Error('Server error');
      api.delete
        .mockResolvedValueOnce({})   // junction j1 — success
        .mockRejectedValueOnce(err)  // training tx — fail
        .mockResolvedValueOnce({});  // training ty — success

      const result = await cleanupDraftResources({
        data: {
          createdTrainingIds: ['tx', 'ty'],
          junctionsAddedToImported: [{ trainingId: 'imported-t', junctionId: 'j1' }],
        },
      });

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe(err);
    });

    it('continues through all items even when some fail', async () => {
      api.delete.mockRejectedValue(new Error('fail'));

      const result = await cleanupDraftResources({
        data: {
          createdTrainingIds: ['t1', 't2'],
          junctionsAddedToImported: [{ trainingId: 'imported', junctionId: 'j1' }],
        },
      });

      // j1 (imported) + t1 + t2 = 3 attempts, all fail
      expect(result.failureCount).toBe(3);
      expect(result.successCount).toBe(0);
      expect(api.delete).toHaveBeenCalledTimes(3);
    });
  });
});
