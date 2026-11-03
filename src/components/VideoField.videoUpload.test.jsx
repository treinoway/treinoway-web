import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import VideoField from './VideoField';
import { uploadExerciseVideo } from '../api/exerciseVideos';

vi.mock('../api/exerciseVideos', () => ({ uploadExerciseVideo: vi.fn() }));

const KEY = 'exercise-videos/trainer-1/abc.mp4';
const PREVIEW = 'https://cdn.example.com/signed.mp4';
const YOUTUBE = 'https://www.youtube.com/watch?v=abc123XYZ';

// Renders the video field with state.
const renderField = (props = {}) => {
  const handlers = { onChange: vi.fn(), onVideoFileChange: vi.fn(), onUploadingChange: vi.fn() };
  const utils = render(<VideoField value="" {...handlers} {...props} />);
  return { ...utils, ...handlers };
};

describe('VideoField — gallery upload', () => {
  beforeEach(() => {
    uploadExerciseVideo.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:local-preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('offers the gallery upload as a secondary button by default', () => {
    renderField();
    expect(screen.getByRole('button', { name: 'Enviar vídeo da galeria' })).toHaveClass('btn--secondary');
    expect(screen.getByLabelText('Selecionar vídeo')).not.toHaveAttribute('capture');
  });

  it('hides the gallery upload when allowUpload is false', () => {
    renderField({ allowUpload: false });
    expect(screen.queryByRole('button', { name: 'Enviar vídeo da galeria' })).not.toBeInTheDocument();
  });

  it('reports the uploaded key and preview through onVideoFileChange', async () => {
    const user = userEvent.setup();
    uploadExerciseVideo.mockResolvedValue({ key: KEY });
    const { onVideoFileChange } = renderField();

    await user.upload(screen.getByLabelText('Selecionar vídeo'), new File(['x'], 'a.mp4', { type: 'video/mp4' }));

    await waitFor(() => expect(onVideoFileChange).toHaveBeenCalledWith(KEY, 'blob:local-preview'));
  });

  it('forwards the uploading state', async () => {
    const user = userEvent.setup();
    uploadExerciseVideo.mockReturnValue(new Promise(() => {}));
    const { onUploadingChange } = renderField();

    await user.upload(screen.getByLabelText('Selecionar vídeo'), new File(['x'], 'a.mp4', { type: 'video/mp4' }));

    await waitFor(() => expect(onUploadingChange).toHaveBeenCalledWith(true));
  });

  it('hosts the uploaded video preview in the preview slot', () => {
    const { container } = renderField({ videoFileKey: KEY, videoFilePreviewUrl: PREVIEW });

    const video = container.querySelector('.video-field-preview video');
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute('src', PREVIEW);
    expect(video).toHaveAttribute('controls');
    expect(video).toHaveAttribute('playsinline');
  });

  it('prefers the uploaded video over a YouTube link', () => {
    const { container } = renderField({ value: YOUTUBE, videoFileKey: KEY, videoFilePreviewUrl: PREVIEW });

    expect(container.querySelector('.video-field-preview video')).not.toBeNull();
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('prefers the uploaded video over a GIF', () => {
    const { container } = renderField({ gifValue: 'https://media.example.com/a.gif', onGifChange: vi.fn(), videoFileKey: KEY, videoFilePreviewUrl: PREVIEW });

    expect(container.querySelector('.video-field-preview video')).not.toBeNull();
    expect(screen.queryByRole('img', { name: /prévia do gif/i })).not.toBeInTheDocument();
  });

  it('clears the uploaded video through onVideoFileChange(null, null)', async () => {
    const user = userEvent.setup();
    const { onVideoFileChange } = renderField({ videoFileKey: KEY, videoFilePreviewUrl: PREVIEW });

    await user.click(screen.getByRole('button', { name: 'Remover vídeo enviado' }));

    expect(onVideoFileChange).toHaveBeenCalledWith(null, null);
  });

  it('shows an oversize error in a field-error alert', async () => {
    const user = userEvent.setup();
    renderField();
    const big = new File(['x'], 'big.mp4', { type: 'video/mp4' });
    Object.defineProperty(big, 'size', { value: 100 * 1024 * 1024 + 1 });

    await user.upload(screen.getByLabelText('Selecionar vídeo'), big);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('field-error');
    expect(alert).toHaveTextContent('O vídeo deve ter no máximo 100 MB.');
  });
});
