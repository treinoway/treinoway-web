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

const GIF_URL = 'https://media.example.com/supino.gif';

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

describe('WorkoutSession — GIF link', () => {
  beforeEach(() => { api.get.mockReset(); });

  it('shows "Ver GIF" when there is no video', async () => {
    renderWith({ gifUrl: GIF_URL });
    expect(await screen.findByRole('link', { name: /ver gif/i })).toHaveAttribute('href', GIF_URL);
  });

  it('shows "Ver GIF" next to a non-YouTube video link', async () => {
    renderWith({ videoUrl: 'https://vimeo.com/1', gifUrl: GIF_URL });
    expect(await screen.findByRole('link', { name: /ver gif/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver vídeo/i })).toBeInTheDocument();
  });

  it('hides "Ver GIF" when the video is a YouTube link', async () => {
    renderWith({ videoUrl: 'https://www.youtube.com/watch?v=abc123XYZ', gifUrl: GIF_URL });
    expect(await screen.findByRole('link', { name: /ver vídeo/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /ver gif/i })).not.toBeInTheDocument();
  });
});
