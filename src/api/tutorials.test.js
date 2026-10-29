import axios from 'axios';
import api from './axios';
import {
  listAdminTutorials,
  createTutorial,
  updateTutorial,
  deleteTutorial,
  reorderTutorials,
  requestTutorialUploadUrl,
  uploadTutorialVideo,
  listTutorials,
} from './tutorials';

vi.mock('./axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('axios', () => ({
  default: {
    put: vi.fn(),
  },
}));

describe('tutorials api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listAdminTutorials gets /admin/tutorials and returns the body', async () => {
    const body = { items: [{ id: 't1', title: 'Boas-vindas' }] };
    api.get.mockResolvedValue({ data: body });

    const result = await listAdminTutorials();

    expect(api.get).toHaveBeenCalledWith('/admin/tutorials');
    expect(result).toEqual(body);
  });

  it('createTutorial posts the payload to /admin/tutorials and returns the tutorial', async () => {
    const payload = { title: 'Boas-vindas', videoSource: 'link', videoUrl: 'https://youtu.be/abc' };
    const created = { id: 't1', ...payload };
    api.post.mockResolvedValue({ data: created });

    const result = await createTutorial(payload);

    expect(api.post).toHaveBeenCalledWith('/admin/tutorials', payload);
    expect(result).toEqual(created);
  });

  it('updateTutorial patches /admin/tutorials/:id with the changes', async () => {
    const updated = { id: 't1', title: 'Novo título' };
    api.patch.mockResolvedValue({ data: updated });

    const result = await updateTutorial('t1', { title: 'Novo título' });

    expect(api.patch).toHaveBeenCalledWith('/admin/tutorials/t1', { title: 'Novo título' });
    expect(result).toEqual(updated);
  });

  it('deleteTutorial deletes /admin/tutorials/:id', async () => {
    api.delete.mockResolvedValue({ status: 204 });

    await deleteTutorial('t1');

    expect(api.delete).toHaveBeenCalledWith('/admin/tutorials/t1');
  });

  it('reorderTutorials patches /admin/tutorials/reorder with orderedIds and returns the items', async () => {
    const body = { items: [{ id: 'b' }, { id: 'a' }] };
    api.patch.mockResolvedValue({ data: body });

    const result = await reorderTutorials(['b', 'a']);

    expect(api.patch).toHaveBeenCalledWith('/admin/tutorials/reorder', { orderedIds: ['b', 'a'] });
    expect(result).toEqual(body);
  });

  it('requestTutorialUploadUrl posts contentType and fileSize to /admin/tutorials/upload-url', async () => {
    const body = { uploadUrl: 'https://s3.example/put?sig=1', videoKey: 'tutorials/abc.mp4', expiresIn: 900 };
    api.post.mockResolvedValue({ data: body });

    const result = await requestTutorialUploadUrl({ contentType: 'video/mp4', fileSize: 1234 });

    expect(api.post).toHaveBeenCalledWith('/admin/tutorials/upload-url', {
      contentType: 'video/mp4',
      fileSize: 1234,
    });
    expect(result).toEqual(body);
  });

  it('listTutorials gets /tutorials and returns the body', async () => {
    const body = { items: [{ id: 't1' }] };
    api.get.mockResolvedValue({ data: body });

    const result = await listTutorials();

    expect(api.get).toHaveBeenCalledWith('/tutorials');
    expect(result).toEqual(body);
  });

  describe('uploadTutorialVideo', () => {
    const file = new File(['video-bytes'], 'aula.mp4', { type: 'video/mp4' });
    const uploadUrl = 'https://s3.example/put?sig=1';

    it('PUTs the file to the presigned url with plain axios and the file content type', async () => {
      axios.put.mockResolvedValue({ status: 200 });

      await uploadTutorialVideo(uploadUrl, file, vi.fn());

      expect(axios.put).toHaveBeenCalledTimes(1);
      const [url, body, config] = axios.put.mock.calls[0];
      expect(url).toBe(uploadUrl);
      expect(body).toBe(file);
      expect(config.headers['Content-Type']).toBe('video/mp4');
    });

    it('does not use the authenticated api instance nor send an Authorization header', async () => {
      axios.put.mockResolvedValue({ status: 200 });

      await uploadTutorialVideo(uploadUrl, file, vi.fn());

      expect(api.put).not.toHaveBeenCalled();
      expect(api.post).not.toHaveBeenCalled();
      const config = axios.put.mock.calls[0][2];
      const headerNames = Object.keys(config.headers).map((name) => name.toLowerCase());
      expect(headerNames).not.toContain('authorization');
      expect(config.baseURL).toBeUndefined();
    });

    it('reports upload progress as a rounded percent through onProgress', async () => {
      const onProgress = vi.fn();
      axios.put.mockImplementation(async (_url, _body, config) => {
        config.onUploadProgress({ loaded: 1, total: 3 });
        config.onUploadProgress({ loaded: 3, total: 3 });
        return { status: 200 };
      });

      await uploadTutorialVideo(uploadUrl, file, onProgress);

      expect(onProgress).toHaveBeenNthCalledWith(1, 33);
      expect(onProgress).toHaveBeenNthCalledWith(2, 100);
    });

    it('does not throw on progress events when onProgress is omitted', async () => {
      axios.put.mockImplementation(async (_url, _body, config) => {
        config.onUploadProgress({ loaded: 1, total: 2 });
        return { status: 200 };
      });

      await expect(uploadTutorialVideo(uploadUrl, file)).resolves.not.toThrow();
    });

    it('propagates upload failures', async () => {
      axios.put.mockRejectedValue(new Error('Network Error'));

      await expect(uploadTutorialVideo(uploadUrl, file, vi.fn())).rejects.toThrow('Network Error');
    });
  });
});
