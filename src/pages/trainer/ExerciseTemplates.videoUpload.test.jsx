import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExerciseTemplates from './ExerciseTemplates';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ isAdmin: false }) }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const FILE_URL = 'https://cdn.example.com/signed.mp4';

// Mounts the library with the given templates.
const setup = (templates) => {
  vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
  api.get.mockResolvedValue({ data: { data: templates, total: templates.length, page: 1, limit: 20 } });
  render(<MemoryRouter><ExerciseTemplates /></MemoryRouter>);
};

describe('ExerciseTemplates — uploaded video badge', () => {
  beforeEach(() => { api.get.mockReset(); });

  it('shows the Vídeo badge for a template with only an uploaded video', async () => {
    setup([{ id: 1, name: 'Remada', type: 'strength', isPublic: false, videoUrl: null, videoFileUrl: FILE_URL }]);

    await waitFor(() => screen.getByText('Remada'));

    expect(screen.getByText('Vídeo')).toBeInTheDocument();
  });

  it('hides the GIF badge when an uploaded video exists (file > gif)', async () => {
    setup([{ id: 2, name: 'Remada', type: 'strength', isPublic: false, videoUrl: null, videoFileUrl: FILE_URL, gifUrl: 'https://media.example.com/remada.gif' }]);

    await waitFor(() => screen.getByText('Remada'));

    expect(screen.getByText('Vídeo')).toBeInTheDocument();
    expect(screen.queryByText('GIF')).not.toBeInTheDocument();
  });

  it('shows no Vídeo badge without a video file', async () => {
    setup([{ id: 3, name: 'Remada', type: 'strength', isPublic: false, videoUrl: null, videoFileUrl: null }]);

    await waitFor(() => screen.getByText('Remada'));

    expect(screen.queryByText('Vídeo')).not.toBeInTheDocument();
  });
});
