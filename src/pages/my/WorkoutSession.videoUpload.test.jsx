import { screen } from '@testing-library/react';
import { renderWithRoute } from '../../test/test-utils';
import WorkoutSession from './WorkoutSession';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const FILE_URL = 'https://cdn.example.com/signed.mp4';

// Mounts an active session with one pending exercise log carrying the given exercise fields.
const renderWith = (exercise) => {
  api.get.mockResolvedValue({
    data: {
      id: 'session-1',
      trainingId: 't-1',
      status: 'in_progress',
      startedAt: '2026-03-08T10:00:00Z',
      training: { id: 't-1', name: 'Peito' },
      exerciseLogs: [{
        id: 'log-1', exerciseId: 'ex-1', status: 'pending', order: 0, notes: null, setLogs: [],
        exercise: { id: 'ex-1', name: 'Supino Reto', type: 'strength', sets: 4, repetitions: { min: 8, max: 12 }, ...exercise },
      }],
    },
  });
  return renderWithRoute(<WorkoutSession />, { route: '/my/workout-sessions/session-1', path: '/my/workout-sessions/:sessionId' });
};

describe('WorkoutSession — uploaded video link', () => {
  beforeEach(() => { api.get.mockReset(); });

  it('links "Ver vídeo" to the uploaded video when only a file exists', async () => {
    renderWith({ videoFileUrl: FILE_URL });
    expect(await screen.findByRole('link', { name: /ver vídeo/i })).toHaveAttribute('href', FILE_URL);
  });

  it('prefers the uploaded video over a YouTube link', async () => {
    renderWith({ videoFileUrl: FILE_URL, videoUrl: 'https://www.youtube.com/watch?v=abc123XYZ' });
    expect(await screen.findByRole('link', { name: /ver vídeo/i })).toHaveAttribute('href', FILE_URL);
  });

  it('hides "Ver GIF" when an uploaded video exists', async () => {
    renderWith({ videoFileUrl: FILE_URL, gifUrl: 'https://media.example.com/supino.gif' });
    await screen.findByRole('link', { name: /ver vídeo/i });
    expect(screen.queryByRole('link', { name: /ver gif/i })).not.toBeInTheDocument();
  });
});
