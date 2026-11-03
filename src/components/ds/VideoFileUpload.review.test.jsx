import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import VideoFileUpload from './VideoFileUpload';
import { uploadExerciseVideo } from '../../api/exerciseVideos';

vi.mock('../../api/exerciseVideos', () => ({ uploadExerciseVideo: vi.fn() }));

const KEY = 'exercise-videos/trainer-1/abc.mp4';

describe('VideoFileUpload — blob URL lifecycle and extension fallback', () => {
  beforeEach(() => {
    uploadExerciseVideo.mockReset();
    uploadExerciseVideo.mockResolvedValue({ key: KEY });
    URL.createObjectURL = vi.fn(() => 'blob:local-preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('revokes the blob URL it created when unmounted', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender, unmount } = render(<VideoFileUpload value={null} previewUrl={null} onChange={onChange} />);
    await user.upload(screen.getByLabelText('Selecionar vídeo'), new File(['x'], 'a.mp4', { type: 'video/mp4' }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(KEY, 'blob:local-preview'));
    rerender(<VideoFileUpload value={KEY} previewUrl="blob:local-preview" onChange={onChange} />);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-preview');
  });

  it('revokes the blob URL when previewUrl changes away from it', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<VideoFileUpload value={null} previewUrl={null} onChange={onChange} />);
    await user.upload(screen.getByLabelText('Selecionar vídeo'), new File(['x'], 'a.mp4', { type: 'video/mp4' }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    rerender(<VideoFileUpload value={KEY} previewUrl="blob:local-preview" onChange={onChange} />);

    rerender(<VideoFileUpload value={KEY} previewUrl="https://cdn.example.com/signed.mp4" onChange={onChange} />);

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:local-preview');
  });

  it('does not revoke URLs it did not create', () => {
    const { rerender, unmount } = render(<VideoFileUpload value={KEY} previewUrl="blob:foreign" onChange={vi.fn()} />);
    rerender(<VideoFileUpload value={KEY} previewUrl={null} onChange={vi.fn()} />);
    unmount();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });

  it('accepts a file with an empty type by its extension and uploads with the mapped content type', async () => {
    const user = userEvent.setup({ applyAccept: false });
    const onChange = vi.fn();
    render(<VideoFileUpload value={null} previewUrl={null} onChange={onChange} />);

    await user.upload(screen.getByLabelText('Selecionar vídeo'), new File(['x'], 'Treino.MOV', { type: '' }));

    await waitFor(() => expect(uploadExerciseVideo).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({ contentType: 'video/quicktime' })));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('rejects a file with an empty type and an unknown extension', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<VideoFileUpload value={null} previewUrl={null} onChange={vi.fn()} />);

    await user.upload(screen.getByLabelText('Selecionar vídeo'), new File(['x'], 'notes.txt', { type: '' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(uploadExerciseVideo).not.toHaveBeenCalled();
  });
});
