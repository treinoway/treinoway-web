import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import api from './axios';
import { uploadExerciseVideo } from './exerciseVideos';

vi.mock('./axios', () => ({
  default: { post: vi.fn(), get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const KEY = 'exercise-videos/trainer-1/abc.mp4';
const UPLOAD_URL = 'https://bucket.example.com/exercise-videos/trainer-1/abc.mp4?X-Amz-Signature=sig';
const UPLOAD_RESPONSE = {
  data: { key: KEY, uploadUrl: UPLOAD_URL, method: 'PUT', headers: { 'Content-Type': 'video/mp4' }, expiresAt: '2026-11-03T12:15:00.000Z' },
};

// Minimal XMLHttpRequest double: records the request and lets each test drive progress/completion.
class FakeXhr {
  static instances = [];

  // Builds an XHR double with empty state.
  constructor() {
    this.headers = {};
    this.upload = {};
    this.listeners = {};
    this.aborted = false;
    this.status = 0;
    FakeXhr.instances.push(this);
  }

  // Records the method and URL.
  open(method, url) { this.method = method; this.url = url; }
  // Records a request header.
  setRequestHeader(name, value) { this.headers[name] = value; }
  // Registers an event handler.
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  // Records the request body.
  send(body) { this.body = body; }
  // Marks the request aborted and fires abort.
  abort() { this.aborted = true; this.emit('abort'); }

  // Fires an event on the request.
  emit(type, event = {}) {
    this[`on${type}`]?.(event);
    (this.listeners[type] || []).forEach((handler) => handler(event));
  }

  // Fires an event on the upload target.
  emitUpload(type, event = {}) {
    this.upload[`on${type}`]?.(event);
    (this.upload.listeners?.[type] || []).forEach((handler) => handler(event));
  }

  // Completes the request with a status.
  finish(status) { this.status = status; this.readyState = 4; this.emit('load'); }
}

// Builds a small mp4 file.
const file = () => new File(['video-bytes'], 'treino.mp4', { type: 'video/mp4' });

// Lets the upload-url POST settle so the PUT transport has been created.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('uploadExerciseVideo', () => {
  beforeEach(() => {
    FakeXhr.instances = [];
    vi.stubGlobal('XMLHttpRequest', FakeXhr);
    api.post.mockReset();
    api.post.mockResolvedValue(UPLOAD_RESPONSE);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('requests an upload URL with the file type and size through the shared api', async () => {
    const promise = uploadExerciseVideo(file());
    await flush();

    expect(api.post).toHaveBeenCalledWith('/trainer/exercise-videos/upload-url', { contentType: 'video/mp4', sizeBytes: file().size });
    FakeXhr.instances[0].finish(200);
    await promise;
  });

  it('PUTs the file to the signed URL with the returned headers and no auth header, then resolves the key', async () => {
    const video = file();
    const promise = uploadExerciseVideo(video);
    await flush();

    const [xhr] = FakeXhr.instances;
    expect(xhr.method).toBe('PUT');
    expect(xhr.url).toBe(UPLOAD_URL);
    expect(xhr.headers['Content-Type']).toBe('video/mp4');
    expect(Object.keys(xhr.headers).map((name) => name.toLowerCase())).not.toContain('authorization');
    expect(xhr.body).toBe(video);

    xhr.finish(200);
    await expect(promise).resolves.toEqual({ key: KEY });
  });

  it('reports upload progress as a 0-100 percentage', async () => {
    const onProgress = vi.fn();
    const promise = uploadExerciseVideo(file(), { onProgress });
    await flush();

    const [xhr] = FakeXhr.instances;
    xhr.emitUpload('progress', { lengthComputable: true, loaded: 50, total: 200 });
    expect(onProgress).toHaveBeenLastCalledWith(25);

    xhr.finish(200);
    await promise;
  });

  it('rejects and never starts the PUT when the upload URL request fails', async () => {
    api.post.mockRejectedValue(Object.assign(new Error('boom'), { userMessage: 'Falhou' }));

    await expect(uploadExerciseVideo(file())).rejects.toThrow();
    expect(FakeXhr.instances).toHaveLength(0);
  });

  it('rejects when the storage PUT answers with an error status', async () => {
    const promise = uploadExerciseVideo(file());
    const assertion = expect(promise).rejects.toThrow();
    await flush();

    FakeXhr.instances[0].finish(403);
    await assertion;
  });

  it('rejects when the storage PUT fails at the network level', async () => {
    const promise = uploadExerciseVideo(file());
    const assertion = expect(promise).rejects.toThrow();
    await flush();

    FakeXhr.instances[0].emit('error');
    await assertion;
  });

  it('aborts the in-flight PUT and rejects when the signal is aborted', async () => {
    const controller = new AbortController();
    const promise = uploadExerciseVideo(file(), { signal: controller.signal });
    const assertion = expect(promise).rejects.toThrow();
    await flush();

    controller.abort();

    await assertion;
    expect(FakeXhr.instances[0].aborted).toBe(true);
  });

  it('does not start a PUT when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(uploadExerciseVideo(file(), { signal: controller.signal })).rejects.toThrow();
    await flush();
    expect(FakeXhr.instances).toHaveLength(0);
  });
});
