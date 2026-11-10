import api from './axios';

const UPLOAD_URL_PATH = '/trainer/exercise-videos/upload-url';

// Error raised when the storage PUT fails or is cancelled.
const uploadError = (message) => Object.assign(new Error(message), { isUploadError: true });

// PUTs the file to the presigned URL with XHR (fetch has no upload progress); no Authorization header is ever set.
const putToStorage = (file, { uploadUrl, headers }, { onProgress, signal }) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    Object.entries(headers ?? {}).forEach(([name, value]) => xhr.setRequestHeader(name, value));
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(uploadError(`Storage rejected the upload (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(uploadError('Network error during upload'));
    xhr.onabort = () => reject(uploadError('Upload aborted'));
    signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(file);
  });

/**
 * Uploads an exercise video: asks the API for a presigned PUT URL, then sends the file straight to storage.
 * @param {File} file - the picked video (sent as-is: the size is part of the signature)
 * @param {{ onProgress?: (percent: number) => void, signal?: AbortSignal, contentType?: string }} `contentType` overrides `file.type` (empty in some browsers) options
 * @returns {Promise<{ key: string }>} the storage key to send as `videoFileKey`
 */
export const uploadExerciseVideo = async (file, { onProgress, signal, contentType = file.type } = {}) => {
  if (signal?.aborted) throw uploadError('Upload aborted');
  const { data } = await api.post(UPLOAD_URL_PATH, { contentType, sizeBytes: file.size });
  if (signal?.aborted) throw uploadError('Upload aborted');
  await putToStorage(file, data, { onProgress, signal });
  return { key: data.key };
};
