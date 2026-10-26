import api from './axios';
import {
  listTrainers,
  changeTrainerPlan,
  getAiUsage,
  listTrainerInvites,
  createTrainerInvite,
  revokeTrainerInvite,
} from './admin';

vi.mock('./axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('admin api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listTrainers gets /admin/trainers with search and pagination params', async () => {
    const body = { items: [], total: 0, page: 2, pageSize: 20 };
    api.get.mockResolvedValue({ data: body });

    const result = await listTrainers({ search: 'ana', page: 2, pageSize: 20 });

    expect(api.get).toHaveBeenCalledWith('/admin/trainers', {
      params: { search: 'ana', page: 2, pageSize: 20 },
    });
    expect(result).toEqual(body);
  });

  it('changeTrainerPlan patches the trainer platform plan with the tier', async () => {
    const body = { trainerId: 't1', previousTier: 'FREE', tier: 'PRO', changed: true };
    api.patch.mockResolvedValue({ data: body });

    const result = await changeTrainerPlan('t1', 'PRO');

    expect(api.patch).toHaveBeenCalledWith('/admin/trainers/t1/platform-plan', { tier: 'PRO' });
    expect(result).toEqual(body);
  });

  it('getAiUsage gets /admin/ai-usage with the month param', async () => {
    const body = { month: '2026-10', totals: {}, trainers: [] };
    api.get.mockResolvedValue({ data: body });

    const result = await getAiUsage('2026-10');

    expect(api.get).toHaveBeenCalledWith('/admin/ai-usage', { params: { month: '2026-10' } });
    expect(result).toEqual(body);
  });

  it('listTrainerInvites gets /admin/trainer-invites with a query string', async () => {
    const body = { items: [], total: 0, page: 1, pageSize: 20 };
    api.get.mockResolvedValue({ data: body });

    const result = await listTrainerInvites({ status: 'pending', email: 'ana', page: 1, pageSize: 20 });

    const url = api.get.mock.calls[0][0];
    expect(url.startsWith('/admin/trainer-invites?')).toBe(true);
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('status')).toBe('pending');
    expect(params.get('email')).toBe('ana');
    expect(params.get('page')).toBe('1');
    expect(params.get('pageSize')).toBe('20');
    expect(result).toEqual(body);
  });

  it('createTrainerInvite posts the email', async () => {
    const body = { invite: { id: 'i1' }, code: 'TF-1' };
    api.post.mockResolvedValue({ data: body });

    const result = await createTrainerInvite('novo@example.com');

    expect(api.post).toHaveBeenCalledWith('/admin/trainer-invites', { email: 'novo@example.com' });
    expect(result).toEqual(body);
  });

  it('revokeTrainerInvite posts to the revoke endpoint', async () => {
    api.post.mockResolvedValue({ data: {} });

    await revokeTrainerInvite('invite-1');

    expect(api.post).toHaveBeenCalledWith('/admin/trainer-invites/invite-1/revoke');
  });
});
