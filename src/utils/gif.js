import { getYoutubeVideoId } from './youtube';

const GIF_URL_PATTERN = /^https?:\/\/\S+$/;
const GIF_URL_MAX_LENGTH = 2048;

export const GIF_URL_ERROR = 'Use um link http(s) válido para o GIF.';

/** True when the (trimmed) value passes the same rule as the API: `^https?://\S+$`, max 2048 chars. */
export const isHttpUrl = (value) => {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length <= GIF_URL_MAX_LENGTH && GIF_URL_PATTERN.test(trimmed);
};

/** Returns the inline error for a non-empty, invalid GIF link, or null when it is empty or valid. */
export const getGifUrlError = (value) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed !== '' && !isHttpUrl(trimmed) ? GIF_URL_ERROR : null;
};

/** A GIF is shown only when there is a GIF link and no playable (YouTube) video. */
export const shouldShowGif = ({ videoUrl, gifUrl }) => !!gifUrl && !getYoutubeVideoId(videoUrl);
