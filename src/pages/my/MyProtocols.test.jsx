import { screen, waitFor } from '@testing-library/react';
import { renderWithRouter } from '../../test/test-utils';
import MyProtocols from './MyProtocols';
import api from '../../api/axios';

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockProtocols = [
  {
    id: 1,
    status: 'ACTIVE',
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2024-03-31T00:00:00.000Z',
    trainer: { user: { name: 'Trainer Silva' } },
  },
  {
    id: 2,
    status: 'COMPLETED',
    startDate: '2023-06-01T00:00:00.000Z',
    endDate: '2023-08-31T00:00:00.000Z',
    trainer: { user: { name: 'Trainer Costa' } },
  },
];

describe('MyProtocols', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('shows loading state while data is being fetched', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<MyProtocols />);

    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('renders the page title', async () => {
    api.get.mockResolvedValue({ data: [] });

    renderWithRouter(<MyProtocols />);

    await waitFor(() => {
      expect(screen.getByText('Meus Protocolos')).toBeInTheDocument();
    });
  });

  it('shows empty state when user has no protocols', async () => {
    api.get.mockResolvedValue({ data: [] });

    renderWithRouter(<MyProtocols />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum protocolo atribuído ainda')).toBeInTheDocument();
    });
  });

  it('fetches protocols on mount from /my/protocols', async () => {
    api.get.mockResolvedValue({ data: mockProtocols });

    renderWithRouter(<MyProtocols />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/my/protocols');
    });
  });

  it('renders protocol cards for each protocol', async () => {
    api.get.mockResolvedValue({ data: mockProtocols });

    renderWithRouter(<MyProtocols />);

    await waitFor(() => {
      expect(screen.getByText('Trainer Silva')).toBeInTheDocument();
      expect(screen.getByText('Trainer Costa')).toBeInTheDocument();
    });
  });

  it('renders link to protocol detail for each protocol card', async () => {
    api.get.mockResolvedValue({ data: mockProtocols });

    renderWithRouter(<MyProtocols />);

    await waitFor(() => {
      const links = screen.getAllByRole('link');
      const detailLinks = links.filter((l) => l.getAttribute('href')?.includes('/my/protocols/'));
      expect(detailLinks).toHaveLength(2);
    });
  });

  it('shows status badge for each protocol', async () => {
    api.get.mockResolvedValue({ data: mockProtocols });

    renderWithRouter(<MyProtocols />);

    await waitFor(() => {
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    });
  });
});
