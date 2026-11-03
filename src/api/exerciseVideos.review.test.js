import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from './axios';
import { uploadExerciseVideo } from './exerciseVideos';

vi.mock('./axios', () => ({ default: { post: vi.fn() } }));

describe('uploadExerciseVideo — contentType override', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.post.mockResolvedValue({ data: { key: 'k', uploadUrl: 'https://s.example/put', headers: {} } });
    globalThis.XMLHttpRequest = class {
      constructor() { this.upload = {}; }
      open() {}
      setRequestHeader() {}
      send() { this.status = 200; this.onload(); }
    };
  });

  it('asks for the upload url with the overridden content type when file.type is empty', async () => {
    const file = new File(['x'], 'a.mov', { type: '' });
    await uploadExerciseVideo(file, { contentType: 'video/quicktime' });
    expect(api.post).toHaveBeenCalledWith('/trainer/exercise-videos/upload-url', { contentType: 'video/quicktime', sizeBytes: file.size });
  });
});
