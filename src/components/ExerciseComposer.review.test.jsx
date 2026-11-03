import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import ExerciseComposer from './ExerciseComposer';

vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { data: [], total: 0 } }), post: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));
vi.mock('../api/exerciseVideos', () => ({ uploadExerciseVideo: vi.fn() }));

const SNAPSHOT = {
  id: 'junc-1', type: 'strength', prescriptionMode: 'reps', sets: 3,
  repetitions: { min: 10, max: 12 }, restInterval: 60, hasLoad: true, suggestedLoad: 80,
  exerciseTemplate: { name: 'Supino reto', videoFileKey: 'exercise-videos/t/tpl.mp4', videoFileUrl: 'https://cdn.example.com/tpl.mp4' },
};

describe('ExerciseComposer — edit does not inherit the template video file', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows no uploaded video and sends videoFileKey: null when only the template has one', async () => {
    const user = userEvent.setup();
    const onSubmitEdit = vi.fn();
    render(
      <ExerciseComposer
        snapshot={SNAPSHOT} exerciseTemplates={[]} saving={false}
        onSubmitCreate={vi.fn()} onSubmitEdit={onSubmitEdit} onSubmitFromLibrary={vi.fn()} onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText('Prévia do vídeo enviado')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => expect(onSubmitEdit).toHaveBeenCalledWith('junc-1', expect.objectContaining({ videoFileKey: null })));
  });
});
