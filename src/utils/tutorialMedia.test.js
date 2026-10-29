import { getTutorialPlayback, isHttpUrl, validateVideoFile, MAX_VIDEO_BYTES } from './tutorialMedia';

describe('tutorialMedia utils', () => {
  it('detects http(s) urls only', () => {
    expect(isHttpUrl('https://a.com/x')).toBe(true);
    expect(isHttpUrl('http://a.com')).toBe(true);
    expect(isHttpUrl('ftp://a.com')).toBe(false);
    expect(isHttpUrl('nope')).toBe(false);
  });

  it('plays YouTube links in an embed', () => {
    const playback = getTutorialPlayback({ videoSource: 'link', videoUrl: 'https://youtu.be/abc123XYZ' });
    expect(playback.kind).toBe('youtube');
    expect(playback.embedUrl).toContain('/embed/abc');
  });

  it('plays uploads and direct file links natively', () => {
    expect(getTutorialPlayback({ videoSource: 'upload', videoUrl: 'https://cdn/x?sig=1' }).kind).toBe('file');
    expect(getTutorialPlayback({ videoSource: 'link', videoUrl: 'https://a.com/v.WEBM?t=1' }).kind).toBe('file');
  });

  it('falls back to an external link otherwise', () => {
    expect(getTutorialPlayback({ videoSource: 'link', videoUrl: 'https://vimeo.com/1' }).kind).toBe('external');
  });

  it('validates video type and size', () => {
    expect(validateVideoFile({ type: 'video/mp4', size: 10 })).toBeNull();
    expect(validateVideoFile({ type: 'application/pdf', size: 10 })).toBe('adminTutorials.errorFileType');
    expect(validateVideoFile({ type: 'video/mp4', size: MAX_VIDEO_BYTES + 1 })).toBe('adminTutorials.errorFileSize');
  });
});
