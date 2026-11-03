import { render, screen, waitFor, act } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import ExerciseTemplateForm from './ExerciseTemplateForm';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';
import { uploadExerciseVideo } from '../api/exerciseVideos';

vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));
vi.mock('../api/exerciseVideos', () => ({ uploadExerciseVideo: vi.fn() }));

const KEY = 'exercise-videos/trainer-1/abc.mp4';
const SIGNED = 'https://cdn.example.com/signed.mp4';

// Renders the template form.
const renderForm = (props = {}) =>
  render(<ExerciseTemplateForm onCancel={vi.fn()} onSuccess={vi.fn()} onNameChange={vi.fn()} {...props} />);

// Picks a video file in the upload input.
const pickVideo = (user) => user.upload(screen.getByLabelText('Selecionar vídeo'), new File(['x'], 'a.mp4', { type: 'video/mp4' }));

describe('ExerciseTemplateForm — gallery video upload', () => {
  beforeEach(() => {
    api.post.mockReset();
    api.patch.mockReset();
    uploadExerciseVideo.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    URL.createObjectURL = vi.fn(() => 'blob:local-preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('sends videoFileKey on create after an upload and previews the video', async () => {
    const user = userEvent.setup();
    uploadExerciseVideo.mockResolvedValue({ key: KEY });
    api.post.mockResolvedValue({ data: { id: 1 } });
    const { container } = renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Agachamento');
    await user.click(screen.getByRole('radio', { name: /força/i }));
    await pickVideo(user);
    await waitFor(() => expect(container.querySelector('.video-hero-stage video')).not.toBeNull());
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/trainer/exercise-templates', expect.objectContaining({ name: 'Agachamento', videoFileKey: KEY })));
  });

  it('does not send videoFileKey on create without an upload', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { id: 1 } });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Agachamento');
    await user.click(screen.getByRole('radio', { name: /força/i }));
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalled());
    expect(api.post.mock.calls[0][1]).not.toHaveProperty('videoFileKey');
  });

  it('pre-fills the preview on edit and sends videoFileKey: null after removing it', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: { id: 10 } });
    const template = { id: 10, name: 'Supino', type: 'strength', videoFileKey: KEY, videoFileUrl: SIGNED };
    renderForm({ exerciseTemplate: template });

    expect(screen.getByLabelText('Prévia do vídeo enviado')).toHaveAttribute('src', SIGNED);
    await user.click(screen.getByRole('button', { name: 'Remover vídeo enviado' }));
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/trainer/exercise-templates/10', expect.objectContaining({ videoFileKey: null })));
  });

  it('leaves videoFileKey out of the edit payload when the video is untouched', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: { id: 10 } });
    renderForm({ exerciseTemplate: { id: 10, name: 'Supino', type: 'strength', videoFileKey: KEY, videoFileUrl: SIGNED } });

    await user.type(screen.getByLabelText(/nome/i), ' 2');
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => expect(api.patch).toHaveBeenCalled());
    expect(api.patch.mock.calls[0][1]).not.toHaveProperty('videoFileKey');
  });

  it('disables save while uploading and re-enables it once cancelled', async () => {
    const user = userEvent.setup();
    let signal;
    uploadExerciseVideo.mockImplementation((_file, options) => { signal = options.signal; return new Promise(() => {}); });
    renderForm();

    await user.type(screen.getByLabelText(/nome/i), 'Agachamento');
    await pickVideo(user);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^salvar$/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Cancelar envio' }));

    expect(signal.aborted).toBe(true);
    expect(screen.getByRole('button', { name: /^salvar$/i })).toBeEnabled();
  });

  it('re-enables save after the upload fails and keeps the form submittable', async () => {
    const user = userEvent.setup();
    let reject;
    uploadExerciseVideo.mockImplementation(() => new Promise((_resolve, rej) => { reject = rej; }));
    renderForm();

    await pickVideo(user);
    await screen.findByRole('progressbar');
    await act(async () => reject(new Error('network')));

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível enviar o vídeo. Tente novamente.');
    expect(screen.getByRole('button', { name: /^salvar$/i })).toBeEnabled();
  });
});
