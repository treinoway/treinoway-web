import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import VideoFileUpload from './VideoFileUpload';
import { uploadExerciseVideo } from '../../api/exerciseVideos';

vi.mock('../../api/exerciseVideos', () => ({ uploadExerciseVideo: vi.fn() }));

const MB = 1024 * 1024;
const KEY = 'exercise-videos/trainer-1/abc.mp4';

// Builds a video file with a given size and type.
const videoFile = (size = 1024, type = 'video/mp4', name = 'treino.mp4') => {
  const created = new File(['x'], name, { type });
  Object.defineProperty(created, 'size', { value: size });
  return created;
};

// Mounts the field with spy handlers; `props` override them.
const renderUpload = (props = {}) => {
  const handlers = { onChange: vi.fn(), onUploadingChange: vi.fn() };
  render(<VideoFileUpload value={null} previewUrl={null} {...handlers} {...props} />);
  return { ...handlers, ...props };
};

// Returns the hidden file input.
const getInput = () => screen.getByLabelText('Selecionar vídeo');

// Makes the next upload stay pending; returns its controls and the options it received.
const pendingUpload = () => {
  const control = {};
  uploadExerciseVideo.mockImplementationOnce((_file, options) => new Promise((resolve, reject) => {
    control.options = options;
    control.resolve = resolve;
    control.reject = reject;
  }));
  return control;
};

describe('VideoFileUpload', () => {
  beforeEach(() => {
    uploadExerciseVideo.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:local-preview');
    URL.revokeObjectURL = vi.fn();
  });

  describe('trigger and input', () => {
    it('renders the gallery trigger as a secondary button', () => {
      renderUpload();
      expect(screen.getByRole('button', { name: 'Enviar vídeo da galeria' })).toHaveClass('btn--secondary');
    });

    it('renders a hidden video-only file input without capture', () => {
      renderUpload();
      const input = getInput();
      expect(input).toHaveAttribute('type', 'file');
      expect(input).toHaveAttribute('accept', 'video/mp4,video/quicktime,video/webm');
      expect(input).not.toHaveAttribute('capture');
    });

    it('disables the trigger and the input when disabled', () => {
      renderUpload({ disabled: true });
      expect(screen.getByRole('button', { name: 'Enviar vídeo da galeria' })).toBeDisabled();
      expect(getInput()).toBeDisabled();
    });
  });

  describe('client validation', () => {
    it('rejects an unsupported type with a field error and no API call', async () => {
      const user = userEvent.setup({ applyAccept: false });
      const { onChange } = renderUpload();

      await user.upload(getInput(), videoFile(1024, 'video/x-msvideo', 'a.avi'));

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Formato não suportado. Use MP4, MOV ou WEBM.');
      expect(alert).toHaveClass('field-error');
      expect(uploadExerciseVideo).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('rejects a file over 100 MB with a field error and no API call', async () => {
      const user = userEvent.setup();
      const { onChange } = renderUpload();

      await user.upload(getInput(), videoFile(100 * MB + 1));

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('O vídeo deve ter no máximo 100 MB.');
      expect(alert).toHaveClass('field-error');
      expect(uploadExerciseVideo).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
    });

    it.each([
      ['video/mp4', 'a.mp4'],
      ['video/quicktime', 'a.mov'],
      ['video/webm', 'a.webm'],
    ])('accepts %s of exactly 100 MB', async (type, name) => {
      const user = userEvent.setup();
      uploadExerciseVideo.mockResolvedValue({ key: KEY });
      renderUpload();

      await user.upload(getInput(), videoFile(100 * MB, type, name));

      await waitFor(() => expect(uploadExerciseVideo).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('uploading', () => {
    it('shows a progressbar that follows the reported progress and flags uploading', async () => {
      const user = userEvent.setup();
      const control = pendingUpload();
      const { onUploadingChange } = renderUpload();

      await user.upload(getInput(), videoFile());

      await screen.findByRole('progressbar');
      expect(onUploadingChange).toHaveBeenCalledWith(true);
      expect(uploadExerciseVideo).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({ onProgress: expect.any(Function), signal: expect.any(AbortSignal) }));

      act(() => control.options.onProgress(42));
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
    });

    it('reports the key and a local preview URL on success and stops uploading', async () => {
      const user = userEvent.setup();
      const control = pendingUpload();
      const { onChange, onUploadingChange } = renderUpload();

      await user.upload(getInput(), videoFile());
      await screen.findByRole('progressbar');
      await act(async () => control.resolve({ key: KEY }));

      expect(onChange).toHaveBeenCalledWith(KEY, 'blob:local-preview');
      expect(onUploadingChange).toHaveBeenLastCalledWith(false);
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('cancels the upload: aborts the request, leaves the field unchanged and stops uploading', async () => {
      const user = userEvent.setup();
      const control = pendingUpload();
      const { onChange, onUploadingChange } = renderUpload();

      await user.upload(getInput(), videoFile());
      await user.click(await screen.findByRole('button', { name: 'Cancelar envio' }));

      expect(control.options.signal.aborted).toBe(true);
      expect(onUploadingChange).toHaveBeenLastCalledWith(false);
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows a field error and stops uploading when the upload fails', async () => {
      const user = userEvent.setup();
      const control = pendingUpload();
      const { onChange, onUploadingChange } = renderUpload();

      await user.upload(getInput(), videoFile());
      await screen.findByRole('progressbar');
      await act(async () => control.reject(new Error('network')));

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Não foi possível enviar o vídeo. Tente novamente.');
      expect(alert).toHaveClass('field-error');
      expect(onChange).not.toHaveBeenCalled();
      expect(onUploadingChange).toHaveBeenLastCalledWith(false);
    });

    it('clears a previous error when a new valid file is picked', async () => {
      const user = userEvent.setup({ applyAccept: false });
      uploadExerciseVideo.mockResolvedValue({ key: KEY });
      renderUpload();

      await user.upload(getInput(), videoFile(1024, 'image/gif', 'a.gif'));
      expect(screen.getByRole('alert')).toBeInTheDocument();

      await user.upload(getInput(), videoFile());
      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    });
  });

  describe('with an uploaded video', () => {
    it('previews the video with native controls and inline playback', () => {
      renderUpload({ value: KEY, previewUrl: 'https://cdn.example.com/signed.mp4' });

      const video = screen.getByLabelText('Prévia do vídeo enviado');
      expect(video.tagName).toBe('VIDEO');
      expect(video).toHaveAttribute('src', 'https://cdn.example.com/signed.mp4');
      expect(video).toHaveAttribute('controls');
      expect(video).toHaveAttribute('playsinline');
    });

    it('clears the value through the remove button', async () => {
      const user = userEvent.setup();
      const { onChange } = renderUpload({ value: KEY, previewUrl: 'https://cdn.example.com/signed.mp4' });

      await user.click(screen.getByRole('button', { name: 'Remover vídeo enviado' }));

      expect(onChange).toHaveBeenCalledWith(null, null);
    });

    it('does not preview anything without a value', () => {
      renderUpload();
      expect(screen.queryByLabelText('Prévia do vídeo enviado')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Remover vídeo enviado' })).not.toBeInTheDocument();
    });
  });
});
