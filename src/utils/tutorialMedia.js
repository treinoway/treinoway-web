import { getYoutubeVideoId } from './youtube';

export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

const DIRECT_VIDEO_PATH = /\.(mp4|webm|mov)$/i;

// True when the value is an http(s) URL.
export const isHttpUrl = (value) => {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

// True when the URL path points straight to a playable video file.
const isDirectVideoUrl = (url) => {
  try {
    return DIRECT_VIDEO_PATH.test(new URL(url).pathname);
  } catch {
    return false;
  }
};

// Decides how a tutorial plays: youtube iframe, native video, or external link.
export const getTutorialPlayback = (tutorial) => {
  const youtubeId = tutorial.videoSource === 'link' ? getYoutubeVideoId(tutorial.videoUrl) : null;
  if (youtubeId) {
    return {
      kind: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0`,
      thumbnailUrl: `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
    };
  }
  if (tutorial.videoSource === 'upload' || isDirectVideoUrl(tutorial.videoUrl)) {
    return { kind: 'file', url: tutorial.videoUrl };
  }
  return { kind: 'external', url: tutorial.videoUrl };
};

// Returns an i18n error key for an invalid video file, or null when valid.
export const validateVideoFile = (file) => {
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) return 'adminTutorials.errorFileType';
  if (file.size > MAX_VIDEO_BYTES) return 'adminTutorials.errorFileSize';
  return null;
};

// Formats a duration in seconds as m:ss (h:mm:ss from one hour); null when unknown.
export const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}` : `${minutes}:${secs}`;
};
