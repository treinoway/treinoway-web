import { getYoutubeVideoId } from './youtube';

describe('getYoutubeVideoId id validation', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('accepts a well-formed id in %s', (url, id) => {
    expect(getYoutubeVideoId(url)).toBe(id);
  });

  it.each([
    'https://www.youtube.com/watch?v=abc',
    'https://www.youtube.com/watch?v=abc%20def%21xyz',
    'https://youtu.be/ab',
    'https://youtu.be/' + 'a'.repeat(21),
    'https://www.youtube.com/embed/abc',
    'https://www.youtube.com/shorts/abc',
  ])('returns null for a malformed id in %s', (url) => {
    expect(getYoutubeVideoId(url)).toBeNull();
  });
});
