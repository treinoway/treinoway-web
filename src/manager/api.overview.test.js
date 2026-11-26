import api from '../api/axios';
import { getOverview, getPending } from './api';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
}));

describe('manager api: overview and pending', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('getOverview calls /admin/manager/overview with the period param and returns data', async () => {
    const overview = { period: '7d' };
    api.get.mockResolvedValue({ data: overview });

    const result = await getOverview({ period: '7d' });

    expect(api.get).toHaveBeenCalledWith('/admin/manager/overview', { params: { period: '7d' } });
    expect(result).toBe(overview);
  });

  it('getPending calls /admin/manager/pending and returns data', async () => {
    const pending = { pendingInvites: 4, newFeedbacks: 2 };
    api.get.mockResolvedValue({ data: pending });

    const result = await getPending();

    expect(api.get.mock.calls[0][0]).toBe('/admin/manager/pending');
    expect(result).toBe(pending);
  });

  it('getOverview propagates request failures', async () => {
    api.get.mockRejectedValue({ userMessage: 'Falhou' });

    await expect(getOverview({ period: '30d' })).rejects.toEqual({ userMessage: 'Falhou' });
  });
});
