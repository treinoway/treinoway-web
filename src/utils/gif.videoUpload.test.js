import { shouldShowGif } from './gif';

describe('shouldShowGif — uploaded video precedence', () => {
  const gifUrl = 'https://a.com/a.gif';

  it('hides the GIF when the exercise has an uploaded video file', () => {
    expect(shouldShowGif({ videoUrl: null, videoFileUrl: 'https://cdn.example.com/signed.mp4', gifUrl })).toBe(false);
    expect(shouldShowGif({ videoUrl: 'https://vimeo.com/1', videoFileUrl: 'https://cdn.example.com/signed.mp4', gifUrl })).toBe(false);
  });

  it('still shows the GIF when videoFileUrl is empty', () => {
    expect(shouldShowGif({ videoUrl: null, videoFileUrl: null, gifUrl })).toBe(true);
  });
});
