import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRoute } from '../../test/test-utils';
import MyProtocolDetail from './MyProtocolDetail';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

const FILE_URL = 'https://cdn.example.com/signed.mp4';
const YOUTUBE = 'https://www.youtube.com/watch?v=abc123XYZ';
const GIF_URL = 'https://media.example.com/rosca.gif';

// Mounts the page with one exercise merged over a base strength exercise.
const setup = (exercise) => {
  api.get.mockImplementation((url) => {
    if (url === '/my/protocols/1') return Promise.resolve({ data: { id: 1, status: 'ACTIVE', startDate: '2024-01-01', expirationDate: '2024-03-31', trainer: { firstName: 'T', lastName: 'S' } } });
    if (url === '/my/protocols/1/trainings') return Promise.resolve({ data: [{ id: 10, name: 'Treino A', order: 1, weekDay: 'MONDAY' }] });
    if (url === '/my/trainings/10/exercises') return Promise.resolve({ data: [{ id: 1, name: 'Rosca', type: 'strength', sets: 3, repetitions: { min: 10, max: 10 }, order: 1, ...exercise }] });
    return Promise.reject(new Error(`Unexpected URL: ${url}`));
  });
  return renderWithRoute(<MyProtocolDetail />, { route: '/my/protocols/1', path: '/my/protocols/:id' });
};

describe('MyProtocolDetail — uploaded video', () => {
  beforeEach(() => { api.get.mockReset(); });

  it('opens the sheet with a native player for an uploaded video', async () => {
    const user = userEvent.setup();
    const { container } = setup({ videoFileUrl: FILE_URL });

    await user.click(await screen.findByRole('button', { name: /ver vídeo/i }));

    const video = screen.getByLabelText('Vídeo do exercício');
    expect(video.tagName).toBe('VIDEO');
    expect(video).toHaveAttribute('src', FILE_URL);
    expect(video).toHaveAttribute('controls');
    expect(video).toHaveAttribute('playsinline');
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('prefers the uploaded video over a YouTube link', async () => {
    const user = userEvent.setup();
    const { container } = setup({ videoFileUrl: FILE_URL, videoUrl: YOUTUBE });

    await user.click(await screen.findByRole('button', { name: /ver vídeo/i }));

    expect(screen.getByLabelText('Vídeo do exercício').tagName).toBe('VIDEO');
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('prefers the uploaded video over an external non-YouTube link', async () => {
    setup({ videoFileUrl: FILE_URL, videoUrl: 'https://vimeo.com/123' });

    expect(await screen.findByRole('button', { name: /ver vídeo/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /ver vídeo/i })).not.toBeInTheDocument();
  });

  it('hides the GIF control when an uploaded video exists', async () => {
    setup({ videoFileUrl: FILE_URL, gifUrl: GIF_URL });

    await screen.findByRole('button', { name: /ver vídeo/i });

    expect(screen.queryByRole('button', { name: /ver gif/i })).not.toBeInTheDocument();
  });

  it('closes the sheet and removes the player', async () => {
    const user = userEvent.setup();
    setup({ videoFileUrl: FILE_URL });

    await user.click(await screen.findByRole('button', { name: /ver vídeo/i }));
    await user.click(screen.getByRole('button', { name: /fechar vídeo/i }));

    expect(screen.queryByLabelText('Vídeo do exercício')).not.toBeInTheDocument();
  });
});
