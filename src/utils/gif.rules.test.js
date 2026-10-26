import { isHttpUrl, getGifUrlError, shouldShowGif } from './gif';

describe('isHttpUrl (server rule ^https?://\\S+$)', () => {
  it('rejects whitespace inside the link', () => {
    expect(isHttpUrl('https://a.com/a b.gif')).toBe(false);
  });

  it('rejects an uppercase scheme', () => {
    expect(isHttpUrl('HTTPS://a.com/a.gif')).toBe(false);
  });

  it('rejects a bare scheme and links over 2048 chars', () => {
    expect(isHttpUrl('https://')).toBe(false);
    expect(isHttpUrl(`https://a.com/${'a'.repeat(2048)}`)).toBe(false);
  });

  it('accepts a plain https link', () => {
    expect(isHttpUrl('https://a.com/a.gif')).toBe(true);
  });
});

describe('getGifUrlError', () => {
  it('is null for empty and valid values and a message for invalid ones', () => {
    expect(getGifUrlError('')).toBeNull();
    expect(getGifUrlError('   ')).toBeNull();
    expect(getGifUrlError('https://a.com/a.gif')).toBeNull();
    expect(getGifUrlError('not a link')).toMatch(/link/i);
  });
});

describe('shouldShowGif', () => {
  const gifUrl = 'https://a.com/a.gif';

  it('shows the GIF without a video or with a non-YouTube video', () => {
    expect(shouldShowGif({ videoUrl: null, gifUrl })).toBe(true);
    expect(shouldShowGif({ videoUrl: 'https://vimeo.com/1', gifUrl })).toBe(true);
  });

  it('hides the GIF with a YouTube video or without a GIF', () => {
    expect(shouldShowGif({ videoUrl: 'https://www.youtube.com/watch?v=abc123XYZ', gifUrl })).toBe(false);
    expect(shouldShowGif({ videoUrl: null, gifUrl: null })).toBe(false);
  });
});
