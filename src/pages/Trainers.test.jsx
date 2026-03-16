import { screen, waitFor } from '@testing-library/react';
import { renderWithRouter } from '../test/test-utils';
import Trainers from './Trainers';
import api from '../api/axios';

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockTrainers = [
  {
    id: 'trainer-1',
    firstName: 'Jane',
    lastName: 'Doe',
    avatarUrl: null,
    serviceMode: 'online',
    address: { city: 'São Paulo', state: 'SP', country: 'Brazil' },
    socialNetworks: { instagram: '@janedoe', whatsapp: '+5511999999999' },
  },
  {
    id: 'trainer-2',
    firstName: 'Carlos',
    lastName: 'Silva',
    avatarUrl: 'https://cdn.example.com/carlos.jpg',
    serviceMode: 'in_person',
    address: { city: 'Rio de Janeiro', state: 'RJ', country: 'Brazil' },
    socialNetworks: null,
  },
];

describe('Trainers', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('shows loading state while data is being fetched', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<Trainers />);

    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('renders the page title', async () => {
    api.get.mockResolvedValue({ data: [] });

    renderWithRouter(<Trainers />);

    await waitFor(() => {
      expect(screen.getByText('Treinadores')).toBeInTheDocument();
    });
  });

  it('shows empty state when no trainers exist', async () => {
    api.get.mockResolvedValue({ data: [] });

    renderWithRouter(<Trainers />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum treinador disponível')).toBeInTheDocument();
    });
  });

  it('fetches trainers on mount from /trainers', async () => {
    api.get.mockResolvedValue({ data: mockTrainers });

    renderWithRouter(<Trainers />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/trainers');
    });
  });

  it('renders a card for each trainer', async () => {
    api.get.mockResolvedValue({ data: mockTrainers });

    renderWithRouter(<Trainers />);

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
    });
  });

  it('renders the service mode badge with correct Portuguese label', async () => {
    api.get.mockResolvedValue({ data: mockTrainers });

    renderWithRouter(<Trainers />);

    await waitFor(() => {
      expect(screen.getByText('Online')).toBeInTheDocument();
      expect(screen.getByText('Presencial')).toBeInTheDocument();
    });
  });

  it('renders trainer location from address fields', async () => {
    api.get.mockResolvedValue({ data: mockTrainers });

    renderWithRouter(<Trainers />);

    await waitFor(() => {
      expect(screen.getByText('São Paulo, SP, Brazil')).toBeInTheDocument();
    });
  });

  it('renders social network information when available', async () => {
    api.get.mockResolvedValue({ data: mockTrainers });

    renderWithRouter(<Trainers />);

    await waitFor(() => {
      expect(screen.getByText('@janedoe')).toBeInTheDocument();
      expect(screen.getByText('+5511999999999')).toBeInTheDocument();
    });
  });

  it('renders avatar image when avatarUrl is provided', async () => {
    api.get.mockResolvedValue({ data: mockTrainers });

    renderWithRouter(<Trainers />);

    await waitFor(() => {
      const avatarImg = screen.getByAltText('Carlos Silva');
      expect(avatarImg).toBeInTheDocument();
      expect(avatarImg).toHaveAttribute('src', 'https://cdn.example.com/carlos.jpg');
    });
  });

  it('renders initials placeholder when avatarUrl is null', async () => {
    api.get.mockResolvedValue({ data: mockTrainers });

    renderWithRouter(<Trainers />);

    await waitFor(() => {
      // Jane Doe has no avatarUrl — initials JD should appear
      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });

  it('does not show service mode badge when serviceMode is null', async () => {
    const trainerWithoutMode = [
      { ...mockTrainers[0], serviceMode: null },
    ];
    api.get.mockResolvedValue({ data: trainerWithoutMode });

    renderWithRouter(<Trainers />);

    await waitFor(() => {
      expect(screen.queryByText('Online')).not.toBeInTheDocument();
      expect(screen.queryByText('Presencial')).not.toBeInTheDocument();
      expect(screen.queryByText('Híbrido')).not.toBeInTheDocument();
    });
  });

  it('does not show location when address is null', async () => {
    const trainerWithoutAddress = [
      { ...mockTrainers[0], address: null },
    ];
    api.get.mockResolvedValue({ data: trainerWithoutAddress });

    renderWithRouter(<Trainers />);

    await waitFor(() => {
      expect(screen.queryByText(/São Paulo/)).not.toBeInTheDocument();
    });
  });
});
