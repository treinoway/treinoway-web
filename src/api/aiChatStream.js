import API_BASE_URL from './baseUrl';
import { clearAuthAndRedirect, refreshAccessToken } from './axios';
import { createSseParser } from '../utils/sseParser';
import { getLocale } from '../i18n';

const STREAM_URL = `${API_BASE_URL}/trainer/ai/chat/stream`;

// Posts one chat turn to the SSE endpoint.
const postStream = (payload, token, signal) =>
  fetch(STREAM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'app-language': getLocale(),
    },
    body: JSON.stringify(payload),
    signal,
  });

// Parses the JSON error body of a rejected request, or null when it is not JSON.
const readErrorBody = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

// Refreshes the session through the shared axios helper; a failed refresh ends the session like the axios interceptor does.
const tryRefreshToken = async () => {
  let freshToken = null;
  try {
    freshToken = await refreshAccessToken();
  } catch {
    freshToken = null;
  }
  if (!freshToken) clearAuthAndRedirect();
  return freshToken;
};

// Opens the chat stream, retrying once with a refreshed token on 401; rejects with an axios-like error otherwise.
export const openChatStream = async ({ payload, token, signal }) => {
  let response = await postStream(payload, token, signal);
  if (response.status === 401) {
    const freshToken = await tryRefreshToken();
    if (freshToken) response = await postStream(payload, freshToken, signal);
  }
  if (response.ok) return response;
  const error = new Error(`AI chat stream failed with HTTP ${response.status}`);
  error.response = { status: response.status, data: await readErrorBody(response) };
  throw error;
};

// Reads the SSE body, calling onEvent for every parsed event, until it ends or the signal aborts.
export const readChatEvents = async (response, signal, onEvent) => {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = createSseParser();
  while (!signal.aborted) {
    const { done, value } = await reader.read();
    if (signal.aborted) break;
    if (done) {
      parser.flush().forEach(onEvent);
      return;
    }
    parser.push(decoder.decode(value, { stream: true })).forEach(onEvent);
  }
  reader.cancel().catch(() => undefined);
};
