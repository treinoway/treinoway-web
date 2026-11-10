import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import ExerciseVideoSection from './ExerciseVideoSection';
import { uploadExerciseVideo } from '../../api/exerciseVideos';

vi.mock('../../api/exerciseVideos', () => ({ uploadExerciseVideo: vi.fn() }));

const KEY = 'exercise-videos/trainer-1/abc.mp4';
const PREVIEW = 'https://cdn.example.com/signed.mp4';
const YOUTUBE = 'https://www.youtube.com/watch?v=abc123XYZ';

// Renders the video section with state.
const renderSection = (props = {}) => {
  const handlers = { onVideoUrlChange: vi.fn(), onRemoveVideo: vi.fn(), onVideoFileChange: vi.fn(), onUploadingChange: vi.fn() };
  const utils = render(<ExerciseVideoSection className="section-card" videoUrl="" {...handlers} {...props} />);
  return { ...utils, ...handlers };
};

describe('ExerciseVideoSection — gallery upload', () => {
  beforeEach(() => {
    uploadExerciseVideo.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:local-preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('offers the gallery upload as a secondary button by default', () => {
    renderSection();
    expect(screen.getByRole('button', { name: 'Enviar vídeo da galeria' })).toHaveClass('btn--secondary');
    expect(screen.getByLabelText('Selecionar vídeo')).toHaveAttribute('accept', 'video/mp4,video/quicktime,video/webm');
  });

  it('hides the gallery upload when allowUpload is false', () => {
    renderSection({ allowUpload: false });
    expect(screen.queryByRole('button', { name: 'Enviar vídeo da galeria' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Selecionar vídeo')).not.toBeInTheDocument();
  });

  it('reports the uploaded key and preview through onVideoFileChange', async () => {
    const user = userEvent.setup();
    uploadExerciseVideo.mockResolvedValue({ key: KEY });
    const { onVideoFileChange } = renderSection();

    await user.upload(screen.getByLabelText('Selecionar vídeo'), new File(['x'], 'a.mp4', { type: 'video/mp4' }));

    await waitFor(() => expect(onVideoFileChange).toHaveBeenCalledWith(KEY, 'blob:local-preview'));
  });

  it('forwards the uploading state', async () => {
    const user = userEvent.setup();
    uploadExerciseVideo.mockReturnValue(new Promise(() => {}));
    const { onUploadingChange } = renderSection();

    await user.upload(screen.getByLabelText('Selecionar vídeo'), new File(['x'], 'a.mp4', { type: 'video/mp4' }));

    await waitFor(() => expect(onUploadingChange).toHaveBeenCalledWith(true));
  });

  it('hosts the uploaded video preview in the 16:9 stage', () => {
    const { container } = renderSection({ videoFileKey: KEY, videoFilePreviewUrl: PREVIEW });

    const video = container.querySelector('.video-hero-stage video');
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute('src', PREVIEW);
    expect(video).toHaveAttribute('controls');
    expect(video).toHaveAttribute('playsinline');
  });

  it('prefers the uploaded video over a YouTube link in the stage', () => {
    const { container } = renderSection({ videoUrl: YOUTUBE, videoFileKey: KEY, videoFilePreviewUrl: PREVIEW });

    expect(container.querySelector('.video-hero-stage video')).not.toBeNull();
    expect(screen.queryByRole('img', { name: /miniatura do vídeo/i })).not.toBeInTheDocument();
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('clears the uploaded video through onVideoFileChange(null, null)', async () => {
    const user = userEvent.setup();
    const { onVideoFileChange } = renderSection({ videoFileKey: KEY, videoFilePreviewUrl: PREVIEW });

    await user.click(screen.getByRole('button', { name: 'Remover vídeo enviado' }));

    expect(onVideoFileChange).toHaveBeenCalledWith(null, null);
  });

  it('disables the gallery upload when the section is disabled', () => {
    renderSection({ disabled: true });
    expect(screen.getByRole('button', { name: 'Enviar vídeo da galeria' })).toBeDisabled();
  });

  it('shows an upload error in a field-error alert', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderSection();

    await user.upload(screen.getByLabelText('Selecionar vídeo'), new File(['x'], 'a.gif', { type: 'image/gif' }));

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('field-error');
    expect(alert).toHaveTextContent('Formato não suportado. Use MP4, MOV ou WEBM.');
  });
});
