import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoLibraryPicker from './VideoLibraryPicker';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

vi.mock('../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();
const mockOnClose = vi.fn();
const mockOnSelect = vi.fn();

const buildVideos = () => ([
  {
    id: 'video-1',
    title: 'Agachamento livre',
    description: '',
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
    description: '',
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
]);

const buildResponse = (items = buildVideos(), overrides = {}) => ({
  data: {
    items,
    total: items.length,
    page: 1,
    pageSize: 10,
    ...overrides,
  },
});

const renderPicker = (props = {}) =>
  render(
    <VideoLibraryPicker
      isOpen
      onClose={mockOnClose}
      onSelect={mockOnSelect}
      {...props}
    />
  );

describe('VideoLibraryPicker', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    mockOnClose.mockReset();
    mockOnSelect.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    api.get.mockResolvedValue(buildResponse());
  });

  it('does not render when isOpen is false', () => {
    render(
      <VideoLibraryPicker
        isOpen={false}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.queryByText('Biblioteca de vídeos')).not.toBeInTheDocument();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('fetches and renders videos when opened', async () => {
    renderPicker();

    await waitFor(() => {
      expect(screen.getByText('Agachamento livre')).toBeInTheDocument();
      expect(screen.getByText('Cardio HIIT')).toBeInTheDocument();
    });

    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('/videos?'));
  });

  it('shows category and segment labels', async () => {
    renderPicker();

    await waitFor(() => screen.getByText('Agachamento livre'));

    expect(screen.getByText('Força')).toBeInTheDocument();
    expect(screen.getByText('· Inferior')).toBeInTheDocument();
  });

  it('renders tags as chips when present', async () => {
    renderPicker();

    await waitFor(() => {
      expect(screen.getByText('forca')).toBeInTheDocument();
      expect(screen.getByText('iniciante')).toBeInTheDocument();
    });
  });

  it('calls onSelect with the video and onClose when a row is clicked', async () => {
    const user = userEvent.setup();
    renderPicker();

    await waitFor(() => screen.getByText('Agachamento livre'));

    await user.click(screen.getByRole('button', { name: /selecionar vídeo agachamento livre/i }));

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'video-1', url: 'https://video.example.com/squat' })
    );
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('refetches with search query when typing (after debounce)', async () => {
    const user = userEvent.setup();
    renderPicker();

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

  it('uses initialSearch and initialCategory in the first fetch', async () => {
    renderPicker({ initialSearch: 'remada', initialCategory: 'strength' });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('search=remada'));
    });
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('category=strength'));
  });

  it('closes when clicking the overlay', async () => {
    const user = userEvent.setup();
    const { container } = renderPicker();

    await waitFor(() => screen.getByText('Agachamento livre'));

    await user.click(container.querySelector('.overlay'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('closes when clicking the X button', async () => {
    const user = userEvent.setup();
    renderPicker();

    await waitFor(() => screen.getByText('Agachamento livre'));

    await user.click(screen.getByRole('button', { name: /fechar/i }));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows empty state when no videos are returned', async () => {
    api.get.mockResolvedValue(buildResponse([], { total: 0 }));

    renderPicker();

    await waitFor(() => {
      expect(screen.getByText(/nenhum vídeo encontrado/i)).toBeInTheDocument();
    });
  });

  it('shows pagination controls when there are multiple pages', async () => {
    api.get.mockResolvedValue(buildResponse(buildVideos(), { total: 25 }));

    renderPicker();

    await waitFor(() => screen.getByText('Agachamento livre'));

    expect(screen.getByRole('button', { name: /anterior/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /próxima/i })).toBeInTheDocument();
    expect(screen.getByText(/página 1 de 3/i)).toBeInTheDocument();
  });

  it('navigates to the next page when clicking Próxima', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(buildResponse(buildVideos(), { total: 25 }));

    renderPicker();

    await waitFor(() => screen.getByText('Agachamento livre'));
    api.get.mockClear();
    api.get.mockResolvedValue(buildResponse(buildVideos(), { total: 25, page: 2 }));

    await user.click(screen.getByRole('button', { name: /próxima/i }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('page=2'));
    });
  });

  it('disables Anterior on the first page', async () => {
    api.get.mockResolvedValue(buildResponse(buildVideos(), { total: 25 }));

    renderPicker();

    await waitFor(() => screen.getByText('Agachamento livre'));

    expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled();
  });

  it('shows error toast when the fetch fails', async () => {
    api.get.mockRejectedValue({ userMessage: 'Falha de rede' });

    renderPicker();

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Falha de rede', 'error');
    });
  });
});
