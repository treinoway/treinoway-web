import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from './axios';
import {
  listAdvancedTechniques,
  getAdvancedTechnique,
  createAdvancedTechnique,
  updateAdvancedTechnique,
  deleteAdvancedTechnique,
} from './advancedTechniques';

vi.mock('./axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

describe('api/advancedTechniques', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists with q/page/limit params and returns the envelope', async () => {
    const envelope = { data: [], total: 0, page: 1, limit: 20 };
    api.get.mockResolvedValue({ data: envelope });

    const result = await listAdvancedTechniques({ q: 'drop', page: 2, limit: 50 });

    expect(api.get).toHaveBeenCalledWith('/trainer/advanced-techniques', { params: { q: 'drop', page: 2, limit: 50 } });
    expect(result).toEqual(envelope);
  });

  it('omits empty params when listing', async () => {
    api.get.mockResolvedValue({ data: { data: [], total: 0 } });

    await listAdvancedTechniques();

    expect(api.get).toHaveBeenCalledWith('/trainer/advanced-techniques', { params: {} });
  });

  it('gets one technique and returns the item', async () => {
    api.get.mockResolvedValue({ data: { id: 't1' } });

    expect(await getAdvancedTechnique('t1')).toEqual({ id: 't1' });
    expect(api.get).toHaveBeenCalledWith('/trainer/advanced-techniques/t1');
  });

  it('creates with POST and returns the created item', async () => {
    api.post.mockResolvedValue({ data: { id: 't2', name: 'X' } });

    expect(await createAdvancedTechnique({ name: 'X', description: 'Y' })).toEqual({ id: 't2', name: 'X' });
    expect(api.post).toHaveBeenCalledWith('/trainer/advanced-techniques', { name: 'X', description: 'Y' });
  });

  it('updates with PATCH and deletes with DELETE', async () => {
    api.patch.mockResolvedValue({ data: { id: 't1', name: 'Z' } });
    api.delete.mockResolvedValue({ data: { id: 't1' } });

    expect(await updateAdvancedTechnique('t1', { name: 'Z' })).toEqual({ id: 't1', name: 'Z' });
    expect(api.patch).toHaveBeenCalledWith('/trainer/advanced-techniques/t1', { name: 'Z' });
    await deleteAdvancedTechnique('t1');
    expect(api.delete).toHaveBeenCalledWith('/trainer/advanced-techniques/t1');
  });
});
