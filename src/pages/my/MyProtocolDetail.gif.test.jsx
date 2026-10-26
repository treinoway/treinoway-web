import { screen, fireEvent } from '@testing-library/react';
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

describe('MyProtocolDetail — GIF precedence', () => {
  beforeEach(() => { api.get.mockReset(); });

  it('shows the GIF control and the external link when videoUrl is not YouTube', async () => {
    setup({ videoUrl: 'https://vimeo.com/123', gifUrl: GIF_URL });

    expect(await screen.findByRole('button', { name: /ver gif/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver vídeo/i })).toHaveAttribute('href', 'https://vimeo.com/123');
  });

  it('falls back to text when the GIF fails to load', async () => {
    const user = userEvent.setup();
    setup({ videoUrl: null, gifUrl: GIF_URL });

    await user.click(await screen.findByRole('button', { name: /ver gif/i }));
    fireEvent.error(screen.getByRole('img', { name: /gif do exercício/i }));

    expect(screen.getByText(/não foi possível carregar o gif/i)).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /gif do exercício/i })).not.toBeInTheDocument();
  });
});
