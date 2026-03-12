import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import MyAnamneses from './MyAnamneses';
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

const mockLinks = [
  {
    id: 'link-1',
    anamnesisId: 'anamnesis-1',
    studentId: 'student-1',
    trainerId: 'trainer-1',
    createdAt: '2026-01-15T10:00:00.000Z',
    anamnesis: {
      id: 'anamnesis-1',
      title: 'Anamnese de Saúde',
      description: 'Questionário completo',
      isGeneral: false,
      sections: [
        {
          id: 'section-1',
          title: 'Histórico',
          order: 0,
          questions: [
            {
              id: 'q1',
              text: 'Você tem alguma doença?',
              type: 'dichotomous',
              required: true,
              order: 0,
              options: [],
            },
          ],
        },
      ],
    },
    trainer: {
      id: 'trainer-1',
      user: { firstName: 'João', lastName: 'Silva', avatarUrl: null },
    },
  },
  {
    id: 'link-2',
    anamnesisId: 'anamnesis-2',
    studentId: 'student-1',
    trainerId: 'trainer-1',
    createdAt: '2026-02-01T08:00:00.000Z',
    anamnesis: {
      id: 'anamnesis-2',
      title: 'Anamnese Geral da Plataforma',
      description: null,
      isGeneral: true,
      sections: [],
    },
    trainer: {
      id: 'trainer-1',
      user: { firstName: 'João', lastName: 'Silva', avatarUrl: null },
    },
  },
];

describe('MyAnamneses', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
  });

  it('shows loading state while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderWithRouter(<MyAnamneses />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('renders page title after loading', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Minhas Anamneses')).toBeInTheDocument();
    });
  });

  it('fetches from /my/anamneses on mount', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/my/anamneses');
    });
  });

  it('shows empty state when no anamneses', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Nenhuma anamnese ainda')).toBeInTheDocument();
    });
  });

  it('renders anamnesis card with title and trainer name', async () => {
    api.get.mockResolvedValue({ data: mockLinks });
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese de Saúde')).toBeInTheDocument();
    });
    expect(screen.getAllByText('João Silva').length).toBeGreaterThan(0);
  });

  it('shows "Geral" badge for general anamneses', async () => {
    api.get.mockResolvedValue({ data: mockLinks });
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Geral')).toBeInTheDocument();
    });
  });

  it('shows anamnesis description when present', async () => {
    api.get.mockResolvedValue({ data: mockLinks });
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Questionário completo')).toBeInTheDocument();
    });
  });

  it('shows formatted date for each link', async () => {
    api.get.mockResolvedValue({ data: mockLinks });
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      // 2026-01-15 should appear as localized date
      expect(screen.getByText(/15\/01\/2026/)).toBeInTheDocument();
    });
  });

  it('expands section accordion when "Ver perguntas" is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockLinks });
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese de Saúde')).toBeInTheDocument();
    });
    // First "Ver perguntas" button corresponds to the first anamnesis (with 1 section)
    const expandButtons = screen.getAllByRole('button', { name: /ver perguntas/i });
    await user.click(expandButtons[0]);
    expect(screen.getByText('Histórico')).toBeInTheDocument();
  });

  it('shows section accordion after expanding the anamnesis card', async () => {
    const user = userEvent.setup();
    // Use only the first link (with sections) to avoid multiple "Ver perguntas" buttons
    api.get.mockResolvedValue({ data: [mockLinks[0]] });
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese de Saúde')).toBeInTheDocument();
    });
    const expandButton = screen.getByRole('button', { name: /ver perguntas/i });
    await user.click(expandButton);
    expect(screen.getByRole('button', { name: /seção histórico/i })).toBeInTheDocument();
  });

  it('shows error toast when fetch fails', async () => {
    const error = { userMessage: 'Erro ao carregar anamneses' };
    api.get.mockRejectedValue(error);
    renderWithRouter(<MyAnamneses />);
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao carregar anamneses', 'error');
    });
  });
});
