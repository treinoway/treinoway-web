import api from '../api/axios';
import {
  listUsers,
  getUser,
  listUserStudents,
  listUserTrainers,
  listUserProtocols,
  listUserTemplates,
  listUserSessions,
  getProtocol,
} from './api';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
}));

const payload = { items: [], total: 0, page: 1, pageSize: 20 };

describe('manager api', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.get.mockResolvedValue({ data: payload });
  });

  it('listUsers calls /admin/manager/users with search, kind, page and pageSize and returns data', async () => {
    const result = await listUsers({ search: 'ana', kind: 'trainer', page: 2, pageSize: 20 });

    expect(api.get.mock.calls[0][0]).toBe('/admin/manager/users');
    expect(api.get.mock.calls[0][1].params).toEqual(
      expect.objectContaining({ search: 'ana', kind: 'trainer', page: 2, pageSize: 20 })
    );
    expect(result).toBe(payload);
  });

  it('getUser calls /admin/manager/users/:userId and returns data', async () => {
    const overview = { user: { id: 'u1' } };
    api.get.mockResolvedValue({ data: overview });

    const result = await getUser('u1');

    expect(api.get.mock.calls[0][0]).toBe('/admin/manager/users/u1');
    expect(result).toBe(overview);
  });

  it('listUserStudents calls the students endpoint with pagination', async () => {
    const result = await listUserStudents('u1', { page: 3, pageSize: 10 });

    expect(api.get.mock.calls[0][0]).toBe('/admin/manager/users/u1/students');
    expect(api.get.mock.calls[0][1].params).toEqual(expect.objectContaining({ page: 3, pageSize: 10 }));
    expect(result).toBe(payload);
  });

  it('listUserTrainers calls the trainers endpoint with pagination', async () => {
    const result = await listUserTrainers('u1', { page: 1, pageSize: 20 });

    expect(api.get.mock.calls[0][0]).toBe('/admin/manager/users/u1/trainers');
    expect(api.get.mock.calls[0][1].params).toEqual(expect.objectContaining({ page: 1, pageSize: 20 }));
    expect(result).toBe(payload);
  });

  it('listUserProtocols calls the protocols endpoint with the "as" role and pagination', async () => {
    const result = await listUserProtocols('u1', { as: 'student', page: 1, pageSize: 20 });

    expect(api.get.mock.calls[0][0]).toBe('/admin/manager/users/u1/protocols');
    expect(api.get.mock.calls[0][1].params).toEqual(
      expect.objectContaining({ as: 'student', page: 1, pageSize: 20 })
    );
    expect(result).toBe(payload);
  });

  it('listUserTemplates calls the templates endpoint with type and pagination', async () => {
    const result = await listUserTemplates('u1', { type: 'exercise', page: 1, pageSize: 20 });

    expect(api.get.mock.calls[0][0]).toBe('/admin/manager/users/u1/templates');
    expect(api.get.mock.calls[0][1].params).toEqual(
      expect.objectContaining({ type: 'exercise', page: 1, pageSize: 20 })
    );
    expect(result).toBe(payload);
  });

  it('listUserSessions calls the sessions endpoint with pagination', async () => {
    const result = await listUserSessions('u1', { page: 2, pageSize: 20 });

    expect(api.get.mock.calls[0][0]).toBe('/admin/manager/users/u1/sessions');
    expect(api.get.mock.calls[0][1].params).toEqual(expect.objectContaining({ page: 2, pageSize: 20 }));
    expect(result).toBe(payload);
  });

  it('getProtocol calls /admin/manager/protocols/:protocolId and returns data', async () => {
    const protocol = { id: 'p1', trainings: [] };
    api.get.mockResolvedValue({ data: protocol });

    const result = await getProtocol('p1');

    expect(api.get.mock.calls[0][0]).toBe('/admin/manager/protocols/p1');
    expect(result).toBe(protocol);
  });

  it('propagates request errors to the caller', async () => {
    api.get.mockRejectedValue(new Error('boom'));

    await expect(getUser('u1')).rejects.toThrow('boom');
  });
});
