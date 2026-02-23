import { screen, waitFor } from '@testing-library/react';
import { renderWithRoute } from '../../test/test-utils';
import MyProtocolDetail from './MyProtocolDetail';
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

const mockProtocolData = {
  id: 1,
  status: 'ACTIVE',
  startDate: '2024-01-01',
  expirationDate: '2024-03-31',
  trainer: { firstName: 'Trainer', lastName: 'Silva' },
  trainings: [
    {
      id: 10,
      name: 'Treino A',
      description: 'Aquecimento e força',
      order: 1,
      schedules: [
        { id: 100, weekday: 'MONDAY', weekNumber: 1 },
      ],
    },
    {
      id: 11,
      name: 'Treino B',
      description: 'Cardio e resistência',
      order: 2,
      schedules: [],
    },
  ],
};

function renderMyProtocolDetail() {
  return renderWithRoute(<MyProtocolDetail />, {
    route: '/my/protocols/1',
    path: '/my/protocols/:id',
  });
}

describe('MyProtocolDetail', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('shows loading state while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    renderMyProtocolDetail();

    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('fetches protocol from /my/protocols/:id on mount', async () => {
    api.get.mockResolvedValue({ data: mockProtocolData });

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/my/protocols/1');
    });
  });

  it('renders protocol info after loading', async () => {
    api.get.mockResolvedValue({ data: mockProtocolData });

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Minha Rotina de Treino')).toBeInTheDocument();
      expect(screen.getByText('Trainer Silva')).toBeInTheDocument();
    });
  });

  it('renders expiration date without showing Invalid Date', async () => {
    api.get.mockResolvedValue({ data: mockProtocolData });

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('31/03/2024')).toBeInTheDocument();
      expect(screen.queryByText(/Invalid Date/i)).not.toBeInTheDocument();
    });
  });

  it('renders status badge for the protocol', async () => {
    api.get.mockResolvedValue({ data: mockProtocolData });

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    });
  });

  it('renders list of trainings', async () => {
    api.get.mockResolvedValue({ data: mockProtocolData });

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Treino A')).toBeInTheDocument();
      expect(screen.getByText('Treino B')).toBeInTheDocument();
    });
  });

  it('renders schedules for trainings that have them', async () => {
    api.get.mockResolvedValue({ data: mockProtocolData });

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText(/semana 1 - segunda-feira/i)).toBeInTheDocument();
    });
  });

  it('shows empty state for trainings when protocol has none', async () => {
    api.get.mockResolvedValue({
      data: { ...mockProtocolData, trainings: [] },
    });

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Nenhum treino ainda')).toBeInTheDocument();
    });
  });

  it('shows "not found" state when protocol cannot be loaded', async () => {
    api.get.mockRejectedValue(new Error('Not found'));

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('Rotina não encontrada')).toBeInTheDocument();
    });
  });

  it('renders a back button to return to protocols list', async () => {
    api.get.mockResolvedValue({ data: mockProtocolData });

    renderMyProtocolDetail();

    await waitFor(() => screen.getByText('Minha Rotina de Treino'));

    expect(screen.getByRole('button', { name: /voltar para minhas rotinas/i })).toBeInTheDocument();
  });

  it('shows total trainings count', async () => {
    api.get.mockResolvedValue({ data: mockProtocolData });

    renderMyProtocolDetail();

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });
});
