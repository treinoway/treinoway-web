/**
 * Extracts a YouTube video ID from common YouTube URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/watch?v=VIDEO_ID&t=30s (timestamp ignored)
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 *
 * Returns null if the URL is not a recognizable YouTube URL or has no ID.
 */
export const getYoutubeVideoId = (url) => {
  if (!url || typeof url !== 'string') return null;

  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v') || null;
      }
      const embedMatch = parsed.pathname.match(/^\/embed\/([A-Za-z0-9_-]+)/);
      if (embedMatch) return embedMatch[1];
      const shortsMatch = parsed.pathname.match(/^\/shorts\/([A-Za-z0-9_-]+)/);
      if (shortsMatch) return shortsMatch[1];
    }

    if (host === 'youtu.be') {
      const id = parsed.pathname.replace(/^\//, '').split('/')[0];
      return id || null;
    }
  } catch {
    return null;
  }

  return null;
};
