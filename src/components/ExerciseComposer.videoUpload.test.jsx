import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import ExerciseComposer from './ExerciseComposer';
import { uploadExerciseVideo } from '../api/exerciseVideos';

vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { data: [], total: 0 } }), post: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));
vi.mock('../api/exerciseVideos', () => ({ uploadExerciseVideo: vi.fn() }));

const KEY = 'exercise-videos/trainer-1/abc.mp4';
const SIGNED = 'https://cdn.example.com/signed.mp4';

const SNAPSHOT = {
  id: 'junc-1', name: 'Supino reto', type: 'strength', prescriptionMode: 'reps', sets: 3,
  repetitions: { min: 10, max: 12 }, restInterval: 60, hasLoad: true, suggestedLoad: 80,
};

const baseProps = {
  snapshot: null, exerciseTemplates: [], saving: false,
  onSubmitCreate: vi.fn(), onSubmitEdit: vi.fn(), onSubmitFromLibrary: vi.fn(), onCancel: vi.fn(),
};

// Renders the composer with base props.
const renderComposer = (props = {}) => render(<ExerciseComposer {...baseProps} {...props} />);

// Opens the create tab and fills the required fields.
const fillCreateForm = async (user) => {
  await user.click(screen.getByRole('tab', { name: /Criar novo/i }));
  await user.type(screen.getByLabelText(/Nome/i), 'Agachamento');
  await user.type(screen.getByLabelText(/Repetições mínimas/i), '8');
  await user.type(screen.getByLabelText(/Repetições máximas/i), '12');
};

// Picks a video file in the upload input.
const pickVideo = (user) => user.upload(screen.getByLabelText('Selecionar vídeo'), new File(['x'], 'a.mp4', { type: 'video/mp4' }));

describe('ExerciseComposer — gallery video upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadExerciseVideo.mockReset();
    URL.createObjectURL = vi.fn(() => 'blob:local-preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('offers the gallery upload next to the YouTube link in create mode', async () => {
    const user = userEvent.setup();
    renderComposer();
    await user.click(screen.getByRole('tab', { name: /Criar novo/i }));

    expect(screen.getByRole('button', { name: 'Enviar vídeo da galeria' })).toHaveClass('btn--secondary');
    expect(screen.getByLabelText(/URL do YouTube/i)).toBeInTheDocument();
  });

  it('sends videoFileKey in the create payload and previews the uploaded video', async () => {
    const user = userEvent.setup();
    uploadExerciseVideo.mockResolvedValue({ key: KEY });
    const onSubmitCreate = vi.fn();
    const { container } = renderComposer({ onSubmitCreate });
    await fillCreateForm(user);

    await pickVideo(user);
    await waitFor(() => expect(container.querySelector('.video-field-preview video')).not.toBeNull());
    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => expect(onSubmitCreate).toHaveBeenCalledWith(expect.objectContaining({ videoFileKey: KEY })));
  });

  it('sends videoFileKey: null in the create payload without an upload', async () => {
    const user = userEvent.setup();
    const onSubmitCreate = vi.fn();
    renderComposer({ onSubmitCreate });
    await fillCreateForm(user);

    await user.click(screen.getByRole('button', { name: /Salvar exercício/i }));

    await waitFor(() => expect(onSubmitCreate).toHaveBeenCalledWith(expect.objectContaining({ videoFileKey: null })));
  });

  it('pre-fills the uploaded video on edit and keeps its key when untouched', async () => {
    const user = userEvent.setup();
    const onSubmitEdit = vi.fn();
    renderComposer({ snapshot: { ...SNAPSHOT, videoFileKey: KEY, videoFileUrl: SIGNED }, onSubmitEdit });

    expect(screen.getByLabelText('Prévia do vídeo enviado')).toHaveAttribute('src', SIGNED);
    await user.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => expect(onSubmitEdit).toHaveBeenCalledWith('junc-1', expect.objectContaining({ videoFileKey: KEY })));
  });

  it('sends videoFileKey: null on edit after removing the uploaded video', async () => {
    const user = userEvent.setup();
    const onSubmitEdit = vi.fn();
    renderComposer({ snapshot: { ...SNAPSHOT, videoFileKey: KEY, videoFileUrl: SIGNED }, onSubmitEdit });

    await user.click(screen.getByRole('button', { name: 'Remover vídeo enviado' }));
    await user.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => expect(onSubmitEdit).toHaveBeenCalledWith('junc-1', expect.objectContaining({ videoFileKey: null })));
  });

  it('disables the submit button while an upload is in progress and blocks no one after cancel', async () => {
    const user = userEvent.setup();
    uploadExerciseVideo.mockImplementation(() => new Promise(() => {}));
    renderComposer();
    await fillCreateForm(user);

    await pickVideo(user);

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salvar exercício/i })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Cancelar envio' }));

    expect(screen.getByRole('button', { name: /Salvar exercício/i })).toBeEnabled();
  });
});
