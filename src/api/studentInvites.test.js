import api from './axios';
import {
  inviteStudent,
  listStudentInvites,
  resendStudentInvite,
  revokeStudentInvite,
} from './studentInvites';

vi.mock('./axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('studentInvites api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inviteStudent posts the email and returns the body', async () => {
    api.post.mockResolvedValue({ data: { outcome: 'invited', invite: { id: 'i1' } } });
    const result = await inviteStudent('a@b.com');
    expect(api.post).toHaveBeenCalledWith('/trainer/student-invites', { email: 'a@b.com' });
    expect(result).toEqual({ outcome: 'invited', invite: { id: 'i1' } });
  });

  it('listStudentInvites omits empty params', async () => {
    api.get.mockResolvedValue({ data: { items: [], total: 0 } });
    await listStudentInvites({ page: 1, pageSize: 20 });
    expect(api.get).toHaveBeenCalledWith('/trainer/student-invites', { params: { page: 1, pageSize: 20 } });
  });

  it('listStudentInvites forwards the status filter', async () => {
    api.get.mockResolvedValue({ data: { items: [], total: 0 } });
    await listStudentInvites({ status: 'pending', page: 2, pageSize: 20 });
    expect(api.get).toHaveBeenCalledWith('/trainer/student-invites', {
      params: { status: 'pending', page: 2, pageSize: 20 },
    });
  });

  it('resendStudentInvite posts to the resend endpoint', async () => {
    api.post.mockResolvedValue({ data: { invite: { id: 'i1' } } });
    await expect(resendStudentInvite('i1')).resolves.toEqual({ invite: { id: 'i1' } });
    expect(api.post).toHaveBeenCalledWith('/trainer/student-invites/i1/resend');
  });

  it('revokeStudentInvite deletes the invite', async () => {
    api.delete.mockResolvedValue({ data: { invite: { id: 'i1', status: 'revoked' } } });
    await expect(revokeStudentInvite('i1')).resolves.toEqual({ invite: { id: 'i1', status: 'revoked' } });
    expect(api.delete).toHaveBeenCalledWith('/trainer/student-invites/i1');
  });
});
