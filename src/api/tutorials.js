// deviation: plain axios (not the shared instance) — the presigned S3 PUT must not carry the API baseURL or Authorization header
// eslint-disable-next-line no-restricted-imports -- presigned upload goes to S3, outside the authenticated API instance
import axios from 'axios';
import api from './axios';

const ADMIN_PATH = '/admin/tutorials';

// GET /admin/tutorials → { items } ordered by `order`.
export const listAdminTutorials = async () => {
  const response = await api.get(ADMIN_PATH);
  return response.data;
};

// POST /admin/tutorials (link: videoUrl | upload: videoKey) → created tutorial.
export const createTutorial = async (payload) => {
  const response = await api.post(ADMIN_PATH, payload);
  return response.data;
};

// PATCH /admin/tutorials/:id with a partial payload → updated tutorial.
export const updateTutorial = async (id, changes) => {
  const response = await api.patch(`${ADMIN_PATH}/${id}`, changes);
  return response.data;
};

// DELETE /admin/tutorials/:id.
export const deleteTutorial = async (id) => {
  await api.delete(`${ADMIN_PATH}/${id}`);
};

// PATCH /admin/tutorials/reorder with the full ordered id set → { items }.
export const reorderTutorials = async (orderedIds) => {
  const response = await api.patch(`${ADMIN_PATH}/reorder`, { orderedIds });
  return response.data;
};

// POST /admin/tutorials/upload-url → { uploadUrl, videoKey, expiresIn } (presigned PUT).
export const requestTutorialUploadUrl = async ({ contentType, fileSize }) => {
  const response = await api.post(`${ADMIN_PATH}/upload-url`, { contentType, fileSize });
  return response.data;
};

// PUTs the file straight to the presigned URL; Content-Type must equal the signed one. Reports 0-100.
export const uploadTutorialVideo = async (uploadUrl, file, onProgress) => {
  await axios.put(uploadUrl, file, {
    headers: { 'Content-Type': file.type },
    onUploadProgress: (event) => {
      if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
};

// GET /tutorials → { items } for trainers.
export const listTutorials = async () => {
  const response = await api.get('/tutorials');
  return response.data;
};
