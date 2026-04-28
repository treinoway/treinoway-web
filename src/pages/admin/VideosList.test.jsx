import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import VideosList from './VideosList';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();

const mockVideos = [
  {
    id: 'video-1',
    title: 'Agachamento livre',
    url: 'https://video.example.com/squat',
    thumbnailUrl: 'https://img.example.com/squat.jpg',
    duration: 90,
    category: 'strength',
    categoryLabel: 'Força',
    bodySegment: 'lower',
    bodySegmentLabel: 'Inferior',
    tags: ['forca', 'iniciante'],
    createdById: 'admin-1',
    createdAt: '2025-04-01T12:00:00.000Z',
  },
  {
    id: 'video-2',
    title: 'Cardio HIIT',
    url: 'https://video.example.com/hiit',
    thumbnailUrl: null,
    duration: 60,
    category: 'cardio',
    categoryLabel: 'Cardio',
    bodySegment: null,
    bodySegmentLabel: null,
    tags: [],
    createdById: 'admin-1',
    createdAt: '2025-04-02T12:00:00.000Z',
  },
];

const buildResponse = (items = mockVideos, overrides = {}) => ({
  data: {
    items,
    total: items.length,
    page: 1,
    pageSize: 20,
    ...overrides,
  },
});

describe('VideosList', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    api.delete.mockReset();
    api.get.mockResolvedValue(buildResponse());
  });

  it('renders the page title', async () => {
    renderWithRouter(<VideosList />);

    expect(screen.getByText('Biblioteca de vídeos')).toBeInTheDocument();
  });

  it('fetches and displays videos on mount', async () => {
    renderWithRouter(<VideosList />);

    await waitFor(() => {
      expect(screen.getByText('Agachamento livre')).toBeInTheDocument();
      expect(screen.getByText('Cardio HIIT')).toBeInTheDocument();
    });

    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/admin/videos?'));
  });

  it('shows category and segment labels from the backend', async () => {
    renderWithRouter(<VideosList />);

    await waitFor(() => {
      expect(screen.getByText('Força')).toBeInTheDocument();
      expect(screen.getByText('Inferior')).toBeInTheDocument();
      expect(screen.getByText('Cardio')).toBeInTheDocument();
    });
  });

  it('renders thumbnail image when thumbnailUrl is present', async () => {
    renderWithRouter(<VideosList />);

    await waitFor(() => {
      expect(screen.getByAltText('Miniatura de Agachamento livre')).toBeInTheDocument();
    });
  });

  it('renders placeholder when thumbnailUrl is missing', async () => {
    renderWithRouter(<VideosList />);

    await waitFor(() => screen.getByText('Cardio HIIT'));

    expect(screen.getAllByLabelText('Sem miniatura').length).toBeGreaterThan(0);
  });

  it('renders tags as chips', async () => {
    renderWithRouter(<VideosList />);

    await waitFor(() => {
      expect(screen.getByText('forca')).toBeInTheDocument();
      expect(screen.getByText('iniciante')).toBeInTheDocument();
    });
  });

  it('shows loading state while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<VideosList />);

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('shows full empty state when there are no videos and no filters', async () => {
    api.get.mockResolvedValue(buildResponse([], { total: 0 }));

    renderWithRouter(<VideosList />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum vídeo cadastrado')).toBeInTheDocument();
    });
  });

  it('refetches with search query when search input is typed (after debounce)', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(buildResponse());

    renderWithRouter(<VideosList />);

    await waitFor(() => screen.getByText('Agachamento livre'));
    api.get.mockClear();

    await user.type(screen.getByLabelText(/buscar/i), 'agacha');

    await waitFor(
      () => {
        expect(api.get).toHaveBeenCalledWith(expect.stringContaining('search=agacha'));
      },
      { timeout: 2000 }
    );
  });

  it('opens confirm dialog and calls DELETE on confirmation', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});

    renderWithRouter(<VideosList />);

    await waitFor(() => screen.getByText('Agachamento livre'));

    await user.click(screen.getByRole('button', { name: /ações do vídeo agachamento livre/i }));
    await user.click(screen.getByText('Excluir'));

    await waitFor(() => screen.getByRole('button', { name: /confirmar/i }));
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/admin/videos/video-1');
      expect(mockShowToast).toHaveBeenCalledWith('Vídeo excluído com sucesso!', 'success');
    });
  });

  it('does not call DELETE when confirmation is cancelled', async () => {
    const user = userEvent.setup();

    renderWithRouter(<VideosList />);

    await waitFor(() => screen.getByText('Agachamento livre'));

    await user.click(screen.getByRole('button', { name: /ações do vídeo agachamento livre/i }));
    await user.click(screen.getByText('Excluir'));

    await waitFor(() => screen.getByRole('button', { name: /cancelar/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(api.delete).not.toHaveBeenCalled();
  });

  it('shows toast on API error', async () => {
    api.get.mockRejectedValue({ userMessage: 'Falha de rede' });

    renderWithRouter(<VideosList />);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Falha de rede', 'error');
    });
  });

  it('renders a Novo vídeo button that navigates to the new route', async () => {
    renderWithRouter(<VideosList />);

    expect(screen.getByRole('button', { name: /novo vídeo/i })).toBeInTheDocument();
  });
});
